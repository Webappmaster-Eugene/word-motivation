import {
  Camera,
  DefaultLight,
  FilamentScene,
  FilamentView,
  Model,
  useDerivedValue,
} from 'react-native-filament';
import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Biome } from '@/games/alphabet/content/types';
import type { AnimalSceneAsset, SceneAnimation } from '@/services/animal-scene/types';
import { theme } from '@/shared/theme';

interface AnimalSceneProps {
  readonly asset: AnimalSceneAsset & { readonly biome?: Biome };
  readonly animation?: SceneAnimation;
  readonly width?: number;
  readonly height?: number;
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
 * Native Filament-сцена: крутящийся цветной 3D-куб (per-биом) с PBR-освещением.
 *
 * Когда появятся GLB-модели животных (Quaternius Ultimate Animated Animals),
 * заменяем `CUBE_BY_BIOME[biome]` на `MODEL_BY_ID[asset.id]` — остальное (свет,
 * камера, анимация) остаётся тем же.
 */
export function AnimalScene({
  asset,
  animation = 'greet',
  width = Math.min(SCREEN_WIDTH - 48, 360),
  height = 320,
}: AnimalSceneProps) {
  const biome = asset.biome ?? 'FOREST';
  const modelSource = CUBE_BY_BIOME[biome] ?? CUBE_BY_BIOME.FOREST;

  // Rotation по оси Y
  const rotation = useSharedValue(0);
  const bobbing = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 360, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 240, easing: Easing.inOut(Easing.cubic) }),
    );

    rotation.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: animation === 'dance' ? 1600 : 4200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    bobbing.value = withRepeat(
      withSequence(
        withTiming(-0.15, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(bobbing);
      cancelAnimation(scale);
    };
  }, [animation, asset.id, rotation, bobbing, scale]);

  // Filament принимает Float3 (tuple [x,y,z]) как translate и rotate (Euler YXZ радианы).
  // Используем useDerivedValue из react-native-filament — он конвертирует Reanimated shared value
  // в worklets-core value, читаемый из native-Filament рендера.
  const transformY = useDerivedValue(
    () => [0, bobbing.value, 0] as [number, number, number],
    [bobbing],
  );
  const transformRotation = useDerivedValue(
    () => [0, rotation.value, 0] as [number, number, number],
    [rotation],
  );

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgColor = useMemo(() => asset.color, [asset.color]);

  return (
    <View style={[styles.wrap, { width, height, backgroundColor: bgColor }]}>
      <FilamentScene>
        <FilamentView style={{ flex: 1 }}>
          <Camera />
          <DefaultLight />
          <Model
            source={modelSource}
            translate={transformY}
            rotate={transformRotation}
            scale={[0.8, 0.8, 0.8]}
            castShadow
            receiveShadow
          />
        </FilamentView>
      </FilamentScene>

      <AnimatedText style={[styles.title, titleStyle]}>{asset.title}</AnimatedText>
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
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
});
