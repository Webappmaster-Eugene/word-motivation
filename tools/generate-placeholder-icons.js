#!/usr/bin/env node
/**
 * Генератор placeholder-иконок для Expo-приложения.
 * Создаёт 4 валидных PNG solid-color:
 *   mobile/assets/images/icon.png          (1024x1024, оранжевый)
 *   mobile/assets/images/adaptive-icon.png (1024x1024, оранжевый)
 *   mobile/assets/images/splash.png        (1284x2778, кремовый)
 *   mobile/assets/images/favicon.png       (48x48,     оранжевый)
 *
 * Чистый Node (нет зависимостей от canvas/sharp).
 * После первого деплоя — замени на дизайнерские иконки.
 */

const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');

// CRC32 таблица — стандартный polynomial 0xedb88320.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function solidRgbPng(width, height, [r, g, b]) {
  const bytesPerRow = 1 + width * 3; // 1 байт filter + RGB-пиксели
  const raw = Buffer.alloc(bytesPerRow * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * bytesPerRow;
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < width; x += 1) {
      const i = rowStart + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const ORANGE = [0xff, 0x7a, 0x59]; // theme.colors.accent
const CREAM = [0xff, 0xf4, 0xe0]; // theme.colors.background

const outDir = path.resolve(__dirname, '..', 'mobile', 'assets', 'images');
fs.mkdirSync(outDir, { recursive: true });

const files = [
  { name: 'icon.png', size: [1024, 1024], color: ORANGE },
  { name: 'adaptive-icon.png', size: [1024, 1024], color: ORANGE },
  { name: 'splash.png', size: [1284, 2778], color: CREAM },
  { name: 'favicon.png', size: [48, 48], color: ORANGE },
];

for (const { name, size, color } of files) {
  const png = solidRgbPng(size[0], size[1], color);
  const fullPath = path.join(outDir, name);
  fs.writeFileSync(fullPath, png);
  // eslint-disable-next-line no-console
  console.log(`✓ ${name} (${size[0]}×${size[1]}, ${png.length} bytes)`);
}

// eslint-disable-next-line no-console
console.log(`\nВсе placeholder-иконки в ${outDir}`);
console.log('⚠️  Замени на дизайнерские перед публикацией в RuStore!');
