import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { navigateHome } from '@/shared/ui/nav';
import { theme } from '@/shared/theme';

interface ContactLine {
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}

const SUPPORT_EMAIL = 'support@nadtocheev.ru';
const AUTHOR_URL = 'https://nadtocheev.ru';

const LINES: readonly ContactLine[] = [
  { label: 'Поддержка', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { label: 'Автор', value: 'Евгений Надточеев' },
  { label: 'Сайт автора', value: 'nadtocheev.ru', href: AUTHOR_URL },
];

function openLink(url: string): void {
  void Linking.openURL(url).catch(() => {
    /* некоторые браузеры блокируют mailto:, проглатываем */
  });
}

export function ContactsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => (router.canGoBack() ? router.back() : navigateHome(router))}
          style={styles.back}
        >
          <Text style={styles.backText}>← Назад</Text>
        </Pressable>
        <Text style={styles.title}>Контакты</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Мы открыты к фидбеку: баги, предложения новых игр, сотрудничество — пишите.
          Стараемся отвечать в течение 2 рабочих дней.
        </Text>

        <View style={styles.block}>
          {LINES.map((line) => (
            <View key={line.label} style={styles.line}>
              <Text style={styles.lineLabel}>{line.label}</Text>
              {line.href ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${line.label}: ${line.value}`}
                  onPress={() => openLink(line.href!)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.lineLinkValue}>{line.value}</Text>
                </Pressable>
              ) : (
                <Text style={styles.lineValue}>{line.value}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Реквизиты для оферты</Text>
          <Text style={styles.blockBody}>
            Физическое лицо: Евгений Надточеев. Все юридические документы — в разделе «Настройки».
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Безопасность детей</Text>
          <Text style={styles.blockBody}>
            Если вы заметили контент, который не подходит для детей, или сбой модерации — напишите
            сразу на {SUPPORT_EMAIL}. Ответ в течение 24 часов, при критической проблеме —
            немедленная блокировка соответствующей функции.
          </Text>
        </View>
      </ScrollView>
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
    minWidth: 80,
    paddingVertical: theme.spacing.sm,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  intro: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  block: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  blockBody: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  lineLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  lineValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  lineLinkValue: {
    fontSize: 15,
    color: theme.colors.accent,
    fontWeight: '600',
  },
});
