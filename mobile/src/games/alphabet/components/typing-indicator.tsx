import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/shared/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

function Dot({ delay }: { delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.55,
    transform: [{ translateY: -progress.value * 4 }],
  }));

  return <AnimatedView style={[styles.dot, style]} />;
}

/**
 * Пульсирующие точки «…» — индикатор что ассистент печатает/думает.
 * Вставляется как «assistant-bubble» в history.
 */
export function TypingIndicator() {
  return (
    <View style={styles.wrap} accessibilityLabel="Животное думает">
      <Dot delay={0} />
      <Dot delay={140} />
      <Dot delay={280} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
});
