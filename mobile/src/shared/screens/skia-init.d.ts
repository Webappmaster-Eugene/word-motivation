import type { ReactElement, ReactNode } from 'react';

export interface SkiaInitProps {
  readonly children: ReactNode;
}

/**
 * Обёртка, инициализирующая Skia перед первым рендером `<Canvas>`.
 * Реальная реализация выбирается Metro: `skia-init.web.tsx` для web
 * (грузит CanvasKit-WASM), `skia-init.native.tsx` для native (no-op).
 */
export declare function SkiaInit(props: SkiaInitProps): ReactElement;
