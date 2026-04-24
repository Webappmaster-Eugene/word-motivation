import { useCallback, useEffect, useRef, useState } from 'react';
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

import { useService } from '@/services/di/provider';
import type { ChatHistoryEntry } from '@/services/llm-chat/llm-chat';
import { theme } from '@/shared/theme';

import type { AnimalInfo } from '../content/types';

import { TypingIndicator } from './typing-indicator';

interface AnimalChatProps {
  readonly sessionId: string | null;
  readonly animal: AnimalInfo;
}

const MAX_INPUT_LENGTH = 500;
// Сервер принимает максимум 20 сообщений истории (chatReplySchema).
// Режем с запасом: -2 чтобы оставить место новому user-сообщению и его ответу.
const MAX_HISTORY_FOR_REQUEST = 18;

// Пресет вопросов — те же что в AnimalDetailScreen, для визуальной
// согласованности между двумя чат-экранами.
const QUICK_QUESTIONS: readonly string[] = [
  'Что ты любишь кушать?',
  'Где ты живёшь?',
  'Что ты умеешь?',
  'Расскажи про себя',
];

type LocalMessage =
  | { readonly kind: 'greeting'; readonly content: string }
  | (ChatHistoryEntry & { readonly kind: 'chat' });

export function AnimalChat({ sessionId, animal }: AnimalChatProps) {
  const llm = useService('llmChat');
  const tts = useService('speechSynthesis');

  const [messages, setMessages] = useState<readonly LocalMessage[]>(() => [
    { kind: 'greeting', content: animal.greeting },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, sending]);

  const canSend =
    !sending && input.trim().length > 0 && input.trim().length <= MAX_INPUT_LENGTH && sessionId !== null;

  const sendText = useCallback(
    async (text: string) => {
      if (!text || sending) return;
      if (!sessionId) {
        setError('Сессия ещё не готова, подожди секунду и попробуй снова.');
        return;
      }

      const userMsg: LocalMessage = { kind: 'chat', role: 'user', content: text };
      const priorHistory: ChatHistoryEntry[] = messages
        .filter((m): m is LocalMessage & { kind: 'chat' } => m.kind === 'chat')
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setError(null);
      setSending(true);

      try {
        const response = await llm.reply({
          sessionId,
          animalId: animal.id,
          userText: text,
          history: priorHistory.slice(-MAX_HISTORY_FOR_REQUEST),
        });
        const assistantMsg: LocalMessage = {
          kind: 'chat',
          role: 'assistant',
          content: response.reply,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        void tts.speak(response.reply);
      } catch (err) {
        const friendly =
          err instanceof Error && err.message.includes('429')
            ? 'Слишком много сообщений подряд. Подожди немного.'
            : 'Не получилось отправить. Проверь интернет и попробуй снова.';
        setError(friendly);
      } finally {
        setSending(false);
      }
    },
    [sending, sessionId, messages, llm, animal.id, tts],
  );

  const handleSubmit = () => {
    void sendText(input.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, idx) => {
          const isUser = msg.kind === 'chat' && msg.role === 'user';
          return (
            <View
              key={`${idx}-${msg.kind}`}
              style={[
                styles.bubbleRow,
                isUser ? styles.bubbleRowUser : styles.bubbleRowAnimal,
              ]}
              accessibilityLabel={isUser ? 'Ты' : animal.title}
            >
              {!isUser ? (
                <Text style={styles.animalAvatar} accessibilityElementsHidden>
                  {animal.emoji}
                </Text>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          );
        })}
        {sending ? (
          <View style={[styles.bubbleRow, styles.bubbleRowAnimal]}>
            <Text style={styles.animalAvatar} accessibilityElementsHidden>
              {animal.emoji}
            </Text>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
              <TypingIndicator />
            </View>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBubble} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Чипы-готовых-вопросов — помогают ребёнку начать диалог без клавиатуры */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickScroll}
        contentContainerStyle={styles.quickContent}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_QUESTIONS.map((q) => (
          <Pressable
            key={q}
            disabled={sending}
            onPress={() => void sendText(q)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.quickChip,
              pressed && !sending && styles.quickPressed,
              sending && styles.quickDisabled,
            ]}
          >
            <Text style={styles.quickChipText} numberOfLines={1}>
              {q}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={`Напиши ${animal.title.toLowerCase()}…`}
          placeholderTextColor={theme.colors.textMuted}
          editable={!sending && sessionId !== null}
          maxLength={MAX_INPUT_LENGTH}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          blurOnSubmit
          accessibilityLabel="Поле ввода сообщения"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Отправить"
          disabled={!canSend}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.sendBtn,
            !canSend && styles.sendBtnDisabled,
            pressed && canSend && styles.sendBtnPressed,
          ]}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
  bubbleAssistant: {
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
    fontSize: 17,
    lineHeight: 23,
    color: theme.colors.text,
  },
  bubbleTextUser: {
    color: '#fff',
    fontWeight: '600',
  },
  errorBubble: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.sm,
    backgroundColor: '#FFE4E1',
  },
  errorText: {
    color: '#8B2E1A',
    fontSize: 14,
    fontWeight: '600',
  },
  quickScroll: {
    flexGrow: 0,
  },
  quickContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  quickChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  quickDisabled: {
    opacity: 0.5,
  },
  quickChipText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
  },
  inputRow: {
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
});
