#!/usr/bin/env node
/**
 * Генератор минимальных GLB-кубов для Filament — по одному на биом.
 *
 * Каждый GLB — валидный glTF 2.0 binary с 8 вершинами, 12 треугольниками,
 * один материал с baseColorFactor = RGBA-цвет биома.
 *
 * Используется как placeholder до появления настоящих Quaternius-моделей
 * (см. `docs/enable-3d.md`). Filament на native рендерит эти кубы с PBR
 * light — получается настоящий 3D-куб в цвете биома.
 *
 * Запуск: `node tools/generate-primitive-glb.js`
 * Результат: `mobile/assets/models/cube-{biome}.glb`
 */

const fs = require('node:fs');
const path = require('node:path');

// ─── Геометрия куба -1..+1 ────────────────────────────────────────────────
// 8 вершин (углы). Для «правильных» per-face normals нужно было бы 24, но для
// placeholder'а достаточно normalized positions → даёт сферический shading.
// Filament с DefaultLight и PBR-материалом всё равно выглядит как куб.

const POSITIONS = new Float32Array([
  -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1, -1, // back face (Z=-1)
  -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1, // front face (Z=+1)
]);

// Нормали — просто нормализованные позиции (для простоты).
const NORMALS = (() => {
  const out = new Float32Array(24);
  for (let i = 0; i < 8; i += 1) {
    const x = POSITIONS[i * 3];
    const y = POSITIONS[i * 3 + 1];
    const z = POSITIONS[i * 3 + 2];
    const len = Math.sqrt(x * x + y * y + z * z);
    out[i * 3] = x / len;
    out[i * 3 + 1] = y / len;
    out[i * 3 + 2] = z / len;
  }
  return out;
})();

// 36 индексов = 12 треугольников.
const INDICES = new Uint16Array([
  0, 1, 2, 0, 2, 3, // back
  4, 6, 5, 4, 7, 6, // front
  0, 3, 7, 0, 7, 4, // left
  1, 5, 6, 1, 6, 2, // right
  0, 4, 5, 0, 5, 1, // bottom
  3, 2, 6, 3, 6, 7, // top
]);

function align4(n) {
  return (n + 3) & ~3;
}

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [
    ((num >> 16) & 0xff) / 255,
    ((num >> 8) & 0xff) / 255,
    (num & 0xff) / 255,
    1.0,
  ];
}

/** Строит GLB-буфер для куба в заданном RGBA. */
function buildCubeGlb(rgba) {
  const posBytes = Buffer.from(POSITIONS.buffer, POSITIONS.byteOffset, POSITIONS.byteLength);
  const normBytes = Buffer.from(NORMALS.buffer, NORMALS.byteOffset, NORMALS.byteLength);
  const idxBytes = Buffer.from(INDICES.buffer, INDICES.byteOffset, INDICES.byteLength);

  // bufferViews — POSITION | NORMAL | INDICES, каждый aligned к 4 байтам.
  const posOffset = 0;
  const posLength = posBytes.length;
  const normOffset = align4(posOffset + posLength);
  const normLength = normBytes.length;
  const idxOffset = align4(normOffset + normLength);
  const idxLength = idxBytes.length;
  const binLength = align4(idxOffset + idxLength);

  const binChunk = Buffer.alloc(binLength);
  posBytes.copy(binChunk, posOffset);
  normBytes.copy(binChunk, normOffset);
  idxBytes.copy(binChunk, idxOffset);

  const gltf = {
    asset: { version: '2.0', generator: 'Baby-funner cube-generator' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1 },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: rgba,
          metallicFactor: 0.1,
          roughnessFactor: 0.6,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: 8,
        type: 'VEC3',
        min: [-1, -1, -1],
        max: [1, 1, 1],
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 8,
        type: 'VEC3',
      },
      {
        bufferView: 2,
        componentType: 5123, // UNSIGNED_SHORT
        count: 36,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posLength, target: 34962 },
      { buffer: 0, byteOffset: normOffset, byteLength: normLength, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxLength, target: 34963 },
    ],
    buffers: [{ byteLength: binLength }],
  };

  // JSON chunk — padded пробелами до 4-байтного align.
  const jsonStr = JSON.stringify(gltf);
  const jsonBuf = Buffer.from(jsonStr, 'utf-8');
  const jsonPadLength = align4(jsonBuf.length);
  const jsonChunk = Buffer.alloc(jsonPadLength, 0x20); // space
  jsonBuf.copy(jsonChunk, 0);

  // Общий размер.
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;

  const out = Buffer.alloc(totalLength);
  let off = 0;
  // Header
  out.writeUInt32LE(0x46546c67, off); off += 4; // "glTF"
  out.writeUInt32LE(2, off); off += 4; // version
  out.writeUInt32LE(totalLength, off); off += 4; // total length
  // JSON chunk
  out.writeUInt32LE(jsonChunk.length, off); off += 4;
  out.writeUInt32LE(0x4e4f534a, off); off += 4; // "JSON"
  jsonChunk.copy(out, off); off += jsonChunk.length;
  // BIN chunk
  out.writeUInt32LE(binChunk.length, off); off += 4;
  out.writeUInt32LE(0x004e4942, off); off += 4; // "BIN\0"
  binChunk.copy(out, off);

  return out;
}

// ─── Биомы и их placeholder-цвета ─────────────────────────────────────────
const BIOME_COLORS = {
  farm: '#F4A261',    // оранжево-коричневый
  forest: '#8B5E3C',  // зелёно-коричневый
  savanna: '#E76F51', // тёпло-оранжевый
  sea: '#457B9D',     // морской синий
  jungle: '#52B788',  // джунглевый зелёный
  arctic: '#E0ECF4',  // ледяной белый
};

const outDir = path.resolve(__dirname, '..', 'mobile', 'assets', 'models');
fs.mkdirSync(outDir, { recursive: true });

for (const [biome, hex] of Object.entries(BIOME_COLORS)) {
  const rgba = hexToRgba(hex);
  const glb = buildCubeGlb(rgba);
  const out = path.join(outDir, `cube-${biome}.glb`);
  fs.writeFileSync(out, glb);
  console.log(`✓ cube-${biome}.glb (${glb.length} bytes, RGBA=${rgba.map((n) => n.toFixed(2)).join(',')})`);
}

console.log(`\nВсе кубы в ${outDir}`);
console.log('⚠️  Это placeholder. Для релиза — Quaternius Ultimate Animated Animals (CC0).');
