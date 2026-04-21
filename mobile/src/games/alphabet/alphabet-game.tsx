import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useService } from '@/services/di/provider';
import type { AlphabetContent } from '@/services/content-repo/types';
import { theme } from '@/shared/theme';

import { ActionBar } from './components/action-bar';
import { AnimalRevealCard } from './components/animal-reveal-card';
import { HintBanner } from './components/hint-banner';
import { LetterCard } from './components/letter-card';
import { MicButton } from './components/mic-button';
import { MicErrorBanner } from './components/mic-error-banner';
import { ProgressPips } from './components/progress-pips';
import { StarsBanner } from './components/stars-banner';
import { WordReveal } from './components/word-reveal';
import { MAX_RETRIES } from './fsm/types';
import { humanizeAsrError } from './hooks/humanize-asr-error';
import { useAlphabetMachine } from './hooks/use-alphabet-machine';
import { useLetterMastery } from './hooks/use-letter-mastery';
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

/**
 * Подсказка под кнопками, когда ASR-сервис недоступен (StubAsr на native до M3.5,
 * Firefox без Web Speech на web). Ребёнок должен видеть, что микрофона нет
 * специально, а не из-за сломанной игры.
 */
function NoMicHint() {
  return (
    <View style={styles.noMicHint} accessibilityRole="text">
      <Text style={styles.noMicHintText}>Сегодня без микрофона — нажимай на кнопки!</Text>
    </View>
  );
}

interface AlphabetGameProps {
  readonly content: AlphabetContent;
  readonly initialWordIndex: number;
  readonly initialTotalStars: number;
  readonly onProgressChange: (progress: { wordIndex: number; totalStars: number }) => void;
}

export function AlphabetGame({
  content,
  initialWordIndex,
  initialTotalStars,
  onProgressChange,
}: AlphabetGameProps) {
  const router = useRouter();
  const tts = useService('speechSynthesis');
  const mastery = useLetterMastery(content.words);
  const [asrError, setAsrError] = useState<string | null>(null);

  // Подсовываем FSM упорядоченный по mastery список, чтобы первыми шли слова
  // со сложными буквами. Пока не загрузили snapshot — используем обычный порядок.
  const orderedContent = useRef(content);
  orderedContent.current = mastery.loaded ? { ...content, words: mastery.ordered } : content;

  const { state, send, word, letter, animal, mode, letterIndex, letterRetries, wordRetries } =
    useAlphabetMachine({
      content: orderedContent.current,
      initialWordIndex,
      initialTotalStars,
    });

  // Persist текущего прогресса: при любом изменении wordIndex/totalStars
  // сохраняем в KV-storage (внутри debounce через сравнение в save()).
  useEffect(() => {
    onProgressChange({
      wordIndex: state.context.wordIndex,
      totalStars: state.context.totalStars,
    });
  }, [state.context.wordIndex, state.context.totalStars, onProgressChange]);

  const lastStats = useRef({ correct: 0, wrong: 0 });

  // Автопереходы showLetter/showWord → listen*, revealAnimal → sceneReady,
  // done → следующий цикл живут в useAlphabetMachine и синхронизированы
  // с окончанием TTS, чтобы фразы не обрывались.

  useEffect(() => {
    const { correct, wrong } = state.context.stats;
    const correctDelta = correct - lastStats.current.correct;
    const wrongDelta = wrong - lastStats.current.wrong;

    if (correctDelta > 0) {
      tryHaptic('success');
      if (letter) mastery.recordLetter(letter, true);
    } else if (wrongDelta > 0) {
      tryHaptic(Haptics.ImpactFeedbackStyle.Soft);
      if (letter) mastery.recordLetter(letter, false);
    }
    lastStats.current = { correct, wrong };
    // mastery.recordLetter — стабильный идентификатор функции, letter и stats обновляются
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.context.stats]);

  // В idle ещё нечего терять — выходим сразу. Иначе подтверждаем, чтобы
  // случайный тап по «Домой» не прервал середину слова/сцены.
  const goHome = () => {
    if (state.matches('idle')) {
      router.back();
      return;
    }
    Alert.alert(
      'Выйти?',
      'Прогресс сохранится, ты сможешь продолжить в любой момент.',
      [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => router.back() },
      ],
      { cancelable: true },
    );
  };
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
      setAsrError(null);
      if (listeningLetter) {
        send({ type: 'SUBMIT_LETTER', value: transcript });
      } else if (listeningWord) {
        send({ type: 'SUBMIT_WORD', value: transcript });
      }
    },
    onError: (message) => {
      const friendly = humanizeAsrError(message);
      setAsrError(friendly);
      void tts.speak(friendly);
    },
  });

  // Гасим «прилипший» error при переходе к новой букве/слову, чтобы он не
  // накрывал следующий шаг. `letterIndex`/`wordIndex` меняются на каждом шаге FSM.
  useEffect(() => {
    setAsrError(null);
  }, [letterIndex, word?.word]);

  // Одноразовая озвучка для режима без микрофона: ребёнок должен понять,
  // что ему не сломали игру — просто нужно тапать кнопки. После первого
  // входа в listen*-состояние с недоступным ASR — говорим и больше не повторяем.
  const announcedNoMicRef = useRef(false);
  useEffect(() => {
    if (voiceActive && !voice.available && !announcedNoMicRef.current) {
      announcedNoMicRef.current = true;
      void tts.speak('Сегодня без микрофона. Нажимай на большие кнопки.');
    }
  }, [voiceActive, voice.available, tts]);

  const { sessionId } = useProgressSync({
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
        <View style={[styles.back, styles.starsCell]}>
          {state.context.totalStars > 0 ? (
            <Text
              style={styles.starsCounter}
              accessibilityLabel={`Накоплено звёзд: ${state.context.totalStars}`}
            >
              ⭐ {state.context.totalStars}
            </Text>
          ) : null}
        </View>
      </View>

      <ProgressPips
        total={word.letters.length}
        current={Math.min(letterIndex, word.letters.length)}
      />

      <View style={styles.body}>{body}</View>
      {asrError ? <MicErrorBanner message={asrError} onDismiss={() => setAsrError(null)} /> : null}
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
      // В listen-режиме без микрофона — ребёнок должен видеть, почему нет иконки.
      const showNoMicHint = !voice.available && listeningLetter;
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
            {showNoMicHint ? <NoMicHint /> : null}
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
          {showNoMicHint ? <NoMicHint /> : null}
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
      const showNoMicHint = !voice.available && listeningWord;
      return (
        <>
          <WordReveal letters={word!.letters} onTap={submitCorrectWord} hint="Прочитай слово" />
          {showMic ? (
            <MicButton state={voice.micState} transcript={voice.transcript} onPress={voice.toggle} />
          ) : null}
          {showNoMicHint ? <NoMicHint /> : null}
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
      // Чат появляется только в sceneReady — после того, как TTS закончил
      // проговаривать приветствие. Иначе одновременно звучал бы greeting
      // и «в истории» уже был бы тот же текст как первое сообщение.
      const chatEnabled = state.matches('sceneReady');
      return (
        <View style={styles.revealWrap}>
          <StarsBanner count={state.context.lastWordStars} total={state.context.totalStars} />
          <AnimalRevealCard
            animal={animal}
            onContinue={exitConversation}
            chatEnabled={chatEnabled}
            sessionId={sessionId}
          />
        </View>
      );
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
  revealWrap: {
    flex: 1,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  noMicHint: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  noMicHintText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  starsCell: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  starsCounter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D89B00',
  },
});
