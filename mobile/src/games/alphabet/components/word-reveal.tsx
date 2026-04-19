import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

function AnimatedLetter({ letter, index, highlighted }: { letter: string; index: number; highlighted: boolean }) {
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
      <Text style={[styles.letter, highlighted && styles.letterHighlighted]}>
        {letter.toUpperCase()}
      </Text>
    </AnimatedView>
  );
}

export function WordReveal({ letters, highlightIndex, onTap, hint }: WordRevealProps) {
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
    gap: 4,
  },
  letter: {
    fontSize: 96,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 110,
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
