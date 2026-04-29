import * as Speech from 'expo-speech';

import type { SpeechSynthesisService, TtsEvent, TtsSpeakOptions } from './types';

/**
 * Ранжирование доступных ru-RU голосов.
 *
 * На web `Speech.getAvailableVoicesAsync` возвращает системные голоса браузера.
 * У всех ОС своё качество: MS David, Google русский, Yandex — разное. Голос по
 * умолчанию у Chrome на Windows часто — «Microsoft Irina Desktop», который звучит
 * роботизированно. У iOS/macOS обычно есть «enhanced» или «premium» варианты.
 *
 * Идея: отсортировать доступные голоса так, чтобы первым шёл самый качественный,
 * и запомнить выбор на всю сессию (чтобы не пересчитывать каждый speak()).
 *
 * Скоринг — простой regex-набор по `name`/`identifier`. Чем выше оценка, тем
 * приоритетнее. Совпадения кумулятивны (женский + premium > только женский).
 */
const VOICE_PREFERENCES: readonly { readonly pattern: RegExp; readonly bonus: number }[] = [
  { pattern: /premium|enhanced/i, bonus: 40 },
  { pattern: /neural|natural/i, bonus: 30 },
  { pattern: /google/i, bonus: 35 },
  { pattern: /yandex|alice|alena/i, bonus: 22 },
  // Женский голос звучит мягче и роднее ребёнку.
  { pattern: /female|women|ирина|milena|ksyusha|kseniya|alena|elena|tatyana|анна/i, bonus: 15 },
  // Microsoft Desktop — роботизированный звук, характерный для Windows-браузеров.
  // Штраф достаточно высок, чтобы любой Google/enhanced голос его вытеснил.
  { pattern: /microsoft/i, bonus: -30 },
  // Явно устаревшие движки.
  { pattern: /desktop|espeak|dmitri/i, bonus: -25 },
];

function scoreVoice(voice: Speech.Voice): number {
  if (!voice.language?.toLowerCase().startsWith('ru')) return -999;
  const signature = `${voice.name ?? ''} ${voice.identifier ?? ''}`;
  let score = 0;
  for (const { pattern, bonus } of VOICE_PREFERENCES) {
    if (pattern.test(signature)) score += bonus;
  }
  // `quality` у expo-speech: 'Default' | 'Enhanced'. Если пришло 'Enhanced' — плюс.
  if ((voice as { quality?: string }).quality === 'Enhanced') score += 20;
  return score;
}

export interface ExpoSpeechTtsOptions {
  /** Скорость по умолчанию (0.1–2). Для детей лучше 0.88–0.95. */
  readonly defaultRate?: number;
  /** Высота тона по умолчанию (0–2). Небольшой плюс делает голос теплее. */
  readonly defaultPitch?: number;
}

export class ExpoSpeechTts implements SpeechSynthesisService {
  private readonly listeners = new Set<(event: TtsEvent) => void>();
  private preferredVoiceId: string | null = null;
  private voicePromise: Promise<void> | null = null;
  private readonly defaultRate: number;
  private readonly defaultPitch: number;

  constructor(options: ExpoSpeechTtsOptions = {}) {
    this.defaultRate = options.defaultRate ?? 0.92;
    this.defaultPitch = options.defaultPitch ?? 1.05;
  }

  async speak(text: string, opts: TtsSpeakOptions = {}): Promise<void> {
    // Лениво подтягиваем список голосов и выбираем лучший. Запрос один раз на сессию.
    await this.ensureVoicePicked();

    this.emit({ type: 'start' });
    await new Promise<void>((resolve) => {
      Speech.speak(text, {
        language: opts.lang ?? 'ru-RU',
        rate: opts.rate ?? this.defaultRate,
        pitch: opts.pitch ?? this.defaultPitch,
        // opts.voice содержит Silero-идентификатор (kseniya, baya и т.д.), который
        // не является валидным идентификатором системного голоса expo-speech.
        // Всегда используем preferredVoiceId — лучший голос, найденный скорингом.
        voice: this.preferredVoiceId ?? undefined,
        onDone: () => {
          this.emit({ type: 'end' });
          resolve();
        },
        onStopped: () => {
          this.emit({ type: 'end' });
          resolve();
        },
        onError: (err) => {
          this.emit({ type: 'error', message: String(err) });
          resolve();
        },
      });
    });
  }

  async cancel(): Promise<void> {
    await Speech.stop();
  }

  subscribe(listener: (event: TtsEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private async ensureVoicePicked(): Promise<void> {
    if (this.preferredVoiceId !== null) return;
    if (this.voicePromise) return this.voicePromise;
    this.voicePromise = this.pickBestVoice().catch(() => {
      // Любая ошибка — откатываемся на дефолт платформы. Не кидаем наружу:
      // TTS должен работать даже если список голосов недоступен.
    });
    try {
      await this.voicePromise;
    } finally {
      this.voicePromise = null;
    }
  }

  private async pickBestVoice(): Promise<void> {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) {
      this.preferredVoiceId = '';
      return;
    }
    let best: Speech.Voice | null = null;
    let bestScore = -Infinity;
    for (const v of voices) {
      const score = scoreVoice(v);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    // Если ни один ru-RU голос не нашёлся, оставляем пустую строку — ExpoSpeech
    // сам подберёт системный дефолт.
    this.preferredVoiceId = bestScore > -999 && best ? best.identifier : '';
  }

  private emit(event: TtsEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
