import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
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

import type { AnimalSceneAsset, SceneAnimation } from '@/services/animal-scene/types';
import { contrastTextColor } from '@/shared/theme/contrast';

export interface AnimalSceneInnerProps {
  readonly asset: AnimalSceneAsset;
  readonly animation?: SceneAnimation;
  readonly width?: number;
  readonly height?: number;
  /**
   * Скрыть заголовок с именем животного внутри сцены. Полезно когда
   * снаружи уже есть hero-баннер с тем же именем (AlphabetGame reveal,
   * AnimalDetailScreen) — иначе дублирование и визуальный шум.
   */
  readonly showTitle?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

interface ParticleConfig {
  readonly key: number;
  readonly x: number;
  readonly baseY: number;
  readonly radius: number;
  readonly opacity: number;
  readonly phaseMs: number;
  readonly speedMs: number;
}

function generateParticles(width: number, height: number): readonly ParticleConfig[] {
  // Детерминированные (не random) — чтобы на каждом re-mount была одинаковая сцена.
  const items: ParticleConfig[] = [];
  const count = 18;
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    items.push({
      key: i,
      x: width * (0.08 + 0.84 * ((t * 7.13) % 1)),
      baseY: height * (0.15 + 0.7 * ((t * 3.91) % 1)),
      radius: 3 + ((i * 1.7) % 5),
      opacity: 0.25 + ((i * 0.19) % 0.5),
      phaseMs: (i * 370) % 2600,
      speedMs: 2200 + ((i * 170) % 1600),
    });
  }
  return items;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

/**
 * Реализация Skia-сцены для web. Этот модуль **никогда** не должен быть
 * импортирован синхронно: Skia.web.js при первом вычислении берёт
 * `global.CanvasKit`, которого на момент старта Metro-бандла ещё нет.
 * Подтягивается через `animal-scene.web.tsx → WithSkiaWeb`, который
 * предварительно дожидается `LoadSkiaWeb`.
 */
export default function AnimalSceneInner({
  asset,
  animation = 'greet',
  width = Math.min(SCREEN_WIDTH - 48, 360),
  height = 320,
  showTitle = true,
}: AnimalSceneInnerProps) {
  const emojiScale = useSharedValue(0.6);
  const emojiTranslateY = useSharedValue(0);
  const emojiRotate = useSharedValue(0);
  const spotlight = useSharedValue(0);

  const particles = useMemo(() => generateParticles(width, height), [width, height]);

  useEffect(() => {
    emojiScale.value = withSequence(
      withTiming(1.1, { duration: 380, easing: Easing.out(Easing.back(1.7)) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
    );

    if (animation === 'greet' || animation === 'idle') {
      emojiTranslateY.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else if (animation === 'happy') {
      // Радостные прыжки: быстро вверх-вниз 4 раза, затем покой.
      emojiTranslateY.value = withRepeat(
        withSequence(
          withTiming(-20, { duration: 220, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
        ),
        4,
        false,
      );
    } else if (animation === 'eat') {
      // Жевательное движение: лёгкое покачивание вниз-вверх.
      emojiTranslateY.value = withRepeat(
        withSequence(
          withTiming(12, { duration: 350, easing: Easing.inOut(Easing.sin) }),
          withTiming(-4, { duration: 280, easing: Easing.inOut(Easing.sin) }),
        ),
        3,
        false,
      );
    } else if (animation === 'play') {
      // Подбрасывание мяча: высокий прыжок с кувырком.
      emojiTranslateY.value = withSequence(
        withTiming(-30, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 350, easing: Easing.in(Easing.cubic) }),
      );
    }

    if (animation === 'greet') {
      emojiRotate.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
            withTiming(6, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
          ),
          -1,
          true,
        ),
      );
    } else if (animation === 'dance') {
      emojiRotate.value = withRepeat(
        withSequence(
          withTiming(-18, { duration: 300, easing: Easing.inOut(Easing.cubic) }),
          withTiming(18, { duration: 300, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
        true,
      );
    } else if (animation === 'happy') {
      // Небольшое покачивание в такт прыжкам.
      emojiRotate.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 200, easing: Easing.inOut(Easing.cubic) }),
          withTiming(10, { duration: 200, easing: Easing.inOut(Easing.cubic) }),
        ),
        4,
        true,
      );
    } else if (animation === 'play') {
      // Полный оборот при броске.
      emojiRotate.value = withSequence(
        withTiming(360, { duration: 500, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      );
    }

    spotlight.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(emojiScale);
      cancelAnimation(emojiTranslateY);
      cancelAnimation(emojiRotate);
      cancelAnimation(spotlight);
    };
  }, [animation, asset.id, emojiScale, emojiTranslateY, emojiRotate, spotlight]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: emojiTranslateY.value },
      { scale: emojiScale.value },
      { rotate: `${emojiRotate.value}deg` },
    ],
  }));

  const spotlightStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + spotlight.value * 0.35,
  }));

  const topColor = asset.color;
  const bottomColor = hexToRgba(asset.color, 0.2);

  return (
    <View style={[styles.wrap, { width, height }]} accessibilityLabel={`Сцена с ${asset.title}`}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[topColor, bottomColor]} />
        </Rect>
        <Group>
          {/* лёгкий спот-свет снизу */}
          <Circle cx={width / 2} cy={height * 0.78} r={width * 0.45}>
            <RadialGradient
              c={vec(width / 2, height * 0.78)}
              r={width * 0.45}
              colors={[hexToRgba(topColor, 0.6), hexToRgba(topColor, 0)]}
            />
          </Circle>
          {particles.map((p) => (
            <Circle
              key={p.key}
              cx={p.x}
              cy={p.baseY}
              r={p.radius}
              color={`rgba(255,255,255,${p.opacity})`}
            />
          ))}
        </Group>
      </Canvas>

      <AnimatedView
        pointerEvents="none"
        style={[
          styles.spotlight,
          { top: height * 0.62, left: width / 2 - 120, width: 240, height: 120 },
          spotlightStyle,
        ]}
      />

      <AnimatedText style={[styles.emoji, emojiStyle]} accessibilityRole="image">
        {asset.emoji}
      </AnimatedText>

      {showTitle ? (
        <Text style={[styles.title, { color: contrastTextColor(asset.color) }]}>
          {asset.title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  emoji: {
    fontSize: 140,
    lineHeight: 160,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  title: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    // Цвет задаётся динамически через contrastTextColor(asset.color) в JSX.
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
});
