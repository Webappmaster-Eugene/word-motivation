import { assign, setup } from 'xstate';


import { currentLetter, currentWord, isLetterMatch, isWordMatch } from './guards';
import {
  MAX_RETRIES,
  starsForWord,
  type AlphabetContext,
  type AlphabetEvent,
} from './types';
import { isSpecialLetter } from '../content/special-letters';
import { WORD_PACK } from '../content/words';

const initialContext: AlphabetContext = {
  words: WORD_PACK,
  wordIndex: 0,
  letterIndex: 0,
  letterRetries: 0,
  wordRetries: 0,
  mode: 'normal',
  stats: { correct: 0, wrong: 0, autoAdvanced: 0 },
  currentWordStats: { wrong: 0, autoAdvanced: false },
  lastWordStars: 0,
  totalStars: 0,
};

export const alphabetMachine = setup({
  types: {
    context: {} as AlphabetContext,
    events: {} as AlphabetEvent,
    input: {} as Partial<Pick<AlphabetContext, 'words' | 'wordIndex' | 'totalStars'>>,
  },

  guards: {
    isLetterCorrect: ({ context, event }) => {
      if (event.type !== 'SUBMIT_LETTER') return false;
      const word = currentWord(context.words, context.wordIndex);
      return isLetterMatch(currentLetter(word, context.letterIndex), event.value);
    },
    isWordCorrect: ({ context, event }) => {
      if (event.type !== 'SUBMIT_WORD') return false;
      const word = currentWord(context.words, context.wordIndex);
      return isWordMatch(word.word, event.value);
    },
    isLastLetter: ({ context }) => {
      const word = currentWord(context.words, context.wordIndex);
      return context.letterIndex >= word.letters.length - 1;
    },
    maxLetterRetriesReached: ({ context }) => context.letterRetries + 1 >= MAX_RETRIES,
    maxWordRetriesReached: ({ context }) => context.wordRetries + 1 >= MAX_RETRIES,
  },

  actions: {
    loadCurrentWord: assign(({ context }) => {
      const word = currentWord(context.words, context.wordIndex);
      const letter = currentLetter(word, 0);
      return {
        letterIndex: 0,
        letterRetries: 0,
        wordRetries: 0,
        mode: isSpecialLetter(letter) ? ('letter_inside_word' as const) : ('normal' as const),
        currentWordStats: { wrong: 0, autoAdvanced: false },
      };
    }),
    advanceLetter: assign(({ context }) => {
      const word = currentWord(context.words, context.wordIndex);
      const nextIndex = context.letterIndex + 1;
      const nextLetter = word.letters[nextIndex];
      return {
        letterIndex: nextIndex,
        letterRetries: 0,
        mode:
          nextLetter !== undefined && isSpecialLetter(nextLetter)
            ? ('letter_inside_word' as const)
            : ('normal' as const),
      };
    }),
    advanceWord: assign(({ context }) => {
      const nextIndex = (context.wordIndex + 1) % context.words.length;
      return {
        wordIndex: nextIndex,
      };
    }),
    incrementLetterRetry: assign({
      letterRetries: ({ context }) => context.letterRetries + 1,
      stats: ({ context }) => ({ ...context.stats, wrong: context.stats.wrong + 1 }),
      currentWordStats: ({ context }) => ({
        ...context.currentWordStats,
        wrong: context.currentWordStats.wrong + 1,
      }),
    }),
    incrementWordRetry: assign({
      wordRetries: ({ context }) => context.wordRetries + 1,
      stats: ({ context }) => ({ ...context.stats, wrong: context.stats.wrong + 1 }),
      currentWordStats: ({ context }) => ({
        ...context.currentWordStats,
        wrong: context.currentWordStats.wrong + 1,
      }),
    }),
    markLetterCorrect: assign({
      stats: ({ context }) => ({ ...context.stats, correct: context.stats.correct + 1 }),
    }),
    markWordCorrect: assign({
      stats: ({ context }) => ({ ...context.stats, correct: context.stats.correct + 1 }),
    }),
    markAutoAdvanced: assign({
      stats: ({ context }) => ({ ...context.stats, autoAdvanced: context.stats.autoAdvanced + 1 }),
      currentWordStats: ({ context }) => ({ ...context.currentWordStats, autoAdvanced: true }),
    }),
    awardStars: assign(({ context }) => {
      const earned = starsForWord(context.currentWordStats);
      return {
        lastWordStars: earned,
        totalStars: context.totalStars + earned,
      };
    }),
  },
}).createMachine({
  id: 'alphabet',
  initial: 'idle',
  context: ({ input }) => ({
    ...initialContext,
    ...(input?.words ? { words: input.words } : {}),
    ...(input?.wordIndex !== undefined ? { wordIndex: input.wordIndex } : {}),
    ...(input?.totalStars !== undefined ? { totalStars: input.totalStars } : {}),
  }),

  states: {
    idle: {
      on: {
        START: { target: 'loadingWord' },
      },
    },

    loadingWord: {
      entry: 'loadCurrentWord',
      always: { target: 'showLetter' },
    },

    showLetter: {
      on: {
        LETTER_SHOWN: { target: 'listenLetter' },
      },
    },

    listenLetter: {
      on: {
        SUBMIT_LETTER: [
          {
            guard: 'isLetterCorrect',
            actions: 'markLetterCorrect',
            target: 'letterResolved',
          },
          {
            guard: 'maxLetterRetriesReached',
            actions: ['incrementLetterRetry', 'markAutoAdvanced'],
            target: 'letterResolved',
          },
          {
            actions: 'incrementLetterRetry',
            target: 'hintLetter',
          },
        ],
      },
    },

    hintLetter: {
      on: {
        HINT_DONE: { target: 'listenLetter' },
      },
    },

    /**
     * Промежуточное состояние: буква завершена (верно/форсированно) —
     * решаем, куда идти дальше. Transient state (`always`), не требует событий.
     */
    letterResolved: {
      always: [
        {
          guard: 'isLastLetter',
          target: 'showWord',
        },
        {
          actions: 'advanceLetter',
          target: 'showLetter',
        },
      ],
    },

    showWord: {
      on: {
        LETTER_SHOWN: { target: 'listenWord' },
      },
    },

    listenWord: {
      on: {
        SUBMIT_WORD: [
          {
            guard: 'isWordCorrect',
            actions: 'markWordCorrect',
            target: 'revealAnimal',
          },
          {
            guard: 'maxWordRetriesReached',
            actions: ['incrementWordRetry', 'markAutoAdvanced'],
            target: 'revealAnimal',
          },
          {
            actions: 'incrementWordRetry',
            target: 'hintWord',
          },
        ],
      },
    },

    hintWord: {
      on: {
        HINT_DONE: { target: 'listenWord' },
      },
    },

    revealAnimal: {
      entry: 'awardStars',
      on: {
        SCENE_READY: { target: 'sceneReady' },
      },
    },

    sceneReady: {
      on: {
        EXIT_CONVERSATION: { target: 'done' },
      },
      // В M2 упрощённо: беседа рендерится сразу после scene_ready.
      // В M8 появится отдельное состояние conversation с sub-machine.
    },

    done: {
      entry: 'advanceWord',
      on: {
        RESTART: { target: 'idle' },
        START: { target: 'loadingWord' },
      },
    },
  },
});

export { initialContext };
