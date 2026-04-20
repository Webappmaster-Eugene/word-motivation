import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAlphabetContent } from '@/games/alphabet/hooks/use-alphabet-content';
import { pickDailyAnimal, todayIsoDate } from '@/services/daily-quest/daily-quest';
import { theme } from '@/shared/theme';

/**
 * Мини-карточка «Сегодняшнее животное» для хаба. Детерминированный выбор:
 * в один день — одно животное для всех. Переход прямо на animal-detail.
 */
export function DailyQuestCard() {
  const query = useAlphabetContent();

  const daily = useMemo(() => {
    if (!query.data) return null;
    const animals = Object.values(query.data.animals);
    return pickDailyAnimal(animals, todayIsoDate());
  }, [query.data]);

  if (!daily) return null;

  return (
    <Link href={{ pathname: '/zoo/[animalId]', params: { animalId: daily.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Задание дня: ${daily.title}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: daily.color },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.textCol}>
          <Text style={styles.label}>Сегодня в гостях</Text>
          <Text style={styles.title}>{daily.title}</Text>
          <Text style={styles.hint}>Навести → бонус ⭐</Text>
        </View>
        <Text style={styles.emoji}>{daily.emoji}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hint: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  emoji: {
    fontSize: 68,
    lineHeight: 76,
    marginLeft: theme.spacing.md,
  },
});
