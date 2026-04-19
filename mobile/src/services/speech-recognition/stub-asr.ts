import type { AsrEvent, AsrStartOptions, SpeechRecognitionService } from './types';

/**
 * Tap-режим / устройство без ASR.
 * Service-интерфейс удовлетворяется, но `isAvailable()` → false —
 * UI использует это как сигнал скрыть MicButton и остаться в чистом tap-режиме.
 */
export class StubAsr implements SpeechRecognitionService {
  private readonly listeners = new Set<(event: AsrEvent) => void>();

  async start(_opts: AsrStartOptions): Promise<void> {
    // нет source-а звука — никогда не эмиттит события
  }

  async stop(): Promise<void> {
    // no-op
  }

  subscribe(listener: (event: AsrEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
