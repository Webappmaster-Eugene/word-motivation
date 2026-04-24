import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { AnimalSceneAsset, SceneAnimation } from '@/services/animal-scene/types';
import { theme } from '@/shared/theme';

interface AnimalSceneProps {
  readonly asset: AnimalSceneAsset;
  readonly animation?: SceneAnimation;
  readonly width?: number;
  readonly height?: number;
  readonly showTitle?: boolean;
}

/**
 * Web-обёртка над Skia-сценой. `@shopify/react-native-skia` на web требует
 * предзагрузки CanvasKit-WASM *до* того, как модуль `skia/Skia.web.ts` будет
 * вычислен: там `export const Skia = JsiSkApi(global.CanvasKit)` — вызов
 * происходит на импорте, и если `global.CanvasKit` ещё undefined, то все
 * методы Skia (включая `Matrix`) закроют undefined в своих closures
 * навсегда. Никакой позднейший `LoadSkiaWeb` этого уже не починит.
 *
 * Поэтому реальный компонент живёт в `animal-scene-inner.web.tsx` и
 * подтягивается через `WithSkiaWeb`: тот сначала ждёт `LoadSkiaWeb`
 * (`global.CanvasKit = ...`), и только после этого делает динамический
 * импорт inner-модуля — в момент его вычисления `Skia` инстанцируется
 * уже с живым CanvasKit.
 *
 * Файл `canvaskit.wasm` раздаётся с корня dev-сервера: копируется в
 * `public/canvaskit.wasm` postinstall-хуком (см. `package.json`).
 */
export function AnimalScene(props: AnimalSceneProps) {
  const width = props.width ?? 360;
  const height = props.height ?? 320;
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `/${file}` }}
      getComponent={() => import('./animal-scene-inner.web')}
      componentProps={props}
      fallback={
        <View style={[styles.fallback, { width, height }]}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
