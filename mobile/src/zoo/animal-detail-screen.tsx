import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimalScene } from '@/games/alphabet/components/animal-scene';
import { MicButton } from '@/games/alphabet/components/mic-button';
import { TypingIndicator } from '@/games/alphabet/components/typing-indicator';
import { useVoiceInput } from '@/games/alphabet/hooks/use-voice-input';
import type { AnimalInfo } from '@/games/alphabet/content/types';
import type { AnimalSceneAsset } from '@/services/animal-scene/types';
import { useService } from '@/services/di/provider';
import type { ChatHistoryEntry } from '@/services/llm-chat/llm-chat';
import { sanitizeUserMessage } from '@/shared/client-moderation';
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

type ChatMessage = ChatHistoryEntry & { readonly sanitized?: boolean };

function triggerHaptic(type: 'light' | 'success' | 'warning' = 'light'): void {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'warning') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // noop
  }
}

/**
 * Готовит историю для отправки на сервер: отбрасывает санитизированные
 * user-сообщения и следующий за ними ассистентский ответ (это был scripted
 * fallback на мат — не релевантен для LLM-контекста). Также приводит тип
 * к `ChatHistoryEntry` без служебного поля `sanitized`.
 */
function buildCleanHistory(messages: readonly ChatMessage[]): ChatHistoryEntry[] {
  const out: ChatHistoryEntry[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i]!;
    if (m.sanitized) {
      // Пропускаем этот user и следующий assistant (если он есть).
      const next = messages[i + 1];
      if (next && next.role === 'assistant') i += 1;
      continue;
    }
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

export function AnimalDetailScreen({ animalId }: Props) {
  const router = useRouter();
  const query = useZooData();
  const tts = useService('speechSynthesis');
  const progress = useService('progressApi');
  const localUnlocked = useService('localUnlocked');
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
  const [history, setHistory] = useState<readonly ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef<ChatMessage[]>([]);
  historyRef.current = [...history];
  const scrollRef = useRef<ScrollView | null>(null);
  // Зеркалим sessionId в ref, чтобы cleanup-коллбэк useEffect с устаревшей
  // реактивной переменной всё равно видел актуальное значение и мог закрыть сессию.
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!animal) return;
    let cancelled = false;
    progress
      .startSession({ gameId: 'zoo' })
      .then((s) => {
        if (!cancelled) {
          setSessionId(s.id);
          sessionIdRef.current = s.id;
        }
      })
      .catch(() => {
        /* graceful */
      });
    void localUnlocked.unlock(animal.id).catch(() => {
      /* non-fatal */
    });
    progress.unlockAnimal(animal.id).catch(() => {
      /* graceful */
    });
    return () => {
      cancelled = true;
      const sid = sessionIdRef.current;
      if (sid) {
        progress.endSession({ sessionId: sid }).catch(() => {
          /* graceful */
        });
        sessionIdRef.current = null;
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

  useEffect(() => {
    if (!animal) return;
    const initial: ChatMessage[] = [{ role: 'assistant', content: animal.greeting }];
    setHistory(initial);
    speakReply(animal.greeting);
  }, [animal, speakReply]);

  const sendMessage = useCallback(
    async (rawUserText: string) => {
      if (!animal || !rawUserText.trim()) return;

      // Клиентская санитизация ДО добавления в bubble — если мат, подменяем на заглушку.
      const { safe, clean } = sanitizeUserMessage(rawUserText.trim());
      const userMessage: ChatMessage = { role: 'user', content: safe, sanitized: !clean };

      // Сохраняем snapshot истории ДО добавления нового сообщения — его шлём серверу.
      // Дополнительно фильтруем: отбрасываем санитизированные user-сообщения и следующий
      // за ними ассистентский ответ (сервер тогда отдал scripted fallback-реплику,
      // не связанную с реальным диалогом). Так LLM не путается в контексте.
      const cleanHistoryForServer = buildCleanHistory(historyRef.current);

      const nextHistory = [...historyRef.current, userMessage];
      setHistory(nextHistory);
      setIsThinking(true);
      triggerHaptic(clean ? 'light' : 'warning');

      const sid = sessionId;
      if (!sid) {
        setIsThinking(false);
        // Нет сессии — оффлайн fallback: повторяем greeting
        setHistory([
          ...nextHistory,
          { role: 'assistant', content: animal.greeting },
        ]);
        speakReply(animal.greeting);
        return;
      }

      try {
        // Отправляем на сервер ОРИГИНАЛЬНЫЙ текст (server сам модерирует);
        // у себя в UI показываем только санитизированный.
        const response = await llm.reply({
          sessionId: sid,
          animalId: animal.id,
          userText: rawUserText.trim(),
          history: cleanHistoryForServer.slice(-8),
        });
        setHistory([
          ...nextHistory,
          { role: 'assistant', content: response.reply },
        ]);
        speakReply(response.reply);
        triggerHaptic('success');
      } catch (err) {
        const scriptedPool = animal.scriptedReplies ?? [];
        // Индекс ДОЛЖЕН быть целым — делим на 2 и округляем вниз, иначе
        // arr[1.5] = undefined и в чат попадёт пустая реплика.
        const scripted =
          scriptedPool.length > 0
            ? scriptedPool[Math.floor(historyRef.current.length / 2) % scriptedPool.length]!
            : animal.greeting;
        setHistory([
          ...nextHistory,
          { role: 'assistant', content: scripted },
        ]);
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
  }, [history, isThinking]);

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

      {/* Сцена — фиксированная высота, небольшая */}
      <View style={styles.sceneWrap}>
        <AnimalScene asset={asset} animation="greet" width={220} height={180} />
      </View>

      {/* Чат — занимает всё оставшееся место, скроллится */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {history.map((m, i) => (
          <View
            key={i}
            style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAnimal]}
          >
            <Text
              style={[
                styles.bubbleText,
                m.role === 'user' && styles.bubbleUserText,
                m.sanitized && styles.bubbleSanitizedText,
              ]}
            >
              {m.content}
            </Text>
          </View>
        ))}
        {isThinking ? (
          <View style={[styles.bubble, styles.bubbleAnimal, styles.thinkingBubble]}>
            <TypingIndicator />
          </View>
        ) : null}
      </ScrollView>

      {/* Quick-кнопки — компактные */}
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
            <Text style={styles.quickText} numberOfLines={1}>
              {q}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Микрофон — самый низ */}
      <View style={styles.micZone}>
        {voice.available ? (
          <MicButton state={voice.micState} transcript={voice.transcript} onPress={voice.toggle} />
        ) : (
          <Text style={styles.voiceHint}>
            На этом устройстве голос не поддерживается. Выбери вопрос выше ↑
          </Text>
        )}
      </View>
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
    paddingVertical: theme.spacing.sm,
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
    paddingBottom: theme.spacing.sm,
  },
  chat: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  chatContent: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleAnimal: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 6,
  },
  thinkingBubble: {
    paddingVertical: theme.spacing.xs,
    minWidth: 60,
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
  bubbleSanitizedText: {
    fontStyle: 'italic',
    opacity: 0.9,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  quickBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickDisabled: {
    opacity: 0.5,
  },
  quickText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
  },
  micZone: {
    paddingBottom: theme.spacing.sm,
  },
  voiceHint: {
    padding: theme.spacing.md,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 13,
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
