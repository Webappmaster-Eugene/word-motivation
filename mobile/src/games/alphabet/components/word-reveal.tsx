import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/shared/theme';

interface WordRevealProps {
  readonly letters: readonly string[];
  readonly highlightIndex?: number;
  readonly onTap: () => void;
  readonly hint?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

// Эмпирическая ширина глифа жирного шрифта ≈ 0.62 от fontSize (+gap между букв).
// Рассчитываем fontSize так, чтобы слово всегда умещалось в ширину экрана с
// запасом на padding. Без этого длинные слова (СОБАКА, КОРОВА) обрезались
// справа на узких устройствах (~360dp).
const HORIZONTAL_PADDING = theme.spacing.xl * 2;
const LETTER_GAP = 4;
const GLYPH_RATIO = 0.62;
const MAX_LETTER_SIZE = 96;
const MIN_LETTER_SIZE = 40;

function computeLetterSize(lettersCount: number, availableWidth: number): number {
  if (lettersCount <= 0) return MAX_LETTER_SIZE;
  const gaps = Math.max(0, lettersCount - 1) * LETTER_GAP;
  const perGlyph = (availableWidth - gaps) / lettersCount;
  const fromWidth = perGlyph / GLYPH_RATIO;
  return Math.max(MIN_LETTER_SIZE, Math.min(MAX_LETTER_SIZE, Math.floor(fromWidth)));
}

function AnimatedLetter({
  letter,
  index,
  highlighted,
  fontSize,
}: {
  letter: string;
  index: number;
  highlighted: boolean;
  fontSize: number;
}) {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    translate.value = withDelay(index * 80, withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [index, opacity, translate]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <AnimatedView style={style}>
      <Text
        style={[
          styles.letter,
          { fontSize, lineHeight: Math.round(fontSize * 1.14) },
          highlighted && styles.letterHighlighted,
        ]}
      >
        {letter.toUpperCase()}
      </Text>
    </AnimatedView>
  );
}

export function WordReveal({ letters, highlightIndex, onTap, hint }: WordRevealProps) {
  const { width: screenWidth } = useWindowDimensions();
  const fontSize = useMemo(
    () => computeLetterSize(letters.length, screenWidth - HORIZONTAL_PADDING),
    [letters.length, screenWidth],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Слово ${letters.join('')}`}
      onPress={onTap}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        {letters.map((letter, idx) => (
          <AnimatedLetter
            key={`${idx}-${letter}`}
            letter={letter}
            index={idx}
            highlighted={highlightIndex === idx}
            fontSize={fontSize}
          />
        ))}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: LETTER_GAP,
  },
  letter: {
    fontWeight: '800',
    color: theme.colors.text,
  },
  letterHighlighted: {
    color: theme.colors.accent,
    textShadowColor: 'rgba(255,122,89,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  hint: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
