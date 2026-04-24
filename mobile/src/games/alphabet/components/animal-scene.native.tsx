import { Camera, DefaultLight, FilamentScene, FilamentView, Model } from 'react-native-filament';
import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Biome } from '@/games/alphabet/content/types';
import type { AnimalSceneAsset, SceneAnimation } from '@/services/animal-scene/types';
import { contrastTextColor } from '@/shared/theme/contrast';
import { theme } from '@/shared/theme';

interface AnimalSceneProps {
  readonly asset: AnimalSceneAsset & { readonly biome?: Biome };
  readonly animation?: SceneAnimation;
  readonly width?: number;
  readonly height?: number;
  /** Скрыть заголовок (дубликат с hero-banner'ом снаружи). */
  readonly showTitle?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// Placeholder GLB по биомам (см. tools/generate-primitive-glb.js).
// Когда будут Quaternius-модели — маппим per-animal.
const CUBE_BY_BIOME: Record<string, number> = {
  FARM: require('@assets/models/cube-farm.glb'),
  FOREST: require('@assets/models/cube-forest.glb'),
  SAVANNA: require('@assets/models/cube-savanna.glb'),
  SEA: require('@assets/models/cube-sea.glb'),
  JUNGLE: require('@assets/models/cube-jungle.glb'),
  ARCTIC: require('@assets/models/cube-arctic.glb'),
};

const AnimatedText = Animated.createAnimatedComponent(Text);

/**
 * Native Filament-сцена: цветной 3D-куб (per-биом) с PBR-освещением.
 *
 * Модель пока статична — API react-native-filament 1.9.x ожидает в `translate`/
 * `rotate` плоский `[x, y, z]`-массив, а не Reanimated SharedValue/useDerivedValue.
 * Живую анимацию 3D-тела добавим вместе с Quaternius-моделями (M5), когда
 * подтянем стабильный путь вращения — либо через `Animator`/`asset.animateStart`,
 * либо через worklets-core + filament useFrameCallback.
 *
 * Когда появятся GLB-модели животных, заменяем `CUBE_BY_BIOME[biome]` на
 * `MODEL_BY_ID[asset.id]` — остальное (свет, камера) остаётся.
 */
export function AnimalScene({
  asset,
  animation: _animation = 'greet',
  width = Math.min(SCREEN_WIDTH - 48, 360),
  height = 320,
  showTitle = true,
}: AnimalSceneProps) {
  const biome = asset.biome ?? 'FOREST';
  const modelSource = CUBE_BY_BIOME[biome] ?? CUBE_BY_BIOME.FOREST;

  const titleScale = useSharedValue(0.6);

  useEffect(() => {
    titleScale.value = withSequence(
      withTiming(1.05, { duration: 360, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 240, easing: Easing.inOut(Easing.cubic) }),
    );
    return () => {
      cancelAnimation(titleScale);
    };
  }, [asset.id, titleScale]);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  const bgColor = useMemo(() => asset.color, [asset.color]);

  return (
    <View style={[styles.wrap, { width, height, backgroundColor: bgColor }]}>
      <FilamentScene>
        <FilamentView style={{ flex: 1 }}>
          <Camera />
          <DefaultLight />
          <Model source={modelSource} scale={[0.8, 0.8, 0.8]} castShadow receiveShadow />
        </FilamentView>
      </FilamentScene>

      {showTitle ? (
        <AnimatedText
          style={[styles.title, titleStyle, { color: contrastTextColor(asset.color) }]}
        >
          {asset.title}
        </AnimatedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
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
