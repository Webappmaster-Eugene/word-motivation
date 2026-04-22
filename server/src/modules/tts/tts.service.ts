import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/env.schema';

import type { CachedEntry } from './cache/tts-cache.service';
import { TtsCacheService } from './cache/tts-cache.service';
import { SYNTHESIZER } from './synthesizer/synthesizer.token';
import { SynthesisError, type SileroVoice, type Synthesizer } from './synthesizer/types';

export interface SynthesizeInput {
  readonly text: string;
  readonly voice?: SileroVoice;
  readonly rate?: number;
}

export interface SynthesizeOutput {
  readonly url: string;
  readonly hash: string;
  readonly voice: SileroVoice;
  readonly rate: number;
  readonly cached: boolean;
  readonly sizeBytes: number;
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly defaultVoice: SileroVoice;
  private readonly enabled: boolean;

  constructor(
    @Inject(SYNTHESIZER) private readonly synthesizer: Synthesizer,
    private readonly cache: TtsCacheService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.defaultVoice = this.config.get('TTS_DEFAULT_VOICE', { infer: true });
    this.enabled = this.config.get('TTS_ENABLED', { infer: true });
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
    if (!this.enabled) {
      // 503 — клиент корректно интерпретирует как «офлайн-фолбэк на expo-speech».
      throw new ServiceUnavailableException('TTS отключён конфигурацией');
    }

    const voice = input.voice ?? this.defaultVoice;
    const rate = this.normalizeRate(input.rate);
    const text = input.text.trim();
    const hash = this.cache.hashKey({ text, voice, rate });

    // 1. Быстрый cache-hit.
    const hit = await this.cache.lookup(hash);
    if (hit) {
      return {
        url: hit.publicPath,
        hash: hit.hash,
        voice,
        rate,
        cached: true,
        sizeBytes: hit.sizeBytes,
      };
    }

    // 2. Miss: вызываем синтезатор, но дедуплицируем параллельные запросы —
    // две вкладки одновременно жмут на одну и ту же фразу → один вызов
    // синтеза + обе получают одинаковую entry.
    const entry = await this.cache.dedupe(hash, async () => {
      // Повторный lookup внутри дедупликации на случай, если predecessor уже
      // завершился между нашей первой проверкой и попаданием сюда.
      const again = await this.cache.lookup(hash);
      if (again) return again;

      try {
        const result = await this.synthesizer.synthesize({ text, voice, rate });
        return this.cache.store(hash, result.audio);
      } catch (err) {
        if (err instanceof SynthesisError) {
          this.logger.warn(`Синтез упал: ${err.message}`);
        } else {
          this.logger.error(`Неожиданная ошибка синтеза: ${this.messageOf(err)}`);
        }
        // Преобразуем в 503 — клиент перейдёт на устаревший TTS.
        throw new ServiceUnavailableException('Сервис озвучивания временно недоступен');
      }
    });

    return {
      url: entry.publicPath,
      hash: entry.hash,
      voice,
      rate,
      cached: false,
      sizeBytes: entry.sizeBytes,
    };
  }

  /**
   * Квантуем rate до шага 0.05 — меньшая детализация избыточна для TTS и
   * резко снижает cache-hit ratio (две близкие скорости = два разных файла).
   */
  private normalizeRate(rate: number | undefined): number {
    if (rate === undefined) return 1;
    const clamped = Math.min(1.5, Math.max(0.5, rate));
    return Math.round(clamped * 20) / 20;
  }

  private messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
