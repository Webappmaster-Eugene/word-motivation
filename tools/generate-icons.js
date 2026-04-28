#!/usr/bin/env node
/**
 * Генератор иконок и splash для Baby-funner.
 *
 * Один источник правды — SVG, описанный программно ниже.
 * Из него собираются 4 PNG-файла, которые ожидает Expo:
 *
 *   mobile/assets/images/icon.png            1024×1024  iOS/web главная иконка
 *   mobile/assets/images/adaptive-icon.png   1024×1024  Android adaptive foreground
 *   mobile/assets/images/splash.png          1242×1242  splash-картинка (resizeMode: contain)
 *   mobile/assets/images/favicon.png          196× 196  web favicon
 *
 * Концепция дизайна:
 *   - Brand-цвета приложения: фон #FFF4E0 (тёплая ваниль), акцент #FF7A59 (коралл),
 *     поддержка #4ECDC4 (мятный) и #FFD23F (солнечный жёлтый).
 *   - Логотип — стилизованная буква «B» (Baby-funner), внутри которой
 *     спрятана улыбка («funner»). Над буквой звёздочка-искорка для эффекта
 *     «волшебство обучения». По периметру декоративные точки разной величины.
 *   - Adaptive-вариант: foreground-слой соблюдает Android safe zone 33%
 *     (1024 × 0.66 = ~676 px полезной области), фон задаётся в app.config.ts
 *     через `adaptiveIcon.backgroundColor` = #FFF4E0.
 *
 * Запуск: `node tools/generate-icons.js` (из корня project/).
 * Зависимости: sharp (devDependency корневого package.json).
 */

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const PALETTE = {
  bg: '#FFF4E0',
  bgDeep: '#FFE4C4',
  primary: '#FF7A59',
  primaryDark: '#E85D3C',
  mint: '#4ECDC4',
  yellow: '#FFD23F',
  ink: '#2B2B2B',
  white: '#FFFFFF',
};

/**
 * Логотип-«B» как SVG-фрагмент. Координатная система — 0..size, центрировано.
 * Возвращает <g>...</g> чтобы можно было вкладывать в разные обёртки.
 */
