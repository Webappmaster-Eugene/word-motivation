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
 *
 * `voice` — Silero-идентификатор для ServerTts; ExpoSpeechTts его игнорирует
 * (использует системный голос). Значение 'kseniya' чище передаёт согласные,
 * 'baya' звучит теплее — оптимально для слов и реплик животных.
 */
export const SPEECH_PRESETS = {
  letter: { rate: 0.78, pitch: 1.0, voice: 'kseniya' },
  word: { rate: 0.9, pitch: 1.05, voice: 'baya' },
  hint: { rate: 0.88, pitch: 1.05, voice: 'baya' },
  animalReply: { rate: 0.95, pitch: 1.1, voice: 'baya' },
  systemMessage: { rate: 0.95, pitch: 1.0, voice: 'baya' },
} as const satisfies Record<string, Pick<TtsSpeakOptions, 'rate' | 'pitch' | 'voice'>>;

export type SpeechPreset = keyof typeof SPEECH_PRESETS;
