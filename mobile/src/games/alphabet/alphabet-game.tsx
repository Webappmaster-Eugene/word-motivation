import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AlphabetContent } from '@/services/content-repo/types';
import { theme } from '@/shared/theme';

import { ActionBar } from './components/action-bar';
import { AnimalRevealCard } from './components/animal-reveal-card';
import { HintBanner } from './components/hint-banner';
import { LetterCard } from './components/letter-card';
import { MicButton } from './components/mic-button';
import { ProgressPips } from './components/progress-pips';
import { WordReveal } from './components/word-reveal';
import { MAX_RETRIES } from './fsm/types';
import { useAlphabetMachine } from './hooks/use-alphabet-machine';
import { useProgressSync } from './hooks/use-progress-sync';
import { useVoiceInput } from './hooks/use-voice-input';

/**
 * Плейсхолдеры, отличающиеся от любой реальной буквы/слова —
 * нужны чтобы кнопка «Помоги» гарантированно уходила в hint-ветку FSM.
 */
const NOT_A_LETTER = '__skip__';
const NOT_A_WORD = '__skip_word__';

function tryHaptic(style: Haptics.ImpactFeedbackStyle | 'success'): void {
  if (Platform.OS === 'web') return;
  try {
    if (style === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(style);
    }
  } catch {
    // haptics не поддерживаются — проглатываем
  }
}

interface AlphabetGameProps {
  readonly content: AlphabetContent;
}

