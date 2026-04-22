import { promises as fs } from 'node:fs';

import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard';

import { TtsCacheService } from './cache/tts-cache.service';
import { synthesizeSchema, type SynthesizeDto } from './dto/synthesize.schema';
import { SynthesizePresenter } from './presenter/synthesize.presenter';
import { TtsService } from './tts.service';

/**
 * Два endpoint'а:
 *
 *  - `POST /tts/synthesize` — JWT-guarded, rate-limited. Принимает текст,
 *    возвращает URL готового WAV-файла в кеше.
 *  - `GET /tts/audio/:filename` — ПУБЛИЧНЫЙ, отдаёт статический файл из кеша.
 *    Почему без JWT: содержимое — озвучка игровой фразы, не PII; имя файла —
 *    sha256-хэш, перебрать невозможно. Проверяем только формат имени
 *    (anti path-traversal) и существование файла.
 *
 * Раздельные endpoint'ы (вместо streaming в ответе `/synthesize`) нужны для:
 *  1. Кешируемости на стороне браузера — `Cache-Control: immutable`.
 *  2. Повторного воспроизведения без повторного HTTP-hit'а.
 *  3. Простоты интеграции с <audio> / `expo-av` / nginx-прокси.
 */
@Controller('tts')
export class TtsController {
  constructor(
    private readonly tts: TtsService,
    private readonly cache: TtsCacheService,
  ) {}

  @Post('synthesize')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  async synthesize(
    @Req() _req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(synthesizeSchema)) body: SynthesizeDto,
  ): Promise<SynthesizePresenter> {
    const result = await this.tts.synthesize({
      text: body.text,
      voice: body.voice,
      rate: body.rate,
    });
    return new SynthesizePresenter(result);
  }

  @Get('audio/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('Content-Type', 'audio/wav')
  @Header('X-Content-Type-Options', 'nosniff')
  async getAudio(@Param('filename') filename: string): Promise<Buffer> {
    if (!this.cache.isValidFilename(filename)) {
      // Неверное имя — сразу 404, не даём даже намёка на структуру кеша.
      throw new NotFoundException('Аудиофайл не найден');
    }
    const hash = filename.replace(/\.wav$/, '');
    const absolutePath = this.cache.absolutePathFor(hash);

    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) {
        throw new NotFoundException('Аудиофайл не найден');
      }
      // Возвращаем Buffer — Fastify (@nestjs/platform-fastify) отдаёт его как
      // сырые байты с теми Content-Type/Cache-Control, что мы прописали выше.
      return fs.readFile(absolutePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Аудиофайл не найден');
      }
      throw err;
    }
  }
}
