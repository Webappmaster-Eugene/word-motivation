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

/**
 * Преднастроенные пресеты произношения. Каждый case в игре озвучивается
 * немного по-своему: букву произносим медленнее и немного ниже (чтобы было
 * отчётливо), слово — в обычном темпе, реплику животного — чуть быстрее и
 * чуть выше (живее).
 *
 * Hook/компонент вызывает `tts.speak(text, SPEECH_PRESETS.letter)` и получает
 * одинаковое звучание на всех платформах.
 */
export const SPEECH_PRESETS = {
  letter: { rate: 0.78, pitch: 1.0 },
  word: { rate: 0.9, pitch: 1.05 },
  hint: { rate: 0.88, pitch: 1.05 },
  animalReply: { rate: 0.95, pitch: 1.1 },
  systemMessage: { rate: 0.95, pitch: 1.0 },
} as const satisfies Record<string, Pick<TtsSpeakOptions, 'rate' | 'pitch'>>;

export type SpeechPreset = keyof typeof SPEECH_PRESETS;
