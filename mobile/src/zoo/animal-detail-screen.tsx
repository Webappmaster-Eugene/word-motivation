import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimalScene } from '@/games/alphabet/components/animal-scene';
import { MicButton } from '@/games/alphabet/components/mic-button';
import { TypingIndicator } from '@/games/alphabet/components/typing-indicator';
import { useVoiceInput } from '@/games/alphabet/hooks/use-voice-input';
import type { AnimalInfo } from '@/games/alphabet/content/types';
import type { AnimalSceneAsset } from '@/services/animal-scene/types';
import { useService } from '@/services/di/provider';
import type { ChatHistoryEntry } from '@/services/llm-chat/llm-chat';
import { SPEECH_PRESETS } from '@/services/speech-synthesis/types';
import { sanitizeUserMessage } from '@/shared/client-moderation';
import { contrastSecondaryColor, contrastTextColor } from '@/shared/theme/contrast';
import { navigateHome } from '@/shared/ui/nav';
import { theme } from '@/shared/theme';

import { useZooData } from './hooks/use-zoo-data';
import { AnimalInteractionPanel } from './components/animal-interaction-panel';

type ActiveTab = 'chat' | 'play';

interface Props {
  readonly animalId: string;
}

const QUICK_QUESTIONS: readonly string[] = [
  'Что ты любишь кушать?',
  'Где ты живёшь?',
  'Что ты умеешь?',
  'Расскажи про себя',
];

const MAX_INPUT_LENGTH = 500;
const MAX_HISTORY_FOR_REQUEST = 18;

type ChatMessage = ChatHistoryEntry & { readonly sanitized?: boolean; readonly id: string };

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
 * Отбрасывает санитизированные user-сообщения и следующий за ними ассистентский
 * ответ — это были scripted fallback-реплики на мат, не связанные с реальным
 * диалогом. Так LLM не путается в контексте.
 */
