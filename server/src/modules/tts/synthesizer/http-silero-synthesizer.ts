import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../../config/env.schema';

import {
  SynthesisError,
  type SynthesizeRequest,
  type SynthesizeResult,
  type Synthesizer,
} from './types';

/**
 * Реализация `Synthesizer` поверх HTTP — общается с Python-sidecar'ом
 * `tts-worker`, который загружает Silero-модель в память при старте и отвечает
 * на `POST /synthesize` бинарным WAV.
 *
 * Sidecar слушает на `TTS_WORKER_URL` (по умолчанию http://tts-worker:5000).
 * Доступен только по внутренней docker-сети — наружу не выставляется.
 */
@Injectable()
export class HttpSileroSynthesizer implements Synthesizer {
  private readonly logger = new Logger(HttpSileroSynthesizer.name);
  private readonly workerUrl: string;
  private readonly timeoutMs: number;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.workerUrl = this.config.get('TTS_WORKER_URL', { infer: true });
    this.timeoutMs = this.config.get('TTS_REQUEST_TIMEOUT_MS', { infer: true });
  }

  async synthesize(req: SynthesizeRequest): Promise<SynthesizeResult> {
    const url = `${this.workerUrl}/synthesize`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/octet-stream' },
          body: JSON.stringify({
            text: req.text,
            voice: req.voice,
            rate: req.rate,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new SynthesisError(`Silero worker timeout (${this.timeoutMs} мс)`, err);
        }
        throw new SynthesisError(`Silero worker недоступен: ${this.messageOf(err)}`, err);
      }

      if (!response.ok) {
        const detail = await this.safeText(response);
        throw new SynthesisError(
          `Silero worker вернул ${response.status}: ${detail || '<no body>'}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audio = Buffer.from(arrayBuffer);
      if (audio.length < 44) {
        // WAV header сам занимает 44 байта — значит вернулось что-то битое.
        throw new SynthesisError('Silero вернул слишком маленький WAV');
      }

      const sampleRate = this.readWavSampleRate(audio);
      return { audio, sampleRate };
    } finally {
      clearTimeout(timer);
    }
  }

  async isHealthy(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_000);
    try {
      const res = await fetch(`${this.workerUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      return res.ok;
    } catch (err) {
      this.logger.debug(`health-check tts-worker упал: ${this.messageOf(err)}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * WAV RIFF header: sampleRate — little-endian uint32 по смещению 24.
   * Нужен для корректной записи кеш-файла и телеметрии.
   */
  private readWavSampleRate(buf: Buffer): number {
    if (buf.length < 28) return 24_000;
    return buf.readUInt32LE(24);
  }

  private async safeText(res: Response): Promise<string> {
    try {
      return (await res.text()).slice(0, 500);
    } catch {
      return '';
    }
  }

  private messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
