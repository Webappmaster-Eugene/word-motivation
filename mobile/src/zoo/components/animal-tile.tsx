import { Pressable, StyleSheet, Text } from 'react-native';

import { contrastTextColor } from '@/shared/theme/contrast';
import { theme } from '@/shared/theme';

import type { ZooAnimal } from '../hooks/use-zoo-data';

interface AnimalTileProps {
  readonly animal: ZooAnimal;
  readonly onPress: () => void;
}

export function AnimalTile({ animal, onPress }: AnimalTileProps) {
  const locked = !animal.unlocked;
  const fg = locked ? theme.colors.textMuted : contrastTextColor(animal.color);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        animal.unlocked
          ? `${animal.title}, открыто, посещений ${animal.visits}`
          : `${animal.title}, ещё не открыт`
      }
      onPress={onPress}
      disabled={locked}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: locked ? theme.colors.border : animal.color },
        pressed && !locked && styles.pressed,
      ]}
    >
      <Text style={[styles.emoji, locked && styles.emojiLocked]}>
        {locked ? '❓' : animal.emoji}
      </Text>
      <Text
        style={[styles.title, { color: fg }, !locked && styles.titleShadow]}
        numberOfLines={1}
      >
        {locked ? '???' : animal.title}
      </Text>
      {animal.unlocked && animal.visits > 1 ? (
        <Text style={[styles.visits, { color: fg }]}>×{animal.visits}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 100,
    height: 120,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  emoji: {
    fontSize: 54,
    lineHeight: 62,
  },
  emojiLocked: {
    opacity: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleShadow: {
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  visits: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 12,
    fontWeight: '800',
  },
});
