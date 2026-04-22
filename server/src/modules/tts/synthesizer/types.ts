export type SileroVoice = 'xenia' | 'kseniya' | 'baya' | 'aidar' | 'eugene';

export interface SynthesizeRequest {
  readonly text: string;
  readonly voice: SileroVoice;
  readonly rate: number;
}

export interface SynthesizeResult {
  /** Бинарные данные в формате WAV PCM 16-bit. */
  readonly audio: Buffer;
  /** Частота дискретизации, обычно 24000 у Silero v4. */
  readonly sampleRate: number;
}

/**
 * Абстракция над конкретным движком. Сейчас единственная реализация —
 * `HttpSileroSynthesizer` (HTTP-прокси к Python sidecar). В будущем можно
 * заменить на локальный ONNX через onnxruntime-node без изменения контроллера/кеша.
 */
export interface Synthesizer {
  synthesize(req: SynthesizeRequest): Promise<SynthesizeResult>;
  /** Health-check (для /health endpoint'а). Не должен бросать. */
  isHealthy(): Promise<boolean>;
}

/** Ошибка синтеза, когда движок отработал, но не смог озвучить (например, пустой ввод после фильтрации). */
export class SynthesisError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SynthesisError';
  }
}
