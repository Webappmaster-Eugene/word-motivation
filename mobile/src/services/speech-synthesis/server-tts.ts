import { Audio } from 'expo-av';

import type { ApiClient } from '@/services/api-client/api-client';
import { ApiError } from '@/services/api-client/errors';
import type { DeviceAuthService } from '@/services/auth/device-auth-service';

import type { SpeechSynthesisService, TtsEvent, TtsSpeakOptions } from './types';

type SileroVoice = 'xenia' | 'kseniya' | 'baya' | 'aidar' | 'eugene';

interface SynthesizeResponse {
  readonly url: string;
  readonly hash: string;
  readonly voice: SileroVoice;
  readonly rate: number;
  readonly cached: boolean;
  readonly sizeBytes: number;
}

export interface ServerTtsOptions {
  /**
   * Базовый URL API — без trailing-slash. Используется для конструирования
   * полного URL аудиофайла: `${baseUrl}${response.url}`.
   */
  readonly apiBaseUrl: string;
  /** Голос по умолчанию. На сервере тоже есть дефолт — клиентский приоритетнее. */
  readonly defaultVoice?: SileroVoice;
  /**
   * Фолбэк-сервис. При любой ошибке (сеть, 503, не проигрывается) — делегируем
   * его `speak`. Без fallback'а отключение сервера = молчащая игра, что резко
   * хуже «играем со старым expo-speech».
   */
  readonly fallback: SpeechSynthesisService;
  /**
   * Порог rate, ниже которого разумнее сразу идти в fallback: Silero на больших
   * замедлениях даёт артефакты. На практике rate <= 0.6 лучше отдавать
   * expo-speech (там нет time-stretch).
   */
  readonly minSileroRate?: number;
}

/**
 * TTS через backend: POST /tts/synthesize возвращает URL готового WAV,
 * клиент скачивает и проигрывает через expo-av.
 *
 * Fallback-стратегия многоуровневая:
 *  1. Если сервер вернул 503/сеть упала → сразу fallback.speak().
 *  2. Если аудио загрузилось, но `playAsync` бросил (web autoplay-policy, звук
 *     отключён в системе) → тоже fallback.
 *  3. Особый кейс для web: первый пользовательский жест нужен для разблокировки
 *     audio — до первого тапа `playAsync` вернёт ошибку; тогда тоже fallback.
 *
 * Concurrent-safety: speak() отменяет предыдущий проигрыш. Каждый новый вызов
 * unload'ит старый Sound и создаёт новый, чтобы не было наложения голосов.
 */
export class ServerTts implements SpeechSynthesisService {
  private readonly listeners = new Set<(event: TtsEvent) => void>();
  private currentSound: Audio.Sound | null = null;
  private currentToken = 0;
  private audioModeInitialized = false;
  /**
   * Подписка на fallback создаётся ОДНА на всю жизнь сервиса. Раньше тут была
   * подписка-в-subscribe(), что приводило к N×N-доставке событий при нескольких
   * подписчиках: каждая внешняя подписка создавала свой реле-слой, и fallback
   * при emit уведомлял всех listeners через все реле-слои. Теперь — один реле
   * на весь жизненный цикл.
   */
  private readonly fallbackUnsubscribe: () => void;

  constructor(
    private readonly api: ApiClient,
    private readonly auth: DeviceAuthService,
    private readonly options: ServerTtsOptions,
  ) {
    this.fallbackUnsubscribe = this.options.fallback.subscribe((event) => {
      for (const l of this.listeners) l(event);
    });
  }

  /**
   * Explicit destructor для тестов и hot-reload'а: отписываемся от fallback'а
   * чтобы не копить подписки между пересозданиями ServiceBundle.
   */
  dispose(): void {
    this.fallbackUnsubscribe();
    this.listeners.clear();
    void this.unloadCurrent();
  }

  async speak(text: string, opts: TtsSpeakOptions = {}): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    const minRate = this.options.minSileroRate ?? 0.7;
    if (opts.rate !== undefined && opts.rate < minRate) {
      // Серверный Silero плохо звучит на сильном замедлении → сразу fallback.
      return this.options.fallback.speak(text, opts);
    }

    // Отменяем текущее проигрывание: ребёнок тапнул на новое слово до конца
    // предыдущего — не хотим наложения.
    this.currentToken += 1;
    const token = this.currentToken;
    await this.unloadCurrent();

    let synthesized: SynthesizeResponse;
    try {
      synthesized = await this.synthesize(trimmed, opts);
    } catch (err) {
      return this.handleFailure(text, opts, 'синтез не удался', err);
    }

    // Пока мы ждали синтез — пользователь мог нажать другое. Проверяем токен.
    if (token !== this.currentToken) return;

