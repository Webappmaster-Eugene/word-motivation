import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useService } from '@/services/di/provider';
import type { AnimalSceneAsset } from '@/services/animal-scene/types';
import { theme } from '@/shared/theme';

import type { AnimalInfo } from '../content/types';

import { AnimalChat } from './animal-chat';
import { AnimalScene } from './animal-scene';

interface AnimalRevealCardProps {
  readonly animal: AnimalInfo;
  readonly onContinue: () => void;
  /** Когда true — вместо greeting-bubble показываем чат с животным (M8). */
  readonly chatEnabled?: boolean;
  /** sessionId из ProgressSync; нужен для авторизованного вызова /chat. */
  readonly sessionId?: string | null;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function AnimalRevealCard({
  animal,
  onContinue,
  chatEnabled = false,
  sessionId = null,
}: AnimalRevealCardProps) {
  const sceneService = useService('animalScene');
  const [sceneReady, setSceneReady] = useState(false);

  const asset = useMemo<AnimalSceneAsset>(
    () => ({ id: animal.id, title: animal.title, emoji: animal.emoji, color: animal.color }),
    [animal],
  );

  useEffect(() => {
    let cancelled = false;
    setSceneReady(false);
    void sceneService.preload(asset).then(() => {
      if (!cancelled) setSceneReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [asset, sceneService]);

  const bubbleOpacity = useSharedValue(0);
  useEffect(() => {
    bubbleOpacity.value = 0;
    bubbleOpacity.value = withDelay(
      700,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
  }, [animal.id, bubbleOpacity]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ translateY: (1 - bubbleOpacity.value) * 16 }],
  }));

  if (chatEnabled) {
    return (
      <View style={styles.chatContainer}>
        <View style={styles.sceneCompact}>
          {sceneReady ? (
            <AnimalScene asset={asset} animation="greet" />
          ) : (
            <View style={styles.loaderCompact}>
              <Text style={styles.loaderText}>Готовим сцену…</Text>
            </View>
          )}
        </View>

        <View style={styles.chatArea}>
          <AnimalChat sessionId={sessionId} animal={animal} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Идём к следующему слову"
          onPress={onContinue}
          style={({ pressed }) => [styles.ctaCompact, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaTextCompact}>Идём дальше →</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sceneReady ? (
        <AnimalScene asset={asset} animation="greet" />
      ) : (
        <View style={styles.loader}>
          <Text style={styles.loaderText}>Готовим сцену…</Text>
        </View>
      )}

      <AnimatedView style={[styles.bubble, bubbleStyle]}>
        <Text style={styles.bubbleText}>{animal.greeting}</Text>
      </AnimatedView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Идём к следующему слову"
        onPress={onContinue}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>Идём дальше →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  loader: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  loaderText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  bubble: {
    maxWidth: 360,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  cta: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  chatContainer: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  sceneCompact: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderCompact: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  chatArea: {
    flex: 1,
  },
  ctaCompact: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
  },
  ctaTextCompact: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
