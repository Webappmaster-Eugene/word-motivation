import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { navigateHome } from '@/shared/ui/nav';
import { theme } from '@/shared/theme';

interface Credit {
  readonly title: string;
  readonly license: string;
  readonly author: string;
  readonly url?: string;
}

const CREDITS: readonly Credit[] = [
  {
    title: 'Expo SDK 52 / React Native 0.76',
    license: 'MIT',
    author: 'Expo & Meta',
    url: 'https://expo.dev',
  },
  {
    title: 'XState v5',
    license: 'MIT',
    author: 'Stately.ai',
    url: 'https://xstate.js.org',
  },
  {
    title: '@shopify/react-native-skia',
    license: 'MIT',
    author: 'Shopify',
    url: 'https://shopify.github.io/react-native-skia',
  },
  {
    title: 'react-native-reanimated',
    license: 'MIT',
    author: 'Software Mansion',
    url: 'https://docs.swmansion.com/react-native-reanimated',
  },
  {
    title: '@tanstack/react-query',
    license: 'MIT',
    author: 'TanStack',
    url: 'https://tanstack.com/query',
  },
  {
    title: 'Expo Router, expo-speech, expo-haptics, expo-secure-store',
    license: 'MIT',
    author: 'Expo',
    url: 'https://docs.expo.dev',
  },
  {
    title: 'Quaternius — Ultimate Animated Animals (будущий 3D-пак)',
    license: 'CC0',
    author: 'Quaternius',
    url: 'https://quaternius.com',
  },
  {
    title: 'Poly Pizza / Sketchfab CC0',
    license: 'CC0 / CC-BY',
    author: 'различные авторы (см. метаданные модели)',
    url: 'https://poly.pizza',
  },
  {
    title: 'Vosk (offline ASR — планируется в M3.5)',
    license: 'Apache-2.0',
    author: 'Alpha Cephei',
    url: 'https://alphacephei.com/vosk',
  },
];

const AUTHOR_URL = 'https://nadtocheev.ru';

function openLink(url: string): void {
  void Linking.openURL(url).catch(() => {
    /* на web Linking.openURL работает через window.open; любая ошибка — проглатываем */
  });
}

export function AboutScreen() {
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
        <Text style={styles.title}>О приложении</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.authorCard}>
          <Text style={styles.authorLabel}>АВТОР</Text>
          <Text style={styles.authorName}>Иван Надточеев</Text>
          <Text style={styles.authorBio}>
            Создаю обучающие игры и инструменты для детей и взрослых. Если нашли баг
            или хотите предложить новую игру — пишите.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Перейти на ${AUTHOR_URL}`}
            onPress={() => openLink(AUTHOR_URL)}
            style={({ pressed }) => [styles.authorLink, pressed && styles.authorLinkPressed]}
          >
            <Text style={styles.authorLinkText}>nadtocheev.ru →</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>Благодарности</Text>
        <Text style={styles.intro}>
          90.games — открытый учебный проект, использующий свободные библиотеки и ассеты.
          Благодарим авторов ниже за их труд.
        </Text>
        {CREDITS.map((c) => (
          <Pressable
            key={c.title}
            accessibilityRole={c.url ? 'link' : undefined}
            accessibilityLabel={c.url ? `${c.title}. Открыть ${c.url}` : c.title}
            disabled={!c.url}
            onPress={c.url ? () => openLink(c.url!) : undefined}
            style={({ pressed }) => [styles.credit, pressed && c.url && styles.creditPressed]}
          >
            <Text style={styles.creditTitle}>{c.title}</Text>
            <Text style={styles.creditMeta}>
              {c.author} · {c.license}
            </Text>
            {c.url ? <Text style={styles.creditUrl}>{c.url}</Text> : null}
          </Pressable>
        ))}
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
    gap: theme.spacing.md,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  authorCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: theme.spacing.md,
  },
  authorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  authorName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  authorBio: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  authorLink: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
  },
  authorLinkPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  authorLinkText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  intro: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  credit: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  creditPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  creditMeta: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  creditUrl: {
    fontSize: 13,
    color: theme.colors.accent,
  },
});
