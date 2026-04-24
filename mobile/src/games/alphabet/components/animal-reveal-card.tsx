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
import { contrastSecondaryColor, contrastTextColor } from '@/shared/theme/contrast';
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

    // Safety-timeout: если preload завис (сеть, ошибка движка) — не оставляем
    // бесконечный лоадер «Готовим сцену…». 5 с достаточно для любого устройства.
    const timeout = setTimeout(() => {
      if (!cancelled) setSceneReady(true);
    }, 5000);

    void sceneService
      .preload(asset)
      .then(() => {
        if (!cancelled) setSceneReady(true);
      })
      .catch(() => {
        // Сцена не загрузилась, но показываем её — SkiaFallback не требует preload.
        if (!cancelled) setSceneReady(true);
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
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
    const heroFg = contrastTextColor(animal.color);
    const heroSecondaryFg = contrastSecondaryColor(animal.color);
    return (
      <View style={styles.chatContainer}>
        {/* Hero-баннер: цвет животного, scene + title посередине, без Верхнего padding'а (у AlphabetGame есть свой header). */}
        <View style={[styles.hero, { backgroundColor: animal.color }]}>
          {sceneReady ? (
            <AnimalScene
              asset={asset}
              animation="greet"
              width={180}
              height={150}
              showTitle={false}
            />
          ) : (
            <View style={styles.loaderCompact}>
              <Text style={styles.loaderText}>Готовим сцену…</Text>
            </View>
          )}
          <Text style={[styles.heroTitle, { color: heroFg }]}>{animal.title}</Text>
          <Text style={[styles.heroSubtitle, { color: heroSecondaryFg }]}>
            Спроси о чём угодно — отвечу!
          </Text>
        </View>

        {/* Чат: max-width контейнер, так bubble остаются рядом со scene. */}
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
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    marginHorizontal: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  loaderCompact: {
    width: 160,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  chatArea: {
    flex: 1,
    minHeight: 200,
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
