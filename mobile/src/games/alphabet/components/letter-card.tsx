import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/shared/theme';

interface LetterCardProps {
  readonly letter: string;
  readonly onTap: () => void;
  readonly highlighted?: boolean;
  readonly disabled?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const BASE_CARD_WIDTH = 240;
const BASE_CARD_HEIGHT = 280;
const BASE_LETTER_FONT = 180;
const MIN_CARD_WIDTH = 180;
const MAX_CARD_WIDTH = 320;
const HORIZONTAL_PADDING = 64;

export function LetterCard({ letter, onTap, highlighted = false, disabled = false }: LetterCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.max(
    MIN_CARD_WIDTH,
    Math.min(MAX_CARD_WIDTH, screenWidth - HORIZONTAL_PADDING),
  );
  const cardHeight = Math.round((cardWidth / BASE_CARD_WIDTH) * BASE_CARD_HEIGHT);
  const letterFont = Math.round((cardWidth / BASE_CARD_WIDTH) * BASE_LETTER_FONT);
  const letterLine = Math.round(letterFont * 1.11);

  useEffect(() => {
    opacity.value = 0;
    scale.value = 0.8;
    opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    scale.value = withDelay(
      80,
      withSequence(
        withTiming(1.08, { duration: 240, easing: Easing.out(Easing.back(1.4)) }),
        withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [letter, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView style={[styles.wrap, animStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Буква ${letter.toUpperCase()}`}
        onPress={onTap}
        disabled={disabled}
        style={({ pressed }) => [
          styles.card,
          { width: cardWidth, height: cardHeight },
          highlighted && styles.cardHighlighted,
          pressed && !disabled && styles.cardPressed,
          disabled && styles.cardDisabled,
        ]}
      >
        <Text
          style={[
            styles.letter,
            { fontSize: letterFont, lineHeight: letterLine },
            highlighted && styles.letterHighlighted,
          ]}
        >
          {letter.toUpperCase()}
        </Text>
        <Text style={styles.letterSmall}>{letter.toLowerCase()}</Text>
      </Pressable>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    borderWidth: 4,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHighlighted: {
    borderColor: theme.colors.accent,
    backgroundColor: '#FFF8E8',
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.08,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  letter: {
    fontWeight: '800',
    color: theme.colors.text,
  },
  letterHighlighted: {
    color: theme.colors.accent,
  },
  letterSmall: {
    fontSize: 28,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
