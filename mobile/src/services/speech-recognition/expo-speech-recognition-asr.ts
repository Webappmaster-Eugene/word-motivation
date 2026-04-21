import type { AsrEvent, AsrStartOptions, SpeechRecognitionService } from './types';

type Subscription = { remove: () => void };

type ExpoSpeechRecognitionModuleType =
  typeof import('expo-speech-recognition')['ExpoSpeechRecognitionModule'];
type AddListenerType = typeof import('expo-speech-recognition')['addSpeechRecognitionListener'];

/**
 * Native реализация через `expo-speech-recognition` (iOS + Android + Web).
 * Работает через системный распознаватель речи — на Android это Google Speech
 * Recognizer (офлайн-режим доступен при скачанной языковой модели).
 *
 * Модуль импортируется лениво через require — чтобы при web-бандлинге не тащить
 * native-код, который не исполнится.
 */
export class ExpoSpeechRecognitionAsr implements SpeechRecognitionService {
  private readonly listeners = new Set<(event: AsrEvent) => void>();
  private subscriptions: Subscription[] = [];
  private running = false;

  private get module(): ExpoSpeechRecognitionModuleType {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo-speech-recognition') as typeof import('expo-speech-recognition'))
      .ExpoSpeechRecognitionModule;
  }

  private get addListener(): AddListenerType {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo-speech-recognition') as typeof import('expo-speech-recognition'))
      .addSpeechRecognitionListener;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.module.getPermissionsAsync();
      // Если модуль отвечает на запрос разрешений — он доступен на устройстве.
      return status !== null && status !== undefined;
    } catch {
      return false;
    }
  }

  async start(opts: AsrStartOptions): Promise<void> {
    if (this.running) {
      await this.stop();
    }

    // Разрешения — пользователь увидит системный диалог при первом запуске.
    try {
      const granted = await this.module.requestPermissionsAsync();
      if (!granted.granted) {
        this.emit({
          type: 'error',
          message: 'Нет разрешения на микрофон — разреши в настройках телефона.',
        });
        return;
      }
    } catch (err) {
      this.emit({
        type: 'error',
        message: err instanceof Error ? err.message : 'Не удалось запросить разрешение микрофона',
      });
      return;
    }

    const addListener = this.addListener;

    this.subscriptions.push(
      addListener('start', () => {
        this.emit({ type: 'vad', isSpeech: false });
      }),
      addListener('speechstart', () => {
        this.emit({ type: 'vad', isSpeech: true });
      }),
      addListener('speechend', () => {
        this.emit({ type: 'vad', isSpeech: false });
      }),
      addListener('result', (event) => {
        const first = event.results[0];
        if (!first) return;
        const transcript = first.transcript.trim();
        if (!transcript) return;
        if (event.isFinal) {
          this.emit({
            type: 'final',
            transcript,
            confidence: first.confidence ?? 0,
          });
        } else {
          this.emit({ type: 'partial', transcript });
        }
      }),
      addListener('error', (event) => {
        // `no-speech`, `aborted` — пользовательские кейсы, не показываем как ошибку
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        this.emit({
          type: 'error',
          message: event.message || event.error || 'Ошибка распознавания',
        });
      }),
      addListener('end', () => {
        this.running = false;
        this.cleanup();
      }),
    );

    try {
      this.module.start({
        lang: opts.lang === 'ru' ? 'ru-RU' : opts.lang,
        interimResults: true,
        continuous: false,
        maxAlternatives: 3,
        contextualStrings: opts.grammar ? [...opts.grammar] : undefined,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'free_form',
        },
      });
      this.running = true;
    } catch (err) {
      this.cleanup();
      this.emit({
        type: 'error',
        message: err instanceof Error ? err.message : 'Не удалось запустить распознавание',
      });
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    try {
      this.module.stop();
    } catch {
      // игнорируем — возможно, уже остановлено
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

  private cleanup(): void {
    for (const s of this.subscriptions) {
      try {
        s.remove();
      } catch {
        // noop
      }
    }
    this.subscriptions = [];
  }

  private emit(event: AsrEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // защита других слушателей
      }
    }
  }
}
