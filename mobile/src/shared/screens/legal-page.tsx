import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { navigateHome } from '@/shared/ui/nav';
import { theme } from '@/shared/theme';

export interface LegalSection {
  readonly title: string;
  readonly body: string;
}

interface LegalPageProps {
  readonly title: string;
  readonly lastUpdated: string;
  readonly intro?: string;
  readonly sections: readonly LegalSection[];
  readonly footer?: ReactNode;
}

/**
 * Переиспользуемый шаблон для юридических/контентных страниц (privacy, terms,
 * offer, contacts). Единый стиль + максимальная ширина 720px на web —
 * юридический текст на full-width десктопе читается мучительно.
 */
export function LegalPage({ title, lastUpdated, intro, sections, footer }: LegalPageProps) {
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
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Последнее обновление: {lastUpdated}</Text>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
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
  lastUpdated: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionBody: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  footer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});
