import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme';

interface SkiaInitProps {
  readonly children: ReactNode;
}

/**
 * На web `@shopify/react-native-skia` требует загрузки CanvasKit-WASM до первого
 * рендера Canvas. Без этого любой `<Canvas>` падает с
 * `TypeError: Cannot read properties of undefined (reading 'Matrix')`.
 *
 * Файл `.web.tsx` изолирует этот код от native-бандла: Metro не будет
 * резолвить `canvaskit-wasm` при сборке android/ios.
 */
export function SkiaInit({ children }: SkiaInitProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import(
          '@shopify/react-native-skia/lib/module/web'
        )) as typeof import('@shopify/react-native-skia/lib/module/web');
        // CanvasKit по умолчанию грузит WASM относительно текущего URL.
        // На SPA-роутах типа /games/xxx это ломается (ищет /games/canvaskit.wasm).
        // Возвращаем абсолютный путь от корня — файл должен лежать в `dist-web/`
        // (на dev — скопировали ручками; прод nginx копирует при build).
        await mod.LoadSkiaWeb({
          locateFile: (file: string) => `/${file}`,
        });
      } catch (err) {
        // Даже при падении WASM — даём UI запуститься; Canvas-компоненты
        // обёрнуты Error-boundary'ом и покажут fallback.
        console.warn('[SkiaInit] LoadSkiaWeb failed:', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.text}>Загружаем графику…</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  text: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
});
