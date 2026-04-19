import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/shared/theme';

interface HintBannerProps {
  readonly message: string;
  readonly onDismiss: () => void;
  readonly retries: number;
  readonly maxRetries: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HintBanner({ message, onDismiss, retries, maxRetries }: HintBannerProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const attemptsLeft = Math.max(maxRetries - retries, 0);

  return (
    <AnimatedPressable accessibilityRole="button" onPress={onDismiss} style={[styles.wrap, style]}>
      <Text style={styles.title}>Подсказка</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.meta}>
        {attemptsLeft > 0 ? `Осталось попыток: ${attemptsLeft}. Нажми, чтобы попробовать ещё.` : 'Идём дальше.'}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.warning,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  message: {
    marginTop: theme.spacing.xs,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 24,
  },
  meta: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.8,
  },
});
