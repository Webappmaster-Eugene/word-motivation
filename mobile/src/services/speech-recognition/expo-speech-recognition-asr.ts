import { AppState } from 'react-native';
import type { AppStateStatus, NativeEventSubscription } from 'react-native';

import type { AsrEvent, AsrStartOptions, SpeechRecognitionService } from './types';

type Subscription = { remove: () => void };

type ExpoSpeechRecognitionApi = typeof import('expo-speech-recognition');
type ExpoSpeechRecognitionModuleType = ExpoSpeechRecognitionApi['ExpoSpeechRecognitionModule'];
type NativeEventMap = import('expo-speech-recognition').ExpoSpeechRecognitionNativeEventMap;
type NativeEvents = {
  [K in keyof NativeEventMap]: (event: NativeEventMap[K]) => void;
};
type ErrorCode = import('expo-speech-recognition').ExpoSpeechRecognitionErrorCode;

const SETTLE_AFTER_ABORT_MS = 50;

/**
 * Native реализация через `expo-speech-recognition` (iOS + Android).
 * Работает через системный распознаватель речи — на Android это Google Speech
 * Recognizer (либо on-device `com.google.android.as`, либо `googlequicksearchbox`),
 * на нестандартных ROM может оказаться `com.miui.voiceassist` / Samsung Bixby.
 *
 * Защитные слои (закрывают наблюдавшийся native crash в Hermes/expo-modules-core
 * на устройствах HyperOS/MIUI):
 *  - Модуль резолвится один раз в конструкторе через try/require. Все вызовы
 *    идут через кэшированную ссылку; null-check на каждом шаге.
 *  - Re-entrancy guard `starting`: повторные тапы по микрофону не запускают
 *    второй start поверх активной сессии.
 *  - Перед start проверяется `getStateAsync` и при необходимости `abort` со
 *    стабилизирующим ожиданием.
 *  - Все native-вызовы (start/stop/abort/requestPermissions/addListener)
 *    обёрнуты в try/catch; ошибки маппятся в человеко-читаемые русские
 *    сообщения через `friendlyMessage`.
 *  - Защита от malformed `result`-payload: проверяется массив `results` и тип
 *    `transcript` перед доступом.
 *  - `interimResults: false` — снижаем JSI-нагрузку на слабых SoC.
 *  - `androidRecognitionServicePackage` НЕ передаём — пусть Android выберет
 *    дефолтный recognizer на базе видимости пакетов из AndroidManifest queries.
 *  - AppState-подписка ставится только после успешного `module.start()`,
 *    иначе системный диалог permission'ов триггерит inactive→stop до старта.
 */
export class ExpoSpeechRecognitionAsr implements SpeechRecognitionService {
  private readonly listeners = new Set<(event: AsrEvent) => void>();
  private subscriptions: Subscription[] = [];
  private running = false;
  private starting = false;
  private durationTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;

  private readonly module: ExpoSpeechRecognitionModuleType | null;
  private readonly moduleLoadError: string | null;

  constructor() {
    let module: ExpoSpeechRecognitionModuleType | null = null;
    let loadError: string | null = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lib = require('expo-speech-recognition') as ExpoSpeechRecognitionApi;
      module = lib.ExpoSpeechRecognitionModule ?? null;
      if (!module) {
        loadError = 'Модуль распознавания речи не подключён к нативной части приложения.';
      }
    } catch (err) {
      loadError =
        err instanceof Error
          ? `Не удалось загрузить распознавание речи: ${err.message}`
          : 'Не удалось загрузить распознавание речи.';
    }

