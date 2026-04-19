import * as Speech from 'expo-speech';

import type { SpeechSynthesisService, TtsEvent, TtsSpeakOptions } from './types';

export class ExpoSpeechTts implements SpeechSynthesisService {
  private readonly listeners = new Set<(event: TtsEvent) => void>();

  async speak(text: string, opts: TtsSpeakOptions = {}): Promise<void> {
    this.emit({ type: 'start' });
    await new Promise<void>((resolve) => {
      Speech.speak(text, {
        language: opts.lang ?? 'ru-RU',
        rate: opts.rate ?? 1,
        pitch: opts.pitch ?? 1,
        voice: opts.voice,
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

  private emit(event: TtsEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
