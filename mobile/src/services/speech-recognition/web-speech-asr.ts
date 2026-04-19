import type { AsrEvent, AsrStartOptions, SpeechRecognitionService } from './types';

/**
 * Адаптер над браузерным Web Speech API.
 * Поддерживается Chrome/Edge (Chromium-based), Safari 14.1+.
 * НЕ поддерживается Firefox (по умолчанию отключено за флагом).
 *
 * Минимальный тип под Web Speech API без зависимости от DOM-либы
 */
interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: unknown;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onspeechstart: ((event: Event) => void) | null;
  onspeechend: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface BrowserSpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
  resultIndex: number;
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function resolveCtor(): SpeechRecognitionCtor | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  const g = globalThis as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition;
}

export class WebSpeechAsr implements SpeechRecognitionService {
  private readonly listeners = new Set<(event: AsrEvent) => void>();
  private recognition: BrowserSpeechRecognition | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

  static isSupported(): boolean {
    return Boolean(resolveCtor());
  }

  async isAvailable(): Promise<boolean> {
    return WebSpeechAsr.isSupported();
  }

  async start(opts: AsrStartOptions): Promise<void> {
    const Ctor = resolveCtor();
    if (!Ctor) {
      this.emit({ type: 'error', message: 'Web Speech API недоступен в этом браузере' });
      return;
    }

    // Если уже идёт сессия — остановим старую до новой
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    const rec = new Ctor();
    rec.lang = opts.lang === 'ru' ? 'ru-RU' : opts.lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      this.emit({ type: 'vad', isSpeech: false });
    };

    rec.onspeechstart = () => {
      this.emit({ type: 'vad', isSpeech: true });
    };

    rec.onspeechend = () => {
      this.emit({ type: 'vad', isSpeech: false });
    };

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const alternativesList = event.results[i];
        if (!alternativesList || alternativesList.length === 0) continue;
        const best = alternativesList[0];
        if (!best) continue;
        const transcript = best.transcript.trim();
        if (!transcript) continue;
        if (alternativesList.isFinal) {
          this.emit({ type: 'final', transcript, confidence: best.confidence });
        } else {
          this.emit({ type: 'partial', transcript });
        }
      }
    };

    rec.onerror = (event) => {
      // «no-speech», «aborted» — пользовательские случаи, не ошибки уровня приложения
      if (event.error === 'aborted') return;
      this.emit({ type: 'error', message: event.message ?? event.error });
    };

    rec.onend = () => {
      this.clearMaxDurationTimer();
      this.recognition = null;
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch (err) {
      this.emit({
        type: 'error',
        message: err instanceof Error ? err.message : 'Не удалось запустить микрофон',
      });
      this.recognition = null;
      return;
    }

    if (opts.maxDurationMs && opts.maxDurationMs > 0) {
      this.maxDurationTimer = setTimeout(() => {
        void this.stop();
      }, opts.maxDurationMs);
    }
  }

  async stop(): Promise<void> {
    this.clearMaxDurationTimer();
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {
      // safari иногда кидает, если stop до получения результата — игнорируем
    }
  }

  subscribe(listener: (event: AsrEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: AsrEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // защищаем других слушателей от падения одного
      }
    }
  }

  private clearMaxDurationTimer(): void {
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }
}

// Экспортируется только для тестов
export const __testing = { resolveCtor };