    const audioUri = `${this.options.apiBaseUrl}${synthesized.url}`;
    let sound: Audio.Sound | null = null;

    try {
      await this.ensureAudioMode();
      const loaded = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, volume: 1.0 },
      );
      sound = loaded.sound;
    } catch (err) {
      return this.handleFailure(text, opts, 'загрузка аудио не удалась', err);
    }

    // Повторная проверка — пока грузили, мог прилететь новый speak().
    if (token !== this.currentToken) {
      void sound.unloadAsync().catch(() => undefined);
      return;
    }

    this.currentSound = sound;
    this.emit({ type: 'start' });

    try {
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        // Safety-net timeout: если didJustFinish никогда не придёт (баг expo-av
        // на web, сеть пропала в середине воспроизведения, и т.п.) — не висим
        // навечно. Оценка длительности: 400 байт/фраза → WAV 24 КБ/сек → при
        // нормальной фразе ≤ 10 сек; 30 сек с большим запасом.
        const maxPlaybackMs = 30_000;
        const watchdog = setTimeout(() => {
          this.emit({
            type: 'error',
            message: 'Озвучка не завершилась за отведённое время',
          });
          done();
        }, maxPlaybackMs);

        sound!.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            clearTimeout(watchdog);
            done();
            return;
          }
          if (status.didJustFinish) {
            clearTimeout(watchdog);
            done();
          }
        });
        void sound!.playAsync().catch((err: unknown) => {
          clearTimeout(watchdog);
          this.emit({ type: 'error', message: this.messageOf(err) });
          done();
        });
      });
    } finally {
      // Чистим только если этот speak всё ещё актуален.
      if (token === this.currentToken) {
        this.currentSound = null;
      }
      void sound.unloadAsync().catch(() => undefined);
      this.emit({ type: 'end' });
    }
  }

  async cancel(): Promise<void> {
    this.currentToken += 1;
    await this.unloadCurrent();
    // fallback.cancel() тоже вызываем — если fallback озвучивает (например, по
    // причине предыдущего сбоя) — надо его прервать.
    await this.options.fallback.cancel();
  }

  subscribe(listener: (event: TtsEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Всегда `true`: даже если сервер недоступен, fallback на `ExpoSpeechTts`
   * сможет озвучить. UI использует это для того, чтобы решать, показывать ли
   * кнопки-альтернативы озвучке (read-aloud и т.п.). «Озвучка всегда есть»
   * — инвариант комплексного сервиса с фолбэком.
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  private async synthesize(text: string, opts: TtsSpeakOptions): Promise<SynthesizeResponse> {
    const session = await this.auth.ensure();
    // opts.voice задаётся из SPEECH_PRESETS (kseniya для букв, baya для слов/реплик).
    // Если не задан — используем клиентский дефолт, который берётся из конфига сервера.
    const voice = (opts.voice as SileroVoice | undefined) ?? this.options.defaultVoice;
    return this.api.request<SynthesizeResponse>({
      method: 'POST',
      path: '/tts/synthesize',
      token: session.token,
      body: {
        text,
        voice,
        ...(opts.rate !== undefined ? { rate: opts.rate } : {}),
      },
      timeoutMs: 20_000,
    });
  }

  private async handleFailure(
    text: string,
    opts: TtsSpeakOptions,
    stage: string,
    err: unknown,
  ): Promise<void> {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`ServerTts: ${stage}, падаем на fallback.`, err);
    }
    // Особый кейс: 429 / 503 — не шумим в логах, это ожидаемые ситуации
    // (rate-limit или отключённый TTS на слабом VPS).
    if (err instanceof ApiError && (err.status === 429 || err.status === 503)) {
      // молчаливо
    }
    try {
      await this.options.fallback.speak(text, opts);
    } catch (fallbackErr) {
      this.emit({ type: 'error', message: this.messageOf(fallbackErr) });
    }
  }

  private async ensureAudioMode(): Promise<void> {
    if (this.audioModeInitialized) return;
    this.audioModeInitialized = true;
    try {
      // На iOS без `playsInSilentModeIOS: true` звук не воспроизводится, если
      // телефон на беззвучном режиме (что типично для детей, которые играют в
      // беззвучном, чтобы не мешать родителям). Для нас критично — включаем.
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('ServerTts: setAudioModeAsync не сработал', err);
      }
    }
  }

  private async unloadCurrent(): Promise<void> {
    const sound = this.currentSound;
    this.currentSound = null;
    if (!sound) return;
    try {
      await sound.stopAsync();
    } catch {
      /* уже остановлен / не загружен */
    }
    try {
      await sound.unloadAsync();
    } catch {
      /* уже выгружен */
    }
  }

  private emit(event: TtsEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
