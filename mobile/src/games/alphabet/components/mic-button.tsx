import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/shared/theme';

export type MicState = 'idle' | 'listening' | 'processing' | 'unavailable';

interface MicButtonProps {
  readonly state: MicState;
  readonly onPress: () => void;
  readonly transcript?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function MicButton({ state, onPress, transcript }: MicButtonProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (state === 'listening') {
      pulse.value = 1;
      pulse.value = withRepeat(
        withTiming(1.35, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [state, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  const disabled = state === 'unavailable' || state === 'processing';
  const label =
    state === 'listening'
      ? 'Говори!'
      : state === 'processing'
        ? 'Слушаю…'
        : state === 'unavailable'
          ? 'Нажми кнопку'
          : 'Скажи голосом';

  return (
    <View style={styles.wrap}>
      <View style={styles.haloSlot}>
        {state === 'listening' && <AnimatedView style={[styles.halo, pulseStyle]} />}
      </View>
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
      <Text style={styles.label}>{label}</Text>
      {transcript ? <Text style={styles.transcript}>«{transcript}»</Text> : null}
    </View>
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    minHeight: 160,
  },
  haloSlot: {
    position: 'absolute',
    top: theme.spacing.md,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.accent,
    opacity: 0.4,
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
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 42,
    lineHeight: 48,
  },
  label: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  transcript: {
    marginTop: theme.spacing.xs,
    fontSize: 16,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
});
