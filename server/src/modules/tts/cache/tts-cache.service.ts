import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../../config/env.schema';

import type { SileroVoice } from '../synthesizer/types';

export interface CacheKeyInput {
  readonly text: string;
  readonly voice: SileroVoice;
  readonly rate: number;
}

export interface CachedEntry {
  readonly hash: string;
  readonly absolutePath: string;
  readonly publicPath: string;
  readonly sizeBytes: number;
}

const FILE_EXT = '.wav';
const FILENAME_REGEX = /^[a-f0-9]{64}\.wav$/;

/**
 * Дисковый кеш синтезированных WAV-файлов.
 *
 * Стратегия:
 *  - Ключ = SHA-256(text + voice + rate). Детерминированно: одна и та же фраза
 *    всегда даёт одинаковый файл. 64 hex-символа → безопасно для имени файла,
 *    не требует кодирования.
 *  - Файлы лежат в `TTS_CACHE_DIR`. На диске, а не в Redis: WAV занимает
 *    50–250 КБ, Redis для такого — оверхед по памяти.
 *  - Serve — через Fastify static плагин, устанавливается в TtsModule при
 *    старте; URL вида `/tts/audio/{hash}.wav` с Cache-Control immutable.
 *  - LRU-эвикция по mtime: при превышении `TTS_MAX_CACHE_MB` сносим старейшие
 *    файлы. Эвикция триггерится асинхронно после каждой записи, чтобы не
 *    держать синтез-запрос.
 *
 * Concurrency-safety:
 *  - При миссе несколько параллельных запросов могут попытаться синтезировать
 *    одно и то же. Для дедупликации ведём `inFlight` map: вторая попытка
 *    присоединяется к первой promise.
 */
