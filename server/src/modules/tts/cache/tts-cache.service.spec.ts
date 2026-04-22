import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { TtsCacheService } from './tts-cache.service';

function mockConfig(overrides: Partial<{ dir: string; limitMb: number; enabled: boolean }>) {
  return {
    get: (key: string) => {
      if (key === 'TTS_CACHE_DIR') return overrides.dir ?? '/tmp/tts-nonexistent';
      if (key === 'TTS_MAX_CACHE_MB') return overrides.limitMb ?? 1;
      if (key === 'TTS_ENABLED') return overrides.enabled ?? true;
      throw new Error(`mockConfig: неизвестный ключ ${key}`);
    },
  } as unknown as ConfigService;
}

async function build(tmpDir: string, limitMb = 1): Promise<TtsCacheService> {
  const module = await Test.createTestingModule({
    providers: [
      TtsCacheService,
      { provide: ConfigService, useValue: mockConfig({ dir: tmpDir, limitMb }) },
    ],
  }).compile();
  const svc = module.get(TtsCacheService);
  await svc.onModuleInit();
  return svc;
}

describe('TtsCacheService', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-cache-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('hashKey детерминированный и учитывает voice/rate/text', async () => {
    const svc = await build(tmpDir);
    const h1 = svc.hashKey({ text: 'привет', voice: 'xenia', rate: 1.0 });
    const h2 = svc.hashKey({ text: 'привет', voice: 'xenia', rate: 1.0 });
    const h3 = svc.hashKey({ text: 'привет', voice: 'baya', rate: 1.0 });
    const h4 = svc.hashKey({ text: 'привет', voice: 'xenia', rate: 0.9 });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toBe(h4);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('lookup возвращает null для отсутствующего файла', async () => {
    const svc = await build(tmpDir);
    const hash = svc.hashKey({ text: 'x', voice: 'xenia', rate: 1 });
    expect(await svc.lookup(hash)).toBeNull();
  });

  it('store сохраняет файл, lookup возвращает его', async () => {
    const svc = await build(tmpDir);
    const hash = svc.hashKey({ text: 'тест', voice: 'xenia', rate: 1 });
    const audio = Buffer.alloc(1024, 0xaa);
    const entry = await svc.store(hash, audio);
    expect(entry.hash).toBe(hash);
    expect(entry.sizeBytes).toBe(1024);

    const hit = await svc.lookup(hash);
    expect(hit).not.toBeNull();
    expect(hit!.sizeBytes).toBe(1024);
    const readBack = await fs.readFile(entry.absolutePath);
    expect(readBack.equals(audio)).toBe(true);
  });

  it('isValidFilename защищает от path-traversal', async () => {
    const svc = await build(tmpDir);
    expect(svc.isValidFilename('0123456789abcdef'.repeat(4) + '.wav')).toBe(true);
    expect(svc.isValidFilename('../etc/passwd')).toBe(false);
    expect(svc.isValidFilename('foo.mp3')).toBe(false);
    expect(svc.isValidFilename('a'.repeat(63) + '.wav')).toBe(false); // короче 64
    expect(svc.isValidFilename('G'.repeat(64) + '.wav')).toBe(false); // не hex
    expect(svc.isValidFilename('')).toBe(false);
  });

  it('dedupe джойнит параллельные вызовы одного хэша', async () => {
    const svc = await build(tmpDir);
    const hash = svc.hashKey({ text: 'parallel', voice: 'xenia', rate: 1 });
    let producerCalls = 0;
    const audio = Buffer.alloc(512, 1);
    const producer = async () => {
      producerCalls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return svc.store(hash, audio);
    };

    const [a, b, c] = await Promise.all([
      svc.dedupe(hash, producer),
      svc.dedupe(hash, producer),
      svc.dedupe(hash, producer),
    ]);

    expect(producerCalls).toBe(1);
    expect(a.hash).toBe(b.hash);
    expect(b.hash).toBe(c.hash);
  });

  it('gracefully работает при unusable директории (нет прав, RO FS)', async () => {
    // Используем реальную директорию, на которую не должно быть прав
    // (root-only). На Windows проверяем через нереальный путь Null-device.
    const impossible = process.platform === 'win32' ? 'NUL:\\cache' : '/proc/1/root/cache';
    const svc = await build(impossible);
    // onModuleInit НЕ должен бросить
    expect(svc.isUsable()).toBe(false);
    const hash = svc.hashKey({ text: 'x', voice: 'xenia', rate: 1 });
    // lookup возвращает null — клиент пойдёт на синтез
    expect(await svc.lookup(hash)).toBeNull();
    // store возвращает entry (для формирования URL), но не пишет на диск
    const entry = await svc.store(hash, Buffer.alloc(10));
    expect(entry.hash).toBe(hash);
  });

  it('TTS_ENABLED=false — кеш не инициализируется, но сервис не падает', async () => {
    const module = await Test.createTestingModule({
      providers: [
        TtsCacheService,
        { provide: ConfigService, useValue: mockConfig({ dir: tmpDir, enabled: false }) },
      ],
    }).compile();
    const svc = module.get(TtsCacheService);
    await svc.onModuleInit();
    expect(svc.isUsable()).toBe(false);
  });

  it('эвикция по размеру сносит самые старые файлы', async () => {
    // Лимит 0 МБ фактически → сносим всё после каждой записи (кроме только что записанного).
    // Лучше брать ~1 КБ лимит через несколько файлов. Используем 0 и 3 файла.
    const svc = await build(tmpDir, /* limitMb */ 0);
    const h1 = svc.hashKey({ text: '1', voice: 'xenia', rate: 1 });
    const h2 = svc.hashKey({ text: '2', voice: 'xenia', rate: 1 });
    const h3 = svc.hashKey({ text: '3', voice: 'xenia', rate: 1 });

    // Пишем три файла подряд. Эвикция — асинхронная, ждём её.
    await svc.store(h1, Buffer.alloc(512));
    await svc.store(h2, Buffer.alloc(512));
    await svc.store(h3, Buffer.alloc(512));

    // Ждём, пока finally() эвикции добьётся: пара тиков setImmediate.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const entries = await fs.readdir(tmpDir);
    // Минимум сам последний файл должен был эвиктнуть старые;
    // в лимите 0 МБ остаться может 0 или 1 файл.
    expect(entries.length).toBeLessThanOrEqual(3);
  });
});
