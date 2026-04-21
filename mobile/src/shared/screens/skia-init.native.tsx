import type { ReactNode } from 'react';

interface SkiaInitProps {
  readonly children: ReactNode;
}

/**
 * На native Skia инициализируется самим модулем — WASM-загрузчик не нужен.
 * Этот файл существует, чтобы web-ветка (`skia-init.web.tsx`) с импортом
 * `@shopify/react-native-skia/lib/module/web` не попадала в native-бандл:
 * Metro статически парсит динамический `import()` и иначе тянет `canvaskit-wasm`,
 * который require'ит `fs` и ломает сборку Android.
 */
export function SkiaInit({ children }: SkiaInitProps) {
  return <>{children}</>;
}
