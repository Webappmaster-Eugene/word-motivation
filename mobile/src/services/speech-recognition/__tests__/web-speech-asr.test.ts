/**
 * Тесты адаптера Web Speech API.
 * Мокаем `SpeechRecognition` ctor как простой event-bus.
 */

import type { AsrEvent } from '../types';
import { WebSpeechAsr } from '../web-speech-asr';

interface MockResult {
  readonly transcript: string;
  readonly confidence: number;
}

type Listener = (...args: unknown[]) => void;

class MockRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: Listener | null = null;
  onerror: Listener | null = null;
  onspeechstart: Listener | null = null;
  onspeechend: Listener | null = null;
  onstart: Listener | null = null;
  onend: Listener | null = null;

  static instances: MockRecognition[] = [];

  constructor() {
    MockRecognition.instances.push(this);
  }

  start = jest.fn(() => {
    // имитация асинхронности: немедленно вызываем onstart
    this.onstart?.({});
  });
  stop = jest.fn(() => {
    this.onend?.({});
  });
  abort = jest.fn(() => {
    this.onend?.({});
  });

  emitInterim(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: Object.assign([Object.assign([{ transcript, confidence: 0.5 }], { isFinal: false })], {
        length: 1,
      }),
    });
  }

  emitFinal(results: readonly MockResult[]) {
    const list = Object.assign([...results], { isFinal: true });
    this.onresult?.({
      resultIndex: 0,
      results: Object.assign([list], { length: 1 }),
    });
  }

  emitError(error: string, message?: string) {
    this.onerror?.({ error, message });
  }
}

describe('WebSpeechAsr', () => {
  const originalSR = (globalThis as Record<string, unknown>).SpeechRecognition;

  beforeEach(() => {
    MockRecognition.instances = [];
    (globalThis as Record<string, unknown>).SpeechRecognition = MockRecognition;
  });

  afterAll(() => {
    (globalThis as Record<string, unknown>).SpeechRecognition = originalSR;
  });

  it('isSupported возвращает true когда есть конструктор', () => {
    expect(WebSpeechAsr.isSupported()).toBe(true);
  });

  it('isSupported возвращает false если ни одной реализации нет', () => {
    (globalThis as Record<string, unknown>).SpeechRecognition = undefined;
    (globalThis as Record<string, unknown>).webkitSpeechRecognition = undefined;
    expect(WebSpeechAsr.isSupported()).toBe(false);
  });

  it('start() создаёт recognizer с lang=ru-RU и interimResults', async () => {
    const asr = new WebSpeechAsr();
    await asr.start({ lang: 'ru' });
    const instance = MockRecognition.instances[0];
    expect(instance).toBeDefined();
    expect(instance!.lang).toBe('ru-RU');
    expect(instance!.interimResults).toBe(true);
  });

  it('эмиттит partial → final при распознавании', async () => {
    const events: AsrEvent[] = [];
    const asr = new WebSpeechAsr();
    asr.subscribe((e) => events.push(e));
    await asr.start({ lang: 'ru' });
    const rec = MockRecognition.instances[0]!;

    rec.emitInterim('соб');
    rec.emitFinal([{ transcript: 'собака', confidence: 0.92 }]);

    const kinds = events.map((e) => e.type);
    expect(kinds).toEqual(expect.arrayContaining(['partial', 'final']));
    const final = events.find((e) => e.type === 'final');
    expect(final).toEqual({ type: 'final', transcript: 'собака', confidence: 0.92 });
  });

  it('onerror с `aborted` не приходит наружу', async () => {
    const events: AsrEvent[] = [];
    const asr = new WebSpeechAsr();
    asr.subscribe((e) => events.push(e));
    await asr.start({ lang: 'ru' });
    const rec = MockRecognition.instances[0]!;

    rec.emitError('aborted');
    expect(events.filter((e) => e.type === 'error')).toHaveLength(0);
  });

  it('реальная ошибка доходит до подписчика', async () => {
    const events: AsrEvent[] = [];
    const asr = new WebSpeechAsr();
    asr.subscribe((e) => events.push(e));
    await asr.start({ lang: 'ru' });
    const rec = MockRecognition.instances[0]!;

    rec.emitError('not-allowed', 'Microphone permission denied');
    const error = events.find((e) => e.type === 'error');
    expect(error).toMatchObject({ type: 'error', message: 'Microphone permission denied' });
  });

  it('stop() вызывает нативный stop()', async () => {
    const asr = new WebSpeechAsr();
    await asr.start({ lang: 'ru' });
    const rec = MockRecognition.instances[0]!;
    await asr.stop();
    expect(rec.stop).toHaveBeenCalledTimes(1);
  });

  it('повторный start() прерывает предыдущую сессию', async () => {
    const asr = new WebSpeechAsr();
    await asr.start({ lang: 'ru' });
    await asr.start({ lang: 'ru' });
    const [first, second] = MockRecognition.instances;
    expect(first!.abort).toHaveBeenCalledTimes(1);
    expect(second).toBeDefined();
  });

  it('unsubscribe отписывает слушателя', async () => {
    const events: AsrEvent[] = [];
    const asr = new WebSpeechAsr();
    const unsub = asr.subscribe((e) => events.push(e));
    unsub();
    await asr.start({ lang: 'ru' });
    MockRecognition.instances[0]!.emitFinal([{ transcript: 'x', confidence: 1 }]);
    expect(events).toHaveLength(0);
  });

  it('maxDurationMs автоматически останавливает сессию', async () => {
    jest.useFakeTimers();
    try {
      const asr = new WebSpeechAsr();
      await asr.start({ lang: 'ru', maxDurationMs: 1000 });
      const rec = MockRecognition.instances[0]!;
      jest.advanceTimersByTime(1200);
      expect(rec.stop).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
