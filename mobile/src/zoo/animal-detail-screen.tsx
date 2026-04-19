import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimalScene } from '@/games/alphabet/components/animal-scene';
import { MicButton } from '@/games/alphabet/components/mic-button';
import { useVoiceInput } from '@/games/alphabet/hooks/use-voice-input';
import type { AnimalInfo } from '@/games/alphabet/content/types';
import type { AnimalSceneAsset } from '@/services/animal-scene/types';
import { useService } from '@/services/di/provider';
import type { ChatHistoryEntry } from '@/services/llm-chat/llm-chat';
import { theme } from '@/shared/theme';

import { useZooData } from './hooks/use-zoo-data';

interface Props {
  readonly animalId: string;
}

const QUICK_QUESTIONS: readonly string[] = [
  'Что ты любишь кушать?',
  'Где ты живёшь?',
  'Что ты умеешь?',
];

export function AnimalDetailScreen({ animalId }: Props) {
  const router = useRouter();
  const query = useZooData();
  const tts = useService('speechSynthesis');
  const progress = useService('progressApi');
  const llm = useService('llmChat');

  const animal: AnimalInfo | null = useMemo(() => {
    if (!query.data) return null;
    for (const group of query.data) {
      const found = group.animals.find((a) => a.id === animalId);
      if (found) return found;
    }
    return null;
  }, [query.data, animalId]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<readonly ChatHistoryEntry[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef<ChatHistoryEntry[]>([]);
  historyRef.current = [...history];
  const scrollRef = useRef<ScrollView | null>(null);

  // Сессия zoo — одна на вход на экран. Unlock счётчик визитов тоже бампается.
  useEffect(() => {
    if (!animal) return;
    let cancelled = false;
    progress
      .startSession({ gameId: 'zoo' })
      .then((s) => {
        if (!cancelled) setSessionId(s.id);
      })
      .catch(() => {
        /* graceful */
      });
    progress.unlockAnimal(animal.id).catch(() => {
      /* graceful */
    });
    return () => {
      cancelled = true;
      if (sessionId) {
        progress.endSession({ sessionId }).catch(() => {
          /* graceful */
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal?.id]);

  const speakReply = useCallback(
    (text: string) => {
      if (!animal) return;
      void tts.speak(`${animal.title}! ${text}`);
    },
    [animal, tts],
  );

  // При первом показе — greeting.
  useEffect(() => {
    if (!animal) return;
    const initial: ChatHistoryEntry[] = [{ role: 'assistant', content: animal.greeting }];
    setHistory(initial);
    speakReply(animal.greeting);
  }, [animal, speakReply]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!animal || !userText.trim()) return;
      const nextHistory = [...historyRef.current, { role: 'user' as const, content: userText }];
      setHistory(nextHistory);
      setIsThinking(true);

      const sid = sessionId;
      if (!sid) {
        setIsThinking(false);
        setHistory([...nextHistory, { role: 'assistant', content: animal.greeting }]);
        speakReply(animal.greeting);
        return;
      }

      try {
        const response = await llm.reply({
          sessionId: sid,
          animalId: animal.id,
          userText,
          history: nextHistory.slice(-8),
        });
        const updated: ChatHistoryEntry[] = [
          ...nextHistory,
          { role: 'assistant', content: response.reply },
        ];
        setHistory(updated);
        speakReply(response.reply);
      } catch (err) {
        // Серверная сетевая ошибка → локальный фолбэк из scripted
        const scripted =
          animal.scriptedReplies && animal.scriptedReplies.length > 0
            ? animal.scriptedReplies[
                Math.floor(Math.random() * animal.scriptedReplies.length)
              ]!
            : animal.greeting;
        setHistory([...nextHistory, { role: 'assistant', content: scripted }]);
        speakReply(scripted);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('LLM недоступен, scripted fallback:', err);
        }
      } finally {
        setIsThinking(false);
      }
    },
    [animal, sessionId, llm, speakReply],
  );

  const voice = useVoiceInput({
    active: !isThinking,
    grammar: undefined,
    onFinal: (transcript) => {
      if (transcript.trim()) void sendMessage(transcript.trim());
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [history]);

  if (!animal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Животное не найдено</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnText}>Назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const asset: AnimalSceneAsset = {
    id: animal.id,
    title: animal.title,
    emoji: animal.emoji,
    color: animal.color,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Зоопарк</Text>
        </Pressable>
        <Text style={styles.title}>{animal.title}</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.sceneWrap}>
        <AnimalScene asset={asset} animation="greet" />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.historyScroll}
        showsVerticalScrollIndicator={false}
      >
        {history.map((m, i) => (
          <View
            key={i}
            style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAnimal]}
          >
            <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleUserText]}>
              {m.content}
            </Text>
          </View>
        ))}
        {isThinking ? (
          <View style={[styles.bubble, styles.bubbleAnimal, styles.thinking]}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.thinkingText}>думает…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.quickRow}>
        {QUICK_QUESTIONS.map((q) => (
          <Pressable
            key={q}
            disabled={isThinking}
            onPress={() => sendMessage(q)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.quickBtn,
              pressed && !isThinking && styles.pressed,
              isThinking && styles.quickDisabled,
            ]}
          >
            <Text style={styles.quickText}>{q}</Text>
          </Pressable>
        ))}
      </View>

      {voice.available ? (
        <MicButton state={voice.micState} transcript={voice.transcript} onPress={voice.toggle} />
      ) : (
        <Text style={styles.voiceHint}>Нажми вопрос сверху, чтобы поговорить.</Text>
      )}
    </SafeAreaView>
  );
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
    minWidth: 90,
    paddingVertical: theme.spacing.sm,
  },
  backText: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sceneWrap: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  historyScroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '85%',
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleAnimal: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accent,
  },
  bubbleText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
  },
  bubbleUserText: {
    color: '#fff',
    fontWeight: '600',
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  thinkingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  quickBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickDisabled: {
    opacity: 0.5,
  },
  quickText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  voiceHint: {
    padding: theme.spacing.md,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  backBtn: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
