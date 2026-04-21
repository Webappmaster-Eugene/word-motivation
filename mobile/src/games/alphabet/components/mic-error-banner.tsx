import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/shared/theme';

interface MicErrorBannerProps {
  readonly message: string;
  readonly onDismiss: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Баннер ошибки микрофона. Визуально отличается от HintBanner (розовый вместо жёлтого),
 * чтобы ребёнок понял: это не подсказка по букве, а сбой ввода. Тап — закрыть и
 * продолжить игру кнопками (ASR попробует ещё раз при следующем запуске).
 */
export function MicErrorBanner({ message, onDismiss }: MicErrorBannerProps) {
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

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Закрыть сообщение об ошибке микрофона"
      onPress={onDismiss}
      style={[styles.wrap, style]}
    >
      <Text style={styles.title}>Микрофон</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.meta}>Нажми, чтобы продолжить кнопками.</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: '#FFE3E3',
    borderWidth: 1,
    borderColor: '#F5B5B5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B42318',
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