@Injectable()
export class TtsCacheService implements OnModuleInit {
  private readonly logger = new Logger(TtsCacheService.name);
  private readonly cacheDir: string;
  private readonly maxBytes: number;
  private readonly inFlight = new Map<string, Promise<CachedEntry>>();
  /**
   * `false` если директория кеша недоступна (нет прав / volume не смонтирован /
   * диск полный). В этом режиме `lookup`/`store` ведут себя как no-op — клиенты
   * получают всегда cache-miss, синтез идёт каждый раз. Это graceful fallback,
   * чтобы сервер запускался даже при misconfig (например, volume owned by root
   * в non-root контейнере — ровно тот кейс что сломал Dokploy 22-04-2026).
   */
  private usable = false;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.cacheDir = this.config.get('TTS_CACHE_DIR', { infer: true });
    const mb = this.config.get('TTS_MAX_CACHE_MB', { infer: true });
    this.maxBytes = mb * 1024 * 1024;
  }

  async onModuleInit(): Promise<void> {
    // Если TTS глобально выключен — не трогаем файловую систему.
    // Стартуем сервер даже на read-only / misconfigured volume'ах.
    const ttsEnabled = this.config.get('TTS_ENABLED', { infer: true });
    if (!ttsEnabled) {
      this.logger.warn('TTS отключён (TTS_ENABLED=false), кеш не инициализируется');
      return;
    }

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const probe = path.join(this.cacheDir, '.write-probe');
      await fs.writeFile(probe, '');
      await fs.unlink(probe);
      this.usable = true;
      this.logger.log(`TTS-кеш: ${this.cacheDir} (лимит ${this.maxBytes / 1024 / 1024} МБ)`);
    } catch (err) {
      // Не бросаем — бут должен пройти. Логируем громко, чтобы заметили в логах.
      this.logger.error(
        `TTS-кеш недоступен (${this.cacheDir}): ${
          err instanceof Error ? err.message : String(err)
        }. Синтез будет работать без кеша (каждый запрос = новый вызов Silero).`,
      );
      this.usable = false;
    }
  }

  /** true — если директория успешно проверена при старте и готова к записи. */
  isUsable(): boolean {
    return this.usable;
  }

  hashKey(input: CacheKeyInput): string {
    const normalized = `${input.voice}|${input.rate.toFixed(2)}|${input.text.normalize('NFC')}`;
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Ищет файл в кеше. Быстро: один `stat`.
   * Если кеш помечен как unusable — всегда возвращаем null (клиент пойдёт на синтез).
   */
  async lookup(hash: string): Promise<CachedEntry | null> {
    if (!this.usable) return null;
    const absolutePath = this.absolutePathFor(hash);
    try {
      const st = await fs.stat(absolutePath);
      if (!st.isFile()) return null;
      // Touch файла, чтобы LRU по mtime работала корректно: получил hit →
      // файл «свежий», не должен вылететь следующим.
      void fs.utimes(absolutePath, new Date(), new Date()).catch(() => {
        /* не критично */
      });
      return {
        hash,
        absolutePath,
        publicPath: this.publicPathFor(hash),
        sizeBytes: st.size,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  /**
   * Атомарно сохраняет WAV в кеш. Пишем в временный файл + rename — чтобы
   * параллельный `lookup` не увидел полу-записанный файл.
   *
   * Если кеш unusable — возвращаем entry, указывающий в несуществующий путь.
   * Клиентский `/tts/audio/{hash}.wav` вернёт 404, но сам синтез-запрос
   * не упадёт. Это не идеально (повторный POST снова синтезирует), но лучше,
   * чем 500 при misconfigured volume.
   */
  async store(hash: string, audio: Buffer): Promise<CachedEntry> {
    const absolutePath = this.absolutePathFor(hash);
    if (!this.usable) {
      return {
        hash,
        absolutePath,
        publicPath: this.publicPathFor(hash),
        sizeBytes: audio.length,
      };
    }
    const tmpPath = `${absolutePath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmpPath, audio);
    await fs.rename(tmpPath, absolutePath);

    // Эвикция — асинхронно, не блокируем ответ клиенту.
    void this.evictIfOverLimit().catch((err) => {
      this.logger.warn(`Ошибка эвикции кеша: ${this.messageOf(err)}`);
    });

    return {
      hash,
      absolutePath,
      publicPath: this.publicPathFor(hash),
      sizeBytes: audio.length,
    };
  }

  /**
   * Дедуплицирует параллельные синтез-запросы для одного и того же ключа:
   * первый запрос выполняет `producer`, остальные ждут его результат.
   */
  async dedupe(hash: string, producer: () => Promise<CachedEntry>): Promise<CachedEntry> {
    const existing = this.inFlight.get(hash);
    if (existing) return existing;
    const task = producer().finally(() => {
      this.inFlight.delete(hash);
    });
    this.inFlight.set(hash, task);
    return task;
  }

  /** Абсолютный путь к файлу по хэшу. Используется также в `safeResolve` controller'а. */
  absolutePathFor(hash: string): string {
    return path.join(this.cacheDir, `${hash}${FILE_EXT}`);
  }

  publicPathFor(hash: string): string {
    return `/tts/audio/${hash}${FILE_EXT}`;
  }

  /**
   * Проверка имени файла для защиты от path-traversal в контроллере.
   * Принимаем только `[0-9a-f]{64}.wav` — ровно то, что мы сами генерируем.
   */
  isValidFilename(name: string): boolean {
    return FILENAME_REGEX.test(name);
  }

  private async evictIfOverLimit(): Promise<void> {
    const files = await this.listCacheFiles();
    let totalBytes = 0;
    for (const f of files) totalBytes += f.size;
    if (totalBytes <= this.maxBytes) return;

    // Сортируем по возрастанию mtime — старые идут первыми.
    files.sort((a, b) => a.mtimeMs - b.mtimeMs);

    let freed = 0;
    const toFree = totalBytes - this.maxBytes;
    for (const f of files) {
      if (freed >= toFree) break;
      try {
        await fs.unlink(f.path);
        freed += f.size;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          this.logger.warn(`Не удалось удалить ${f.path}: ${this.messageOf(err)}`);
        }
      }
    }
    if (freed > 0) {
      this.logger.log(`TTS-кеш: эвикция освободила ${Math.round(freed / 1024)} КБ`);
    }
  }

  private async listCacheFiles(): Promise<
    Array<{ path: string; size: number; mtimeMs: number }>
  > {
    const entries = await fs.readdir(this.cacheDir, { withFileTypes: true });
    const results: Array<{ path: string; size: number; mtimeMs: number }> = [];
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith(FILE_EXT)) continue;
      const p = path.join(this.cacheDir, e.name);
      try {
        const st = await fs.stat(p);
        results.push({ path: p, size: st.size, mtimeMs: st.mtimeMs });
      } catch {
        /* файл исчез — игнорируем */
      }
    }
    return results;
  }

  private messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
