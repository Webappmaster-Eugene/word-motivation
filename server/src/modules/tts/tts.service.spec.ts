import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { TtsCacheService, type CachedEntry } from './cache/tts-cache.service';
import { SYNTHESIZER } from './synthesizer/synthesizer.token';
import { SynthesisError, type Synthesizer } from './synthesizer/types';
import { TtsService } from './tts.service';

function makeCachedEntry(hash: string, size: number): CachedEntry {
  return {
    hash,
    absolutePath: `/tmp/${hash}.wav`,
    publicPath: `/tts/audio/${hash}.wav`,
    sizeBytes: size,
  };
}

function mockConfig(overrides: { enabled: boolean; voice: string }): ConfigService {
  return {
    get: (key: string) => {
      if (key === 'TTS_ENABLED') return overrides.enabled;
      if (key === 'TTS_DEFAULT_VOICE') return overrides.voice;
      throw new Error(`mockConfig: неизвестный ключ ${key}`);
    },
  } as unknown as ConfigService;
}

interface Mocks {
  service: TtsService;
  synthesizer: jest.Mocked<Synthesizer>;
  cache: {
    hashKey: jest.Mock;
    lookup: jest.Mock;
    store: jest.Mock;
    dedupe: jest.Mock;
  };
}

async function build(enabled = true): Promise<Mocks> {
  const synthesizer: jest.Mocked<Synthesizer> = {
    synthesize: jest.fn(),
    isHealthy: jest.fn().mockResolvedValue(true),
  };
  const cache = {
    hashKey: jest.fn().mockReturnValue('abc123'),
    lookup: jest.fn(),
    store: jest.fn(),
    // dedupe просто вызывает producer, без настоящей дедупликации — её
    // проверяем в cache.spec.ts.
    dedupe: jest.fn(async (_hash: string, producer: () => Promise<CachedEntry>) => producer()),
  };

  const module = await Test.createTestingModule({
    providers: [
      TtsService,
      { provide: SYNTHESIZER, useValue: synthesizer },
      { provide: TtsCacheService, useValue: cache },
      { provide: ConfigService, useValue: mockConfig({ enabled, voice: 'xenia' }) },
    ],
  }).compile();

  return {
    service: module.get(TtsService),
    synthesizer,
    cache,
  };
}

describe('TtsService', () => {
  it('cache hit — не вызывает синтезатор', async () => {
    const { service, synthesizer, cache } = await build();
    cache.lookup.mockResolvedValueOnce(makeCachedEntry('abc123', 500));

    const result = await service.synthesize({ text: 'привет' });

    expect(result.cached).toBe(true);
    expect(result.url).toBe('/tts/audio/abc123.wav');
    expect(result.voice).toBe('xenia');
    expect(synthesizer.synthesize).not.toHaveBeenCalled();
  });

  it('cache miss — вызывает синтезатор и сохраняет результат', async () => {
    const { service, synthesizer, cache } = await build();
    cache.lookup.mockResolvedValue(null);
    synthesizer.synthesize.mockResolvedValueOnce({
      audio: Buffer.alloc(1024),
      sampleRate: 24000,
    });
    cache.store.mockResolvedValueOnce(makeCachedEntry('abc123', 1024));

    const result = await service.synthesize({ text: 'привет', voice: 'baya' });

    expect(synthesizer.synthesize).toHaveBeenCalledWith({
      text: 'привет',
      voice: 'baya',
      rate: 1,
    });
    expect(cache.store).toHaveBeenCalledWith('abc123', expect.any(Buffer));
    expect(result.cached).toBe(false);
    expect(result.voice).toBe('baya');
    expect(result.sizeBytes).toBe(1024);
  });

  it('квантует rate до шага 0.05', async () => {
    const { service, synthesizer, cache } = await build();
    cache.lookup.mockResolvedValue(null);
    synthesizer.synthesize.mockResolvedValue({ audio: Buffer.alloc(100), sampleRate: 24000 });
    cache.store.mockResolvedValue(makeCachedEntry('abc', 100));

    await service.synthesize({ text: 't', rate: 0.923 });
    // 0.923 округляется до 0.90 (шаг 0.05).
    expect(synthesizer.synthesize).toHaveBeenCalledWith(expect.objectContaining({ rate: 0.9 }));
  });

  it('rate за пределами [0.5; 1.5] клипается', async () => {
    const { service, synthesizer, cache } = await build();
    cache.lookup.mockResolvedValue(null);
    synthesizer.synthesize.mockResolvedValue({ audio: Buffer.alloc(100), sampleRate: 24000 });
    cache.store.mockResolvedValue(makeCachedEntry('abc', 100));

    await service.synthesize({ text: 't', rate: 3.0 });
    expect(synthesizer.synthesize).toHaveBeenCalledWith(expect.objectContaining({ rate: 1.5 }));

    await service.synthesize({ text: 't', rate: 0.01 });
    expect(synthesizer.synthesize).toHaveBeenLastCalledWith(expect.objectContaining({ rate: 0.5 }));
  });

  it('503 при TTS_ENABLED=false', async () => {
    const { service, synthesizer } = await build(/* enabled */ false);
    await expect(service.synthesize({ text: 'x' })).rejects.toThrow(ServiceUnavailableException);
    expect(synthesizer.synthesize).not.toHaveBeenCalled();
  });

  it('падение синтезатора превращается в ServiceUnavailableException', async () => {
    const { service, synthesizer, cache } = await build();
    cache.lookup.mockResolvedValue(null);
    synthesizer.synthesize.mockRejectedValueOnce(new SynthesisError('worker down'));

    await expect(service.synthesize({ text: 'привет' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('повторный lookup внутри dedupe подхватывает результат предыдущего запроса', async () => {
    const { service, synthesizer, cache } = await build();
    // Первый lookup — null (так мы попали в producer), второй внутри dedupe —
    // уже нашёл (предыдущий запрос успел записать).
    cache.lookup.mockResolvedValueOnce(null).mockResolvedValueOnce(makeCachedEntry('abc123', 250));

    const result = await service.synthesize({ text: 'двойной' });

    expect(synthesizer.synthesize).not.toHaveBeenCalled();
    expect(result.cached).toBe(false); // внутри dedupe это всё ещё «свежий» результат
    expect(result.sizeBytes).toBe(250);
  });
});