function buildCleanHistory(messages: readonly ChatMessage[]): ChatHistoryEntry[] {
  const out: ChatHistoryEntry[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i]!;
    if (m.sanitized) {
      const next = messages[i + 1];
      if (next && next.role === 'assistant') i += 1;
      continue;
    }
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

let msgIdCounter = 0;
function nextMessageId(): string {
  msgIdCounter += 1;
  return `m${msgIdCounter}`;
}

/**
 * Экран-чат с животным. Архитектура:
 *
 *  - Hero-баннер вверху: сцена с животным + кнопка «назад» + индикатор «онлайн».
 *    Фон баннера — цвет животного, с динамическим контрастом текста.
 *  - Список сообщений — как в мессенджере: bubble слева от животного, справа от
 *    ребёнка, с хвостиками (borderRadius асимметрия).
 *  - Панель быстрых вопросов — скроллится горизонтально (помещает 4–5 чипов
 *    даже на узком экране 320px).
 *  - Input + mic-кнопка внизу, с KeyboardAvoidingView.
 *
 * На web контент ограничен шириной 760px: без этого чат растекался по всему
 * монитору и выглядел сломанным.
 */
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

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<readonly ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [input, setInput] = useState('');
  const historyRef = useRef<ChatMessage[]>([]);
  historyRef.current = [...history];
  const scrollRef = useRef<ScrollView | null>(null);
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
      void tts.speak(`${animal.title}! ${text}`, SPEECH_PRESETS.animalReply);
    },
    [animal, tts],
  );

  useEffect(() => {
    if (!animal) return;
    const initial: ChatMessage = {
      id: nextMessageId(),
      role: 'assistant',
      content: animal.greeting,
    };
    setHistory([initial]);
    speakReply(animal.greeting);
  }, [animal, speakReply]);

  const sendMessage = useCallback(
    async (rawUserText: string) => {
      if (!animal || !rawUserText.trim()) return;

      const { safe, clean } = sanitizeUserMessage(rawUserText.trim());
      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'user',
        content: safe,
        sanitized: !clean,
      };

      const cleanHistoryForServer = buildCleanHistory(historyRef.current);

      const nextHistory = [...historyRef.current, userMessage];
      setHistory(nextHistory);
      setIsThinking(true);
      triggerHaptic(clean ? 'light' : 'warning');

      const sid = sessionId;
      if (!sid) {
        setIsThinking(false);
        setHistory([
          ...nextHistory,
          { id: nextMessageId(), role: 'assistant', content: animal.greeting },
        ]);
        speakReply(animal.greeting);
        return;
      }

      try {
        const response = await llm.reply({
          sessionId: sid,
          animalId: animal.id,
          userText: rawUserText.trim(),
          history: cleanHistoryForServer.slice(-MAX_HISTORY_FOR_REQUEST),
        });
        setHistory([
          ...nextHistory,
          { id: nextMessageId(), role: 'assistant', content: response.reply },
        ]);
        speakReply(response.reply);
        triggerHaptic('success');
      } catch (err) {
        const scriptedPool = animal.scriptedReplies ?? [];
        const scripted =
          scriptedPool.length > 0
            ? scriptedPool[Math.floor(historyRef.current.length / 2) % scriptedPool.length]!
            : animal.greeting;
        setHistory([
          ...nextHistory,
          { id: nextMessageId(), role: 'assistant', content: scripted },
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

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput('');
    void sendMessage(text);
  };

  if (!animal) {
    if (query.isLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Text style={styles.loadingText}>Открываем вольер…</Text>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.notFoundTitle}>Животное не найдено</Text>
          <Text style={styles.notFoundHint}>
            Может, оно ещё ждёт встречи в игре «Алфавит»?
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="На главную"
            onPress={() => navigateHome(router)}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnText}>На главную</Text>
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

  const heroFg = contrastTextColor(animal.color);
  const heroSecondaryFg = contrastSecondaryColor(animal.color);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.kbRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inner}>
          <View style={[styles.hero, { backgroundColor: animal.color }]}>
            <View style={styles.heroHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Назад"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/zoo'))}
                style={({ pressed }) => [styles.heroBack, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.heroBackText, { color: heroFg }]}>← Зоопарк</Text>
              </Pressable>
              <View style={styles.heroStatus}>
                <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={[styles.heroStatusText, { color: heroSecondaryFg }]}>в сети</Text>
              </View>
            </View>
            <View style={styles.heroScene}>
              <AnimalScene
                asset={asset}
                animation="greet"
                width={200}
                height={160}
                showTitle={false}
              />
            </View>
            <Text style={[styles.heroTitle, { color: heroFg }]}>{animal.title}</Text>
            <Text style={[styles.heroSubtitle, { color: heroSecondaryFg }]}>
              {activeTab === 'chat' ? 'Задавай вопросы — отвечу, как смогу!' : 'Нажимай кнопки и играй!'}
            </Text>
          </View>

          {/* Переключатель табов */}
          <View style={styles.tabBar}>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Чат с животным"
              accessibilityState={{ selected: activeTab === 'chat' }}
              onPress={() => setActiveTab('chat')}
              style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'chat' && styles.tabBtnTextActive]}>
                💬 Чат
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Играть с животным"
              accessibilityState={{ selected: activeTab === 'play' }}
              onPress={() => setActiveTab('play')}
              style={[styles.tabBtn, activeTab === 'play' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'play' && styles.tabBtnTextActive]}>
                🎮 Играть
              </Text>
            </Pressable>
          </View>

          {activeTab === 'play' ? (
            <AnimalInteractionPanel animal={animal} />
          ) : null}

          {activeTab === 'chat' ? (
            <>
            <ScrollView
            ref={scrollRef}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {history.map((m) => {
              const isUser = m.role === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleRow,
                    isUser ? styles.bubbleRowUser : styles.bubbleRowAnimal,
                  ]}
                >
                  {!isUser ? (
                    <Text style={styles.animalAvatar} accessibilityElementsHidden>
                      {animal.emoji}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.bubbleUser : styles.bubbleAnimal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isUser && styles.bubbleUserText,
                        m.sanitized && styles.bubbleSanitizedText,
                      ]}
                    >
                      {m.content}
                    </Text>
                  </View>
                </View>
              );
            })}
            {isThinking ? (
              <View style={[styles.bubbleRow, styles.bubbleRowAnimal]}>
                <Text style={styles.animalAvatar} accessibilityElementsHidden>
                  {animal.emoji}
                </Text>
                <View style={[styles.bubble, styles.bubbleAnimal, styles.thinkingBubble]}>
                  <TypingIndicator />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickScroll}
            contentContainerStyle={styles.quickContent}
          >
            {QUICK_QUESTIONS.map((q) => (
              <Pressable
                key={q}
                disabled={isThinking}
                onPress={() => sendMessage(q)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.quickChip,
                  pressed && !isThinking && styles.pressed,
                  isThinking && styles.quickDisabled,
                ]}
              >
                <Text style={styles.quickChipText} numberOfLines={1}>
                  {q}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={`Напиши ${animal.title.toLowerCase()}…`}
              placeholderTextColor={theme.colors.textMuted}
              editable={!isThinking}
              maxLength={MAX_INPUT_LENGTH}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              blurOnSubmit
              accessibilityLabel="Поле ввода сообщения"
            />
            {voice.available ? (
              <View style={styles.micSlot}>
                <MicButton
                  state={voice.micState}
                  transcript={voice.transcript}
                  onPress={voice.toggle}
                />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Отправить"
              disabled={isThinking || !input.trim()}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.sendBtn,
                (!input.trim() || isThinking) && styles.sendBtnDisabled,
                pressed && input.trim() && !isThinking && styles.sendBtnPressed,
              ]}
            >
              <Text style={styles.sendBtnText}>→</Text>
            </Pressable>
          </View>
          {!voice.available ? (
            <Text style={styles.micHint}>
              Голос на этом устройстве не поддерживается — пиши текстом или выбирай вопросы выше.
            </Text>
          ) : null}
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  kbRoot: {
    flex: 1,
  },
  inner: {
    flex: 1,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    gap: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  heroHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBack: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  heroBackText: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroScene: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    maxWidth: '92%',
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  bubbleRowAnimal: {
    alignSelf: 'flex-start',
  },
  animalAvatar: {
    fontSize: 26,
    lineHeight: 30,
    width: 32,
    textAlign: 'center',
  },
  bubble: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 18,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleAnimal: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 6,
  },
  thinkingBubble: {
    paddingVertical: theme.spacing.sm + 2,
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
  quickScroll: {
    flexGrow: 0,
  },
  quickContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  quickChip: {
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
  quickChipText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.background,
    fontSize: 16,
    color: theme.colors.text,
  },
  micSlot: {
    // MicButton рендерит большую кнопку с transcript; в compact-панели берём
    // только её визуальную часть — но поскольку MicButton сам по себе сложный,
    // проще дать ему место с фиксированной шириной, а pills-transcript показывать
    // через отдельный hint. Пока — компактный wrap.
    minWidth: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  micHint: {
    padding: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  notFoundHint: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
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
