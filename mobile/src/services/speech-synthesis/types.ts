export interface TtsSpeakOptions {
  readonly lang?: 'ru-RU';
  readonly rate?: number;
  readonly pitch?: number;
  readonly voice?: string;
}

export type TtsEvent =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'error'; message: string };

export interface SpeechSynthesisService {
  speak(text: string, opts?: TtsSpeakOptions): Promise<void>;
  cancel(): Promise<void>;
  subscribe(listener: (event: TtsEvent) => void): () => void;
  isAvailable(): Promise<boolean>;
}
