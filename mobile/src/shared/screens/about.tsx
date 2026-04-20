import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export function AboutScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Назад</Text>
        </Pressable>
        <Text style={styles.title}>О приложении</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          90.games — открытый учебный проект, использующий свободные библиотеки и ассеты.
          Благодарим авторов ниже за их труд.
        </Text>
        {CREDITS.map((c) => (
          <View key={c.title} style={styles.credit}>
            <Text style={styles.creditTitle}>{c.title}</Text>
            <Text style={styles.creditMeta}>
              {c.author} · {c.license}
            </Text>
            {c.url ? <Text style={styles.creditUrl}>{c.url}</Text> : null}
          </View>
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