    this.module = module;
    this.moduleLoadError = loadError;
  }

  /**
   * Sync-проверка для DI-контейнера: загрузился ли native-модуль вообще.
   * Если false — фабрика откатится на StubAsr, чтобы пользователь увидел
   * понятный «недоступно» вместо краша.
   */
  isModuleLoaded(): boolean {
    return this.module !== null;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.module) return false;
    try {
      return this.module.isRecognitionAvailable() === true;
    } catch {
      return false;
    }
  }

  async start(opts: AsrStartOptions): Promise<void> {
    // [G1] Module guard
    if (!this.module) {
      this.emit({
        type: 'error',
        message: this.moduleLoadError ?? 'Распознавание речи недоступно.',
      });
      return;
    }

    // [G2] Re-entrancy guard
    if (this.starting) return;
    if (this.running) {
      await this.stop();
    }
    this.starting = true;

    try {
      // [G3] Recognizer presence runtime-чек
      let recognizerAvailable = false;
      try {
        recognizerAvailable = this.module.isRecognitionAvailable() === true;
      } catch {
        recognizerAvailable = false;
      }
      if (!recognizerAvailable) {
        this.emit({
          type: 'error',
          message: 'На устройстве не найден сервис распознавания речи.',
        });
        return;
      }

      // [G4] State guard: если recognizer уже занят — abort + settle
      try {
        const state = await this.module.getStateAsync();
        if (state === 'starting' || state === 'recognizing') {
          try {
            this.module.abort();
          } catch {
            /* ignore — abort может бросить если состояние нестабильное */
          }
          await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_AFTER_ABORT_MS));
        }
      } catch {
        /* getStateAsync может бросить на старых версиях — продолжаем */
      }

      // [G5] Permissions
      let permissionGranted = false;
      try {
        const granted = await this.module.requestPermissionsAsync();
        permissionGranted = granted.granted === true;
      } catch (err) {
        this.emit({
          type: 'error',
          message:
            err instanceof Error
              ? `Не удалось запросить разрешение микрофона: ${err.message}`
              : 'Не удалось запросить разрешение микрофона.',
        });
        return;
      }
      if (!permissionGranted) {
        this.emit({
          type: 'error',
          message: 'Нет разрешения на микрофон — разреши в настройках телефона.',
        });
        return;
      }

      // [G6] Подписки на native-события (ставим до start, чтобы не пропустить
      // ранние события вроде `start`/`speechstart`).
      this.attachListeners();

      // [G7] Native start
      try {
        this.module.start({
          lang: opts.lang === 'ru' ? 'ru-RU' : opts.lang,
          interimResults: false,
          continuous: false,
          maxAlternatives: 3,
          contextualStrings: opts.grammar ? [...opts.grammar] : undefined,
          requiresOnDeviceRecognition: false,
          addsPunctuation: false,
          // androidRecognitionServicePackage НЕ передаём — Android выберет дефолтный
          // recognizer из видимых пакетов (см. <queries> в AndroidManifest, секция
          // androidSpeechServicePackages в app.config.ts).
          androidIntentOptions: {
            EXTRA_LANGUAGE_MODEL: 'free_form',
          },
        });
        this.running = true;
      } catch (err) {
        this.cleanup();
        this.emit({
          type: 'error',
          message:
            err instanceof Error
              ? `Не удалось запустить распознавание: ${err.message}`
              : 'Не удалось запустить распознавание.',
        });
        return;
      }

      // [G8] Watchdog'и — только после успешного старта
      if (opts.maxDurationMs && opts.maxDurationMs > 0) {
        this.durationTimer = setTimeout(() => {
          if (this.running) void this.stop();
        }, opts.maxDurationMs);
      }
      this.appStateSubscription = AppState.addEventListener(
        'change',
        (nextState: AppStateStatus) => {
          if (nextState !== 'active' && this.running) {
            void this.stop();
          }
        },
      );
    } finally {
      this.starting = false;
    }
  }

  async stop(): Promise<void> {
    if (!this.running && !this.starting) return;
    if (this.module) {
      try {
        this.module.stop();
      } catch {
        try {
          this.module.abort();
        } catch {
          /* recognizer уже мог завершиться — тихо */
        }
      }
    }
    this.cleanup();
    this.running = false;
  }

  subscribe(listener: (event: AsrEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private attachListeners(): void {
    const module = this.module;
    if (!module) return;

    const safeAdd = <K extends keyof NativeEventMap>(
      name: K,
      handler: NativeEvents[K],
    ): void => {
      try {
        const sub = module.addListener(name, handler);
        if (sub && typeof sub.remove === 'function') {
          this.subscriptions.push(sub);
        }
      } catch {
        /* не ломаем стек подписок если одна не цепляется */
      }
    };

    safeAdd('start', () => {
      this.emit({ type: 'vad', isSpeech: false });
    });
    safeAdd('speechstart', () => {
      this.emit({ type: 'vad', isSpeech: true });
    });
    safeAdd('speechend', () => {
      this.emit({ type: 'vad', isSpeech: false });
    });

    safeAdd('result', (event) => {
      if (!event || !Array.isArray(event.results) || event.results.length === 0) return;
      const first = event.results[0];
      if (!first || typeof first.transcript !== 'string') return;
      const transcript = first.transcript.trim();
      if (!transcript) return;
      const confidence =
        typeof first.confidence === 'number' && first.confidence >= 0 ? first.confidence : 0;
      if (event.isFinal === true) {
        this.emit({ type: 'final', transcript, confidence });
      } else {
        this.emit({ type: 'partial', transcript });
      }
    });

    safeAdd('nomatch', () => {
      // Тихий случай: `end` придёт следом и завершит сессию без эмита `final`.
    });

    safeAdd('error', (event) => {
      if (!event) return;
      // `aborted`/`no-speech` — пользовательские кейсы: либо мы сами стопнули,
      // либо ребёнок не успел сказать. Молча.
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      this.emit({
        type: 'error',
        message: friendlyMessage(event.error, event.message),
      });
    });

    safeAdd('end', () => {
      this.running = false;
      this.cleanup();
    });
  }

  private cleanup(): void {
    if (this.durationTimer !== null) {
      clearTimeout(this.durationTimer);
      this.durationTimer = null;
    }
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;

    for (const s of this.subscriptions) {
      try {
        s.remove();
      } catch {
        /* noop */
      }
    }
    this.subscriptions = [];
  }

  private emit(event: AsrEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* защита остальных слушателей */
      }
    }
  }
}

function friendlyMessage(code: ErrorCode | string, fallback?: string): string {
  switch (code) {
    case 'audio-capture':
      return 'Микрофон занят другим приложением.';
    case 'busy':
      return 'Распознаватель занят, попробуй ещё раз.';
    case 'network':
      return 'Нет сети для распознавания. Проверь интернет.';
    case 'language-not-supported':
      return 'Русский язык не поддерживается на этом устройстве.';
    case 'service-not-allowed':
      return 'Сервис распознавания недоступен на этом устройстве.';
    case 'not-allowed':
      return 'Нет разрешения на микрофон — разреши в настройках телефона.';
    case 'bad-grammar':
      return 'Ошибка грамматики распознавания.';
    case 'speech-timeout':
      return 'Слишком долгая пауза — попробуй ещё раз.';
    case 'client':
    case 'unknown':
      return fallback && fallback.length > 0 ? fallback : 'Ошибка распознавания.';
    default:
      return fallback && fallback.length > 0 ? fallback : 'Ошибка распознавания.';
  }
}
