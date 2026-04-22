import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAlphabetContent } from '@/games/alphabet/hooks/use-alphabet-content';
import { pickDailyAnimal, todayIsoDate } from '@/services/daily-quest/daily-quest';
import { contrastSecondaryColor, contrastTextColor } from '@/shared/theme/contrast';
import { theme } from '@/shared/theme';

/**
 * Мини-карточка «Сегодняшнее животное» для хаба.
 *
 * Детерминированный выбор: в один день — одно животное для всех.
 * Переход — через `router.push` (прямой, без `Link asChild`), это исключает баг
 * с `asChild`+Pressable на web, из-за которого тап по карточке не срабатывал
 * (expo-router не всегда корректно пробрасывает onPress через `asChild` когда
 * у обёртки собственный press-state).
 *
 * Цвет текста — динамический (WCAG luminance), иначе на пастельных фонах
 * (#FFE4B5 и т.п.) белый заголовок был нечитаемым (см. img_3.png из task3).
 */
export function DailyQuestCard() {
  const router = useRouter();
  const query = useAlphabetContent();

  const daily = useMemo(() => {
    if (!query.data) return null;
    const animals = Object.values(query.data.animals);
    return pickDailyAnimal(animals, todayIsoDate());
  }, [query.data]);

  if (!daily) return null;

  const fg = contrastTextColor(daily.color);
  const fgSecondary = contrastSecondaryColor(daily.color);

  const onPress = () => {
    router.push({ pathname: '/zoo/[animalId]', params: { animalId: daily.id } });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Задание дня: ${daily.title}. Перейти к общению.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: daily.color },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: fgSecondary }]}>Сегодня в гостях</Text>
        <Text style={[styles.title, { color: fg }]}>{daily.title}</Text>
        <Text style={[styles.hint, { color: fgSecondary }]}>Нажми → бонус ⭐</Text>
      </View>
      <Text style={styles.emoji} accessibilityElementsHidden>
        {daily.emoji}
      </Text>
    </Pressable>
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
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    minHeight: 110,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  hint: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  emoji: {
    fontSize: 68,
    lineHeight: 76,
    marginLeft: theme.spacing.md,
  },
});
