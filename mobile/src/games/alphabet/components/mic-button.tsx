import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { sanitizeTranscript } from '@/shared/client-moderation';
import { theme } from '@/shared/theme';

export type MicState = 'idle' | 'listening' | 'processing' | 'unavailable';

interface MicButtonProps {
  readonly state: MicState;
  readonly onPress: () => void;
  readonly transcript?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * MicButton с 3 пульсирующими кольцами при записи, staggered-анимация,
 * показывает transcript ТОЛЬКО если в нём нет мата (через client-moderation).
 */
export function MicButton({ state, onPress, transcript }: MicButtonProps) {
  const ring0 = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    const rings = [ring0, ring1, ring2];
    // Все активные timer-id'ы — снимаем в cleanup, чтобы они не стреляли
    // после unmount / смены state → ring.value не прыгает обратно в 1.
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (state === 'listening') {
      rings.forEach((p, idx) => {
        p.value = 0;
        // Staggered-старт: кольца идут волной
        const id = setTimeout(() => {
          p.value = withRepeat(
            withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
            -1,
            false,
          );
        }, idx * 450);
        timers.push(id);
      });
      buttonScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      rings.forEach((p) => {
        cancelAnimation(p);
        p.value = withTiming(0, { duration: 160 });
      });
      cancelAnimation(buttonScale);
      buttonScale.value = withTiming(1, { duration: 160 });
    }
    return () => {
      for (const id of timers) clearTimeout(id);
      rings.forEach((p) => cancelAnimation(p));
      cancelAnimation(buttonScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const ring0Style = useAnimatedStyle(() => ({
    opacity: (1 - ring0.value) * 0.55,
    transform: [{ scale: 1 + ring0.value * 1.4 }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    opacity: (1 - ring1.value) * 0.55,
    transform: [{ scale: 1 + ring1.value * 1.4 }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: (1 - ring2.value) * 0.55,
    transform: [{ scale: 1 + ring2.value * 1.4 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const disabled = state === 'unavailable' || state === 'processing';
  const label =
    state === 'listening'
      ? 'Говори…'
      : state === 'processing'
        ? 'Думаю…'
        : state === 'unavailable'
          ? 'Нажми вопрос сверху'
          : 'Нажми и говори';

  const safeTranscript = sanitizeTranscript(transcript ?? '');

  return (
    <View style={styles.wrap}>
      <View style={styles.ringSlot}>
        <AnimatedView style={[styles.ring, ring0Style]} pointerEvents="none" />
        <AnimatedView style={[styles.ring, ring1Style]} pointerEvents="none" />
        <AnimatedView style={[styles.ring, ring2Style]} pointerEvents="none" />
        <AnimatedView style={[styles.buttonWrap, buttonStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state === 'listening' ? 'Остановить запись' : 'Начать запись'}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
              styles.button,
              state === 'listening' && styles.buttonActive,
              state === 'unavailable' && styles.buttonDisabled,
              pressed && !disabled && styles.buttonPressed,
            ]}
          >
            <Text style={styles.icon}>🎙️</Text>
          </Pressable>
        </AnimatedView>
      </View>
      <Text style={styles.label}>{label}</Text>
      {safeTranscript && state === 'listening' ? (
        <Text style={styles.transcript} numberOfLines={1}>
          «{safeTranscript}»
        </Text>
      ) : null}
    </View>
  );
}

const SIZE = 84;
const RING_SIZE = SIZE + 16;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    minHeight: 150,
  },
  ringSlot: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.accent,
  },
  buttonWrap: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonActive: {
    backgroundColor: '#E84F2C',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.1,
  },
  icon: {
    fontSize: 36,
    lineHeight: 40,
  },
  label: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  transcript: {
    marginTop: 2,
    fontSize: 14,
    color: theme.colors.text,
    fontStyle: 'italic',
    maxWidth: 280,
    textAlign: 'center',
  },
});
