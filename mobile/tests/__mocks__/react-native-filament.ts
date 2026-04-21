/**
 * Мок react-native-filament для Jest — в jsdom нет native модуля,
 * реальный рендер нам в тестах не нужен, только type-совместимые пустышки.
 */
import { createElement, type ReactNode } from 'react';

type AnyProps = Record<string, unknown> & { children?: ReactNode };

const passthrough = (name: string) => {
  const Component = ({ children }: AnyProps) =>
    createElement('filament-mock', { 'data-name': name }, children);
  Component.displayName = `FilamentMock(${name})`;
  return Component;
};

export const FilamentScene = passthrough('FilamentScene');
export const FilamentView = passthrough('FilamentView');
export const Camera = passthrough('Camera');
export const DefaultLight = passthrough('DefaultLight');
export const Light = passthrough('Light');
export const Model = passthrough('Model');
export const EnvironmentalLight = passthrough('EnvironmentalLight');
export const Skybox = passthrough('Skybox');

export const useDerivedValue = <T,>(fn: () => T) => ({ value: fn() });
export const useFilamentContext = () => ({});
