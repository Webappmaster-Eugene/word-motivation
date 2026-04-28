import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { kvStorage } from '@/services/storage/kv-storage';
import { theme } from '@/shared/theme';

const CONSENT_KEY = 'babyfunner.parent_consent.v1';

interface ConsentState {
  readonly acceptedAt: string; // ISO
  readonly version: 1;
}

interface ConsentGateProps {
  readonly children: React.ReactNode;
}

/**
 * Гейт на первом запуске: пока родитель не согласился с политикой —
 * приложение показывает короткую выжимку и кнопку «Согласен».
 * Значение хранится в kvStorage (SecureStore / localStorage).
 */
export function ConsentGate({ children }: ConsentGateProps) {
  const [loaded, setLoaded] = useState(false);
  const [consent, setConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    let cancelled = false;
    kvStorage
      .getJson<ConsentState>(CONSENT_KEY)
      .then((value) => {
        if (cancelled) return;
        setConsent(value);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showDetails, setShowDetails] = useState(false);

  const accept = async () => {
    const value: ConsentState = {
      acceptedAt: new Date().toISOString(),
      version: 1,
    };
    setConsent(value);
    await kvStorage.setJson(CONSENT_KEY, value).catch(() => {
      /* non-fatal: пусть пропустит экран, в худшем случае покажет снова */
    });
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  if (consent) {
    return <>{children}</>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>Прежде чем начать</Text>
        <Text style={styles.subtitle}>
          Пожалуйста, покажите этот экран родителю.
        </Text>

        <View style={styles.card}>
          <Bullet>
            Приложение <Text style={styles.bold}>не собирает</Text> персональные данные ребёнка:
            ни имени, ни email, ни телефона, ни адреса.
          </Bullet>
          <Bullet>
            Голос ребёнка обрабатывается <Text style={styles.bold}>только на устройстве</Text> и
            никуда не отправляется.
          </Bullet>
          <Bullet>
            Ответы «животных» генерирует ИИ. Перед показом они проходят <Text style={styles.bold}>двойную модерацию</Text>:
            блок-лист и фильтр языка.
          </Bullet>
          <Bullet>
            Прогресс сохраняется под случайным идентификатором. Его можно сбросить в настройках.
          </Bullet>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showDetails ? 'Скрыть подробности' : 'Показать подробности'}
          onPress={() => setShowDetails((v) => !v)}
          style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>
            {showDetails ? 'Скрыть подробности ↑' : 'Подробнее о данных ↓'}
          </Text>
        </Pressable>

        {showDetails ? (
          <View style={styles.details}>
            <Text style={styles.detailsTitle}>Какие данные и куда уходят</Text>
            <Text style={styles.detailsBody}>
              При первом запуске приложение создаёт случайный UUID-идентификатор и отправляет
              на сервер только его SHA-256 хэш (с секретным салтом). Сам UUID не покидает
              устройство.{'\n\n'}
              Текст сообщений «чата с животным» уходит на наш сервер, проходит модерацию,
              затем в OpenRouter (языковая модель). Ответ возвращается, модерируется повторно
              и показывается ребёнку. Логи обезличены.{'\n\n'}
              Голос ребёнка не покидает устройство. Распознавание происходит в браузере
              (Web Speech API) или локально на Android. Наружу уходит только распознанный
              текст, если ребёнок сам нажал кнопку микрофона.{'\n\n'}
              Полную политику вы сможете открыть в «Настройки → Конфиденциальность» после
              согласия. Отозвать согласие и удалить прогресс можно там же.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Согласен с условиями"
          onPress={() => void accept()}
          style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}
        >
          <Text style={styles.acceptText}>Я согласен(на) 👍</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    lineHeight: 72,
    marginTop: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bullet: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  bulletDot: {
    fontSize: 18,
    color: theme.colors.accent,
    fontWeight: '800',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
  linkBtn: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  linkText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  acceptBtn: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  details: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: '#F5ECD9',
    gap: theme.spacing.sm,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsBody: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
});

export const __testing = { CONSENT_KEY };