function logoMark(size, opts = {}) {
  const { withSparkle = true, withDots = true } = opts;
  const cx = size / 2;
  const cy = size / 2;
  // Размер буквы B относительно общего поля. Оставляем ~22% padding по краям.
  const letterH = size * 0.56;
  const letterW = letterH * 0.72;
  const left = cx - letterW / 2;
  const top = cy - letterH / 2 + size * 0.02; // чуть ниже центра, чтоб над B оставалась искра

  // Геометрия буквы B как единого силуэта (один path).
  // Вертикальный стебель + две выпуклые петли справа. Талия (waist) между
  // петлями отступает внутрь от правого края, чтобы силуэт читался как «B».
  const upperLoopH = letterH * 0.48;
  const lowerLoopH = letterH * 0.52;
  const loopRight = left + letterW;
  const waistInset = letterW * 0.22;     // насколько талия «втягивается» от правого края
  const cornerR = letterW * 0.08;        // скругление внешних углов
  const upperBulge = letterW * 0.04;     // лёгкая выпуклость верхней петли наружу
  const lowerBulge = letterW * 0.06;     // нижняя петля чуть «толще» — даёт baby-friendly округлость

  const lowerTop = top + upperLoopH;
  const bottom = top + letterH;

  // Один непрерывный path: внешний контур B по часовой стрелке + внутренние «дырки» против.
  const outer = [
    `M ${left + cornerR} ${top}`,
    `H ${left + letterW * 0.62}`,
    `Q ${loopRight + upperBulge} ${top} ${loopRight + upperBulge} ${top + upperLoopH * 0.5}`,
    `Q ${loopRight + upperBulge} ${lowerTop} ${loopRight - waistInset} ${lowerTop}`,
    `Q ${loopRight + lowerBulge} ${lowerTop} ${loopRight + lowerBulge} ${lowerTop + lowerLoopH * 0.5}`,
    `Q ${loopRight + lowerBulge} ${bottom} ${left + letterW * 0.58} ${bottom}`,
    `H ${left + cornerR}`,
    `Q ${left} ${bottom} ${left} ${bottom - cornerR}`,
    `V ${top + cornerR}`,
    `Q ${left} ${top} ${left + cornerR} ${top}`,
    'Z',
  ].join(' ');

  // Внутренние «глаза» B — два полу-окошка. Делаем их через evenodd, чтобы работало с Skia/Android.
  const stemRight = left + letterW * 0.40;
  const upperHoleR = upperLoopH * 0.28;
  const upperHoleCx = stemRight + (loopRight - stemRight) * 0.45;
  const upperHoleCy = top + upperLoopH * 0.5;
  const lowerHoleR = lowerLoopH * 0.30;
  const lowerHoleCx = stemRight + (loopRight - stemRight) * 0.40;
  const lowerHoleCy = lowerTop + lowerLoopH * 0.5;

  // SVG: единый path с fill-rule="evenodd" + два встроенных круга-«дырки»
  const bShape = [
    `<path fill-rule="evenodd" fill="${PALETTE.primary}" d="`,
    outer,
    // верхняя дырка (приближённая к D-форме): прямоугольник со скруглением
    `M ${upperHoleCx - upperHoleR * 1.1} ${upperHoleCy - upperHoleR}`,
    `H ${upperHoleCx + upperHoleR * 0.4}`,
    `Q ${upperHoleCx + upperHoleR * 1.4} ${upperHoleCy - upperHoleR} ${upperHoleCx + upperHoleR * 1.4} ${upperHoleCy}`,
    `Q ${upperHoleCx + upperHoleR * 1.4} ${upperHoleCy + upperHoleR} ${upperHoleCx + upperHoleR * 0.4} ${upperHoleCy + upperHoleR}`,
    `H ${upperHoleCx - upperHoleR * 1.1}`,
    'Z',
    'Z" />',
  ].join(' ');

  // Стебель уже есть в outer; rect-stem не нужен.
  const stem = '';

  // Улыбка внутри нижней петли (белый полумесяц поверх кораллового)
  const smileCx = lowerHoleCx;
  const smileCy = lowerHoleCy + lowerHoleR * 0.05;
  const smileR = lowerHoleR * 0.78;
  const smile = [
    `<path d="M ${smileCx - smileR} ${smileCy - smileR * 0.15}`,
    `Q ${smileCx} ${smileCy + smileR * 0.95} ${smileCx + smileR} ${smileCy - smileR * 0.15}"`,
    `stroke="${PALETTE.white}" stroke-width="${smileR * 0.42}" stroke-linecap="round" fill="none" />`,
  ].join(' ');

  // Глазки сверху улыбки (две круглые точки)
  const eyeR = smileR * 0.18;
  const eyeY = smileCy - smileR * 0.55;
  const eyeDx = smileR * 0.55;
  const eyes = [
    `<circle cx="${smileCx - eyeDx}" cy="${eyeY}" r="${eyeR}" fill="${PALETTE.white}" />`,
    `<circle cx="${smileCx + eyeDx}" cy="${eyeY}" r="${eyeR}" fill="${PALETTE.white}" />`,
  ].join('');

  // Искра/звёздочка над буквой — символ «магии» обучения
  const sparkleParts = [];
  if (withSparkle) {
    const sx = cx + letterW * 0.05;
    const sy = top - size * 0.02;
    const sr = size * 0.06;
    sparkleParts.push(
      // 4-конечная звезда из двух пересечённых ромбов (yellow)
      `<path d="M ${sx} ${sy - sr} L ${sx + sr * 0.32} ${sy - sr * 0.32} L ${sx + sr} ${sy} L ${sx + sr * 0.32} ${sy + sr * 0.32} L ${sx} ${sy + sr} L ${sx - sr * 0.32} ${sy + sr * 0.32} L ${sx - sr} ${sy} L ${sx - sr * 0.32} ${sy - sr * 0.32} Z" fill="${PALETTE.yellow}" />`,
      // Маленькая мятная капля справа
      `<circle cx="${sx + sr * 1.6}" cy="${sy + sr * 0.4}" r="${sr * 0.32}" fill="${PALETTE.mint}" />`,
    );
  }

  // Декоративные точки по периметру (только для полного icon — не для adaptive)
  const dots = [];
  if (withDots) {
    const dotPositions = [
      { x: 0.15, y: 0.18, r: 0.018, color: PALETTE.mint },
      { x: 0.86, y: 0.20, r: 0.014, color: PALETTE.yellow },
      { x: 0.10, y: 0.78, r: 0.020, color: PALETTE.primary },
      { x: 0.88, y: 0.84, r: 0.016, color: PALETTE.mint },
      { x: 0.20, y: 0.90, r: 0.012, color: PALETTE.yellow },
    ];
    for (const d of dotPositions) {
      dots.push(
        `<circle cx="${d.x * size}" cy="${d.y * size}" r="${d.r * size}" fill="${d.color}" opacity="0.85" />`,
      );
    }
  }

  return [
    ...dots,
    stem,
    bShape,
    smile,
    eyes,
    ...sparkleParts,
  ].join('\n');
}

