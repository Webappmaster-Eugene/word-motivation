/**
 * DI-токен для `Synthesizer`. Отдельный файл, чтобы избежать циклических
 * импортов между `tts.service.ts` и `http-silero-synthesizer.ts`.
 */
export const SYNTHESIZER = Symbol.for('tts.Synthesizer');
