import { useMachine } from '@xstate/react';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { useService } from '@/services/di/provider';
import type { AlphabetContent } from '@/services/content-repo/types';

import type { AnimalInfo, WordEntry } from '../content/types';
import { ANIMALS as FALLBACK_ANIMALS } from '../content/words';
import { currentLetter, currentWord } from '../fsm/guards';
import { alphabetMachine } from '../fsm/machine';

interface UseAlphabetMachineOptions {
  readonly content: AlphabetContent | undefined;
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
export function useAlphabetMachine({ content }: UseAlphabetMachineOptions) {
  const tts = useService('speechSynthesis');
  const words: readonly WordEntry[] = content?.words ?? [];
  const animals = content?.animals ?? FALLBACK_ANIMALS;

  const [state, send, actor] = useMachine(alphabetMachine, {
    input: { words: words.length > 0 ? words : undefined },
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

  // ── Side-effect: TTS при входе в ключевые состояния ────────────────────────
  useEffect(() => {
    if (!word) return undefined;
    const value = state.value;
    if (value === 'showLetter' && letter) {
      const phrase =
        state.context.mode === 'letter_inside_word'
          ? `В слове ${word.word} спряталась буква ${letter.toUpperCase()}. Давай прочитаем слово.`
          : `Буква ${letter.toUpperCase()}.`;
      void tts.speak(phrase);
    } else if (value === 'showWord') {
      void tts.speak(`Прочитай слово: ${word.word}.`);
    } else if (value === 'hintLetter' && letter) {
      const hint = word.letterHints[letter] ?? `Это буква ${letter.toUpperCase()}.`;
      void tts.speak(hint);
    } else if (value === 'hintWord') {
      void tts.speak(`Скажи слово ${word.word}.`);
    } else if (value === 'revealAnimal' && animal) {
      void tts.speak(`${animal.title}! ${animal.greeting}`);
    }

    return () => {
      if (Platform.OS !== 'web') {
        void tts.cancel();
      }
    };
  }, [state.value, state.context.mode, letter, word, animal, tts]);

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
