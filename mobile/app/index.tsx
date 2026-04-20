import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gameRegistry } from '@/games/registry';
import { DailyQuestCard } from '@/shared/ui/daily-quest-card';
import { theme } from '@/shared/theme';

/**
 * Hub — главный экран: плитки игр + Зоопарк (коллекция открытых животных).
 */
export default function HubScreen() {
  const games = gameRegistry.list();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Играй и учись</Text>
        <Text style={styles.subtitle}>Выбери игру</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.daily}>
          <DailyQuestCard />
        </View>
        <View style={styles.row}>
          {games.map((item) => (
            <Link
              key={item.metadata.id}
              href={{ pathname: '/games/[gameId]', params: { gameId: item.metadata.id } }}
              asChild
            >
              <Pressable style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
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
            </Link>
          ))}

          <Link href="/zoo" asChild>
            <Pressable
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
          </Link>
        </View>

        <Link href="/settings" asChild>
          <Pressable style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}>
            <Text style={styles.settingsText}>⚙️ Настройки</Text>
          </Pressable>
        </Link>
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
    width: '48%',
    aspectRatio: 1,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  zooTile: {
    backgroundColor: '#D8F3DC',
  },
  tilePressed: {
    opacity: 0.85,
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
});
