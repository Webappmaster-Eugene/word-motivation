/**
 * Определяет читаемый цвет текста (белый/чёрный) для произвольного фона.
 *
 * Использует WCAG 2.1 relative luminance. Для Daily Quest карточек и animal-сцен
 * цвет фона — динамический (берётся из контента), поэтому статический белый
 * текст на светлом фоне (например, #FFE4B5) становится нечитаемым.
 *
 * Порог 0.55 подобран так, чтобы большинство насыщенных брендовых цветов
 * (#F4A261, #E9C46A, #E76F51) давали белый текст, а пастельные (#FFD6A5) —
 * тёмный.
 */
export function contrastTextColor(bgHex: string): '#FFFFFF' | '#1F1F1F' {
  const luminance = relativeLuminance(bgHex);
  return luminance > 0.55 ? '#1F1F1F' : '#FFFFFF';
}

/** Полупрозрачная версия нечитаемого цвета для label/hint (~70% от основного). */
export function contrastSecondaryColor(bgHex: string): string {
  return contrastTextColor(bgHex) === '#FFFFFF' ? 'rgba(255,255,255,0.82)' : 'rgba(31,31,31,0.72)';
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const [lr, lg, lb] = [r, g, b].map(channelLuminance) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function channelLuminance(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex: string): readonly [number, number, number] {
  const h = hex.replace('#', '').trim();
  const normalized =
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h.length === 8 ? h.slice(0, 6) : h;
  if (normalized.length !== 6) return [128, 128, 128];
  const n = parseInt(normalized, 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