export function AlphabetGame({ content }: AlphabetGameProps) {
  const router = useRouter();
  const { state, send, word, letter, animal, mode, letterIndex, letterRetries, wordRetries } =
    useAlphabetMachine({ content });

  const lastStats = useRef({ correct: 0, wrong: 0 });

  useEffect(() => {
    if (state.matches('showLetter') || state.matches('showWord')) {
      const timer = setTimeout(() => send({ type: 'LETTER_SHOWN' }), 1200);
      return () => clearTimeout(timer);
    }
    if (state.matches('revealAnimal')) {
      const timer = setTimeout(() => send({ type: 'SCENE_READY' }), 1400);
      return () => clearTimeout(timer);
    }
    if (state.matches('done')) {
      const timer = setTimeout(() => send({ type: 'START' }), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state, send]);

  useEffect(() => {
    const { correct, wrong } = state.context.stats;
    if (correct > lastStats.current.correct) {
      tryHaptic('success');
    } else if (wrong > lastStats.current.wrong) {
      tryHaptic(Haptics.ImpactFeedbackStyle.Soft);
    }
    lastStats.current = { correct, wrong };
  }, [state.context.stats]);

  const goHome = () => router.back();
  const submitCorrectLetter = () => {
    if (letter) send({ type: 'SUBMIT_LETTER', value: letter });
  };
  const submitWrongLetter = () => send({ type: 'SUBMIT_LETTER', value: NOT_A_LETTER });
  const submitCorrectWord = () => {
    if (word) send({ type: 'SUBMIT_WORD', value: word.word });
  };
  const submitWrongWord = () => send({ type: 'SUBMIT_WORD', value: NOT_A_WORD });
  const dismissHint = () => send({ type: 'HINT_DONE' });
  const exitConversation = () => send({ type: 'EXIT_CONVERSATION' });

  const listeningLetter = state.matches('listenLetter');
  const listeningWord = state.matches('listenWord');
  const voiceActive = listeningLetter || listeningWord;

  const voiceGrammar =
    listeningLetter && letter ? [letter] : listeningWord && word ? [word.word] : undefined;

  const voice = useVoiceInput({
    active: voiceActive,
    grammar: voiceGrammar,
    onFinal: (transcript) => {
      if (listeningLetter) {
        send({ type: 'SUBMIT_LETTER', value: transcript });
      } else if (listeningWord) {
        send({ type: 'SUBMIT_WORD', value: transcript });
      }
    },
  });

  useProgressSync({
    stateValue: String(state.value),
    gameId: 'alphabet',
    word,
    letter,
    wordRetries,
    letterRetries,
    statsCorrect: state.context.stats.correct,
    statsWrong: state.context.stats.wrong,
    animalId: animal?.id ?? null,
  });

  if (!word) {
    // Контент невалидный (пустой и fallback сломан) — возвращаем на главную.
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Text style={styles.welcome}>Нет доступного контента</Text>
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
            onPress={goHome}
          >
            <Text style={styles.startBtnText}>На главную</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const body = renderBody();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="На главную"
          onPress={goHome}
          style={styles.back}
        >
          <Text style={styles.backText}>← Домой</Text>
        </Pressable>
        <Text style={styles.wordLabel}>{word.word.toUpperCase()}</Text>
        <View style={styles.back} />
      </View>

      <ProgressPips
        total={word.letters.length}
        current={Math.min(letterIndex, word.letters.length)}
      />

      <View style={styles.body}>{body}</View>
    </SafeAreaView>
  );

  function renderBody(): React.ReactNode {
    if (state.matches('idle')) {
      return (
        <View style={styles.center}>
          <Text style={styles.welcome}>Готов учить буквы?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Начать игру"
            style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
            onPress={() => send({ type: 'START' })}
          >
            <Text style={styles.startBtnText}>Начать!</Text>
          </Pressable>
        </View>
      );
    }

    if (
      state.matches('showLetter') ||
      state.matches('listenLetter') ||
      state.matches('hintLetter')
    ) {
      const showMic = voice.available && listeningLetter;
      if (mode === 'letter_inside_word' && letter) {
        return (
          <>
            <WordReveal
              letters={word!.letters}
              highlightIndex={letterIndex}
              onTap={submitCorrectLetter}
              hint={`Найди букву ${letter.toUpperCase()} в слове`}
            />
            {showMic ? (
              <MicButton state={voice.micState} transcript={voice.transcript} onPress={voice.toggle} />
            ) : null}
            {state.matches('hintLetter') ? (
              <HintBanner
                message={word!.letterHints[letter] ?? `Это буква ${letter.toUpperCase()}.`}
                onDismiss={dismissHint}
                retries={letterRetries}
                maxRetries={MAX_RETRIES}
              />
            ) : (
              <ActionBar
                actions={[
                  { label: 'Прочитал!', onPress: submitCorrectLetter, variant: 'primary' },
                  { label: 'Помоги', onPress: submitWrongLetter, variant: 'secondary' },
                ]}
              />
            )}
          </>
        );
      }

      return (
        <>
          <View style={styles.center}>
            {letter ? <LetterCard letter={letter} onTap={submitCorrectLetter} /> : null}
          </View>
          {showMic ? (
            <MicButton state={voice.micState} transcript={voice.transcript} onPress={voice.toggle} />
          ) : null}
          {state.matches('hintLetter') && letter ? (
            <HintBanner
              message={word!.letterHints[letter] ?? `Это буква ${letter.toUpperCase()}.`}
              onDismiss={dismissHint}
              retries={letterRetries}
              maxRetries={MAX_RETRIES}
            />
          ) : (
            <ActionBar
              actions={[
                {
                  label: letter ? `Это ${letter.toUpperCase()}!` : 'Готово',
                  onPress: submitCorrectLetter,
                  variant: 'primary',
                },
                { label: 'Помоги', onPress: submitWrongLetter, variant: 'secondary' },
              ]}
            />
          )}
        </>
      );
    }

    if (
      state.matches('showWord') ||
      state.matches('listenWord') ||
      state.matches('hintWord')
    ) {
      const showMic = voice.available && listeningWord;
      return (
        <>
          <WordReveal letters={word!.letters} onTap={submitCorrectWord} hint="Прочитай слово" />
          {showMic ? (
            <MicButton state={voice.micState} transcript={voice.transcript} onPress={voice.toggle} />
          ) : null}
          {state.matches('hintWord') ? (
            <HintBanner
              message={`Это слово — ${word!.word.toUpperCase()}.`}
              onDismiss={dismissHint}
              retries={wordRetries}
              maxRetries={MAX_RETRIES}
            />
          ) : (
            <ActionBar
              actions={[
                { label: `Это ${word!.word.toUpperCase()}!`, onPress: submitCorrectWord, variant: 'primary' },
                { label: 'Помоги', onPress: submitWrongWord, variant: 'secondary' },
              ]}
            />
          )}
        </>
      );
    }

    if ((state.matches('revealAnimal') || state.matches('sceneReady')) && animal) {
      return <AnimalRevealCard animal={animal} onContinue={exitConversation} />;
    }

    if (state.matches('done')) {
      return (
        <View style={styles.center}>
          <Text style={styles.done}>Молодец! 🎉</Text>
        </View>
      );
    }

    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  back: {
    minWidth: 80,
    paddingVertical: theme.spacing.sm,
  },
  backText: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  wordLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 2,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  startBtn: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  startBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  done: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.success,
  },
});
