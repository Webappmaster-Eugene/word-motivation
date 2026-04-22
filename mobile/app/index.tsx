import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gameRegistry } from '@/games/registry';
import { DailyQuestCard } from '@/shared/ui/daily-quest-card';
import { theme } from '@/shared/theme';

/**
 * Hub — главный экран: плитки игр + Зоопарк (коллекция открытых животных)
 * + футер с ссылками на юридические разделы.
 *
 * На web контент ограничен `maxWidth: 720`, чтобы на десктопе не «растекался»
 * по всей ширине экрана и карточки имели комфортный визуальный вес.
 */
export default function HubScreen() {
  const router = useRouter();
  const games = gameRegistry.list();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>Играй и учись</Text>
            <Text style={styles.subtitle}>Выбери игру или зайди в гости к животным</Text>
          </View>

          <View style={styles.daily}>
            <DailyQuestCard />
          </View>

          <View style={styles.row}>
            {games.map((item) => (
              <Pressable
                key={item.metadata.id}
                accessibilityRole="button"
                accessibilityLabel={`Запустить игру: ${item.metadata.title}`}
                onPress={() =>
                  router.push({
                    pathname: '/games/[gameId]',
                    params: { gameId: item.metadata.id },
                  })
                }
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              >
                <Text style={styles.tileEmoji}>🔤</Text>
                <View style={styles.tileBottom}>
                  <Text style={styles.tileTitle}>{item.metadata.title}</Text>
                  {item.metadata.subtitle ? (
                    <Text style={styles.tileSubtitle}>{item.metadata.subtitle}</Text>
                  ) : null}
                  <Text style={styles.tileAge}>
                    {item.metadata.minAge}–{item.metadata.maxAge} лет
                  </Text>
                </View>
              </Pressable>
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Открыть Зоопарк"
              onPress={() => router.push('/zoo')}
              style={({ pressed }) => [
                styles.tile,
                styles.zooTile,
                pressed && styles.tilePressed,
              ]}
            >
              <Text style={styles.tileEmoji}>🏞️</Text>
              <View style={styles.tileBottom}>
                <Text style={styles.tileTitle}>Зоопарк</Text>
                <Text style={styles.tileSubtitle}>Твои открытые животные</Text>
                <Text style={styles.tileAge}>любой возраст</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть настройки"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}
          >
            <Text style={styles.settingsText}>⚙️ Настройки</Text>
          </Pressable>

          <View style={styles.footer}>
            <FooterLink label="О проекте" onPress={() => router.push('/about')} />
            <Text style={styles.footerDot}>·</Text>
            <FooterLink label="Конфиденциальность" onPress={() => router.push('/privacy')} />
            <Text style={styles.footerDot}>·</Text>
            <FooterLink label="Условия" onPress={() => router.push('/terms')} />
            <Text style={styles.footerDot}>·</Text>
            <FooterLink label="Контакты" onPress={() => router.push('/contacts')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.footerLink}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  inner: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  daily: {
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 160,
    aspectRatio: 1,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  zooTile: {
    backgroundColor: '#D8F3DC',
  },
  tilePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  tileEmoji: {
    fontSize: 56,
    lineHeight: 62,
  },
  tileBottom: {
    gap: 2,
  },
  tileTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tileSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  tileAge: {
    fontSize: 12,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
    fontWeight: '600',
  },
  settingsLink: {
    marginTop: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  settingsText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  footer: {
    marginTop: theme.spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerLink: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  footerDot: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
