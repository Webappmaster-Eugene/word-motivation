import { useMachine } from '@xstate/react';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { useService } from '@/services/di/provider';
import type { AlphabetContent } from '@/services/content-repo/types';
import { SPEECH_PRESETS } from '@/services/speech-synthesis/types';

import type { AnimalInfo, WordEntry } from '../content/types';
import { ANIMALS as FALLBACK_ANIMALS } from '../content/words';
import { currentLetter, currentWord } from '../fsm/guards';
import { alphabetMachine } from '../fsm/machine';

/**
 * Минимальное время отображения буквы/слова/сцены до автоперехода.
 * Даже если TTS закончит раньше (например, на web-SpeechSynthesis-stub),
 * ребёнок должен успеть рассмотреть. Подобрано под возраст 6–12.
 */
const MIN_DISPLAY_MS = {
  letter: 1500,
  scene: 3000,
  done: 1200,
} as const;

interface UseAlphabetMachineOptions {
  readonly content: AlphabetContent | undefined;
  readonly initialWordIndex?: number;
  readonly initialTotalStars?: number;
}

/**
 * Обёртка над XState-машиной алфавита.
 *
 * Единственный источник побочных эффектов на UI-уровне: TTS-проговаривание
 * и haptic-feedback. Сама машина — чистая, все эффекты здесь.
 *
 * Контент (words/animals) приходит снаружи через хук — обычно из
 * react-query + ContentRepo. Если контент ещё грузится — machine ждёт
 * в `idle`, а `word`/`letter`/`animal` будут `null`.
 */
export function useAlphabetMachine({
  content,
  initialWordIndex,
  initialTotalStars,
}: UseAlphabetMachineOptions) {
  const tts = useService('speechSynthesis');
  const words: readonly WordEntry[] = content?.words ?? [];
  const animals = content?.animals ?? FALLBACK_ANIMALS;

  const [state, send, actor] = useMachine(alphabetMachine, {
    input: {
      words: words.length > 0 ? words : undefined,
      wordIndex: initialWordIndex,
      totalStars: initialTotalStars,
    },
  });

  const word: WordEntry | null = useMemo(() => {
    if (state.context.words.length === 0) return null;
    return currentWord(state.context.words, state.context.wordIndex);
  }, [state.context.words, state.context.wordIndex]);

  const letter = useMemo(() => {
    if (!word || state.context.letterIndex >= word.letters.length) return null;
    return currentLetter(word, state.context.letterIndex);
  }, [word, state.context.letterIndex]);

  const animal: AnimalInfo | null = useMemo(() => {
    if (!word) return null;
    return animals[word.animalId] ?? null;
  }, [word, animals]);

  // ── Side-effect: TTS + авто-переход по окончании речи ─────────────────────
  // Стратегия: ждём `max(речь, минимальный floor)`, затем шлём событие перехода.
  // Это убирает жёсткие таймауты — ребёнок успевает рассмотреть даже короткие фразы,
  // и ни одна фраза не обрывается на полуслове. Auto-advance отменяется при
  // unmount/смене состояния через флаг `cancelled`.
  useEffect(() => {
    if (!word) return undefined;
    const value = state.value;
    let cancelled = false;

    const speakAndAdvance = async (
      phrase: string,
      minMs: number,
      nextEvent: Parameters<typeof send>[0] | null,
      preset: (typeof SPEECH_PRESETS)[keyof typeof SPEECH_PRESETS] = SPEECH_PRESETS.word,
    ) => {
      const minTimer = new Promise<void>((resolve) => setTimeout(resolve, minMs));
      await Promise.all([tts.speak(phrase, preset), minTimer]);
      if (!cancelled && nextEvent) send(nextEvent);
    };

    if (value === 'idle') {
      // Приветствие при входе в игру: ребёнок, который ещё не читает,
      // должен услышать, что делать.
      void tts.speak(
        'Привет! Готов учить буквы? Нажми на большую кнопку «Начать».',
        SPEECH_PRESETS.systemMessage,
      );
    } else if (value === 'showLetter' && letter) {
      if (state.context.mode === 'letter_inside_word') {
        const phrase = `В слове ${word.word} спряталась буква ${letter.toUpperCase()}. Давай прочитаем слово.`;
        void speakAndAdvance(phrase, MIN_DISPLAY_MS.letter, { type: 'LETTER_SHOWN' }, SPEECH_PRESETS.word);
      } else {
        // Для отдельной буквы — медленнее и с паузой, чтобы ребёнок расслышал.
        const phrase = `Буква ${letter.toUpperCase()}.`;
        void speakAndAdvance(phrase, MIN_DISPLAY_MS.letter, { type: 'LETTER_SHOWN' }, SPEECH_PRESETS.letter);
      }
    } else if (value === 'showWord') {
      void speakAndAdvance(
        `Прочитай слово: ${word.word}.`,
        MIN_DISPLAY_MS.letter,
        { type: 'LETTER_SHOWN' },
        SPEECH_PRESETS.word,
      );
    } else if (value === 'hintLetter' && letter) {
      const hint = word.letterHints[letter] ?? `Это буква ${letter.toUpperCase()}.`;
      void tts.speak(hint, SPEECH_PRESETS.hint);
    } else if (value === 'hintWord') {
      void tts.speak(`Скажи слово ${word.word}.`, SPEECH_PRESETS.hint);
    } else if (value === 'revealAnimal' && animal) {
      void speakAndAdvance(
        `${animal.title}! ${animal.greeting}`,
        MIN_DISPLAY_MS.scene,
        { type: 'SCENE_READY' },
        SPEECH_PRESETS.animalReply,
      );
    } else if (value === 'done') {
      void speakAndAdvance(
        'Молодец!',
        MIN_DISPLAY_MS.done,
        { type: 'START' },
        SPEECH_PRESETS.animalReply,
      );
    }

    return () => {
      cancelled = true;
      if (Platform.OS !== 'web') {
        void tts.cancel();
      }
    };
  }, [state.value, state.context.mode, letter, word, animal, tts, send]);

  return {
    state,
    send,
    actor,
    word,
    letter,
    animal,
    mode: state.context.mode,
    letterIndex: state.context.letterIndex,
    letterRetries: state.context.letterRetries,
    wordRetries: state.context.wordRetries,
    stats: state.context.stats,
  };
}
