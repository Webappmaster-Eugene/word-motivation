import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/shared/theme';

interface StarsBannerProps {
  readonly count: number; // 1..3
  readonly total?: number;
}

const STARS_TOTAL = 3;
const AnimatedText = Animated.createAnimatedComponent(Text);

function Star({ filled, index }: { filled: boolean; index: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      index * 180,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
    );
    scale.value = withDelay(
      index * 180,
      withSequence(
        withTiming(1.3, { duration: 280, easing: Easing.out(Easing.back(1.6)) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
  }, [index, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedText style={[styles.star, filled ? styles.starFilled : styles.starEmpty, style]}>
      {filled ? '⭐' : '☆'}
    </AnimatedText>
  );
}

export function StarsBanner({ count, total }: StarsBannerProps) {
  const safe = Math.max(0, Math.min(STARS_TOTAL, Math.round(count)));
  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={`Получено звёзд: ${safe}`}>
      <View style={styles.row}>
        {Array.from({ length: STARS_TOTAL }, (_, i) => (
          <Star key={i} index={i} filled={i < safe} />
        ))}
      </View>
      {typeof total === 'number' ? (
        <Text style={styles.total}>Всего: {total} ⭐</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  star: {
    fontSize: 44,
    lineHeight: 52,
  },
  starFilled: {
    color: '#FFC107',
  },
  starEmpty: {
    color: theme.colors.border,
  },
  total: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
});
