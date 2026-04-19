import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BIOME_RU } from '@/games/alphabet/content/types';
import { theme } from '@/shared/theme';

import { AnimalTile } from './components/animal-tile';
import { useZooData } from './hooks/use-zoo-data';

export default function ZooScreen() {
  const router = useRouter();
  const query = useZooData();

  const unlockedCount = query.data
    ? query.data.reduce((sum, g) => sum + g.animals.filter((a) => a.unlocked).length, 0)
    : 0;
  const totalCount = query.data
    ? query.data.reduce((sum, g) => sum + g.animals.length, 0)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Домой</Text>
        </Pressable>
        <Text style={styles.title}>Зоопарк</Text>
        <View style={styles.back} />
      </View>

      {query.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>Открываем ворота…</Text>
        </View>
      ) : (
        <>
          <Text style={styles.progress}>
            Открыто {unlockedCount} из {totalCount}
          </Text>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {query.data?.map((group) => (
              <View key={group.biome} style={styles.biomeSection}>
                <Text style={styles.biomeTitle}>
                  {group.biome === 'UNKNOWN' ? 'Другие' : BIOME_RU[group.biome]}
                </Text>
                <View style={styles.grid}>
                  {group.animals.map((animal) => (
                    <AnimalTile
                      key={animal.id}
                      animal={animal}
                      onPress={() =>
                        router.push({ pathname: '/zoo/[animalId]', params: { animalId: animal.id } })
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}
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
    color: theme.colors.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progress: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loaderText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  biomeSection: {
    gap: theme.spacing.md,
  },
  biomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
});
