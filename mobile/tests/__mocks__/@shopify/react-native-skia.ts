/**
 * Мок @shopify/react-native-skia для Jest-окружения.
 * В jsdom/node нет native JSI-биндингов Skia, поэтому заменяем все
 * компоненты на обычные React-фрагменты.
 */
import { createElement, type ReactNode } from 'react';

type AnyProps = Record<string, unknown> & { children?: ReactNode };

const passthrough = (name: string) => {
  const Component = ({ children }: AnyProps) => createElement('view', { 'data-skia-mock': name }, children);
  Component.displayName = `SkiaMock(${name})`;
  return Component;
};

export const Canvas = passthrough('Canvas');
export const Group = passthrough('Group');
export const Rect = passthrough('Rect');
export const Circle = passthrough('Circle');
export const LinearGradient = passthrough('LinearGradient');
export const RadialGradient = passthrough('RadialGradient');
export const Path = passthrough('Path');
export const Image = passthrough('Image');

export const vec = (x: number, y: number) => ({ x, y });
export const Skia = {};