/**
 * Полная иконка — закруглённый квадрат с логотипом и фоном.
 * Используется для icon.png (iOS) и favicon.png (web).
 */
function iconSvg(size) {
  const r = size * 0.22; // squircle-радиус (iOS-style)
  // Лёгкий радиальный градиент: центр светлее, края — bgDeep
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="68%">
      <stop offset="0%" stop-color="${PALETTE.bg}" />
      <stop offset="100%" stop-color="${PALETTE.bgDeep}" />
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)" />
  ${logoMark(size, { withSparkle: true, withDots: true })}
</svg>`;
}

/**
 * Adaptive-icon foreground — БЕЗ фона (Android рисует его отдельно из конфига),
 * с обязательным safe-zone padding 33% (Android crop-ит до круга/squircle разной формы).
 */
function adaptiveSvg(size) {
  // Safe zone: 1024 → центральные ~672 (66%). Логотип рисуем в области 0.66×size.
  const inner = Math.round(size * 0.66);
  const offset = Math.round((size - inner) / 2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${offset} ${offset})">
    ${logoMark(inner, { withSparkle: true, withDots: false })}
  </g>
</svg>`;
}

/**
 * Splash — лого на однотонном фоне с увеличенным padding.
 * Expo использует resizeMode: contain, так что фон срабатывает из app.config splash.backgroundColor.
 * Сам PNG может быть полупрозрачным или с фоном — оставим непрозрачный bg для надёжности.
 */
function splashSvg(size) {
  const inner = Math.round(size * 0.46); // лого занимает ~46% ширины
  const offset = Math.round((size - inner) / 2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" fill="${PALETTE.bg}" />
  <g transform="translate(${offset} ${offset})">
    ${logoMark(inner, { withSparkle: true, withDots: false })}
  </g>
  <text x="${size / 2}" y="${offset + inner + size * 0.08}" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${size * 0.06}" font-weight="800" text-anchor="middle" fill="${PALETTE.ink}" opacity="0.85">Baby-funner</text>
</svg>`;
}

async function svgToPng(svg, outPath, size) {
  const buf = Buffer.from(svg);
  await sharp(buf, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const { size: bytes } = fs.statSync(outPath);
  console.log(`  ✓ ${path.relative(process.cwd(), outPath)}  (${size}×${size}, ${(bytes / 1024).toFixed(1)} KB)`);
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'mobile', 'assets', 'images');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });

  console.log('Генерирую иконки Baby-funner:');

  // 1. Главная иконка iOS / web fallback
  await svgToPng(iconSvg(1024), path.join(out, 'icon.png'), 1024);

  // 2. Android adaptive foreground
  await svgToPng(adaptiveSvg(1024), path.join(out, 'adaptive-icon.png'), 1024);

  // 3. Splash (квадратное полотно, Expo обрежет/центрирует)
  await svgToPng(splashSvg(1242), path.join(out, 'splash.png'), 1242);

  // 4. Web favicon
  await svgToPng(iconSvg(196), path.join(out, 'favicon.png'), 196);

  console.log('\nГотово. Не забудьте `npx expo prebuild --clean` перед EAS-сборкой —\nAndroidManifest и Info.plist подхватят новые ассеты.');
}

main().catch((err) => {
  console.error('Ошибка генерации:', err);
  process.exit(1);
});
