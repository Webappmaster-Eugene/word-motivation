export type AsrEvent =
  | { type: 'partial'; transcript: string }
  | { type: 'final'; transcript: string; confidence: number }
  | { type: 'vad'; isSpeech: boolean }
  | { type: 'error'; message: string };

export interface AsrStartOptions {
  readonly lang: 'ru';
  readonly grammar?: readonly string[];
  readonly maxDurationMs?: number;
}

export interface SpeechRecognitionService {
  start(opts: AsrStartOptions): Promise<void>;
  stop(): Promise<void>;
  subscribe(listener: (event: AsrEvent) => void): () => void;
  isAvailable(): Promise<boolean>;
}
