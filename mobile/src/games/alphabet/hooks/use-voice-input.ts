import { useCallback, useEffect, useRef, useState } from 'react';

import { useService } from '@/services/di/provider';
import type { AsrEvent } from '@/services/speech-recognition/types';

import type { MicState } from '../components/mic-button';

const DEFAULT_MAX_DURATION_MS = 5000;

interface UseVoiceInputOptions {
  readonly active: boolean;
  readonly grammar?: readonly string[];
  readonly onFinal: (transcript: string, confidence: number) => void;
  readonly onError?: (message: string) => void;
}

interface UseVoiceInput {
  readonly micState: MicState;
  readonly transcript: string;
  readonly available: boolean;
  toggle(): void;
}

/**
 * Управляет жизненным циклом ASR-сессии.
 *  - `active` обозначает, что в текущем FSM-состоянии нужен voice (listen*).
 *  - Нажатие на MicButton → toggle() стартует/останавливает сессию.
 *  - Final-результат отдаёт через `onFinal`. Ошибка → через `onError`.
 */
export function useVoiceInput({ active, grammar, onFinal, onError }: UseVoiceInputOptions): UseVoiceInput {
  const asr = useService('speechRecognition');
  const [available, setAvailable] = useState(false);
  const [micState, setMicState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState('');

  // Замыкаем колбэки через ref, чтобы subscribe не пересоздавался на каждый рендер.
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  onFinalRef.current = onFinal;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    void asr.isAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [asr]);

  useEffect(() => {
    const handle = (event: AsrEvent) => {
      switch (event.type) {
        case 'partial':
          setTranscript(event.transcript);
          break;
        case 'final':
          setTranscript(event.transcript);
          setMicState('idle');
          onFinalRef.current(event.transcript, event.confidence);
          break;
        case 'error':
          setMicState('idle');
          onErrorRef.current?.(event.message);
          break;
        case 'vad':
          // пока только внутреннее состояние; можно вывести в UI отдельно
          break;
      }
    };
    const unsubscribe = asr.subscribe(handle);
    return () => {
      unsubscribe();
    };
  }, [asr]);

  // При смене активности (вход/выход из listen* FSM) — гасим сессию.
  useEffect(() => {
    if (!active && micState === 'listening') {
      void asr.stop();
      setMicState('idle');
    }
  }, [active, asr, micState]);

  const toggle = useCallback(() => {
    if (!available) return;
    if (micState === 'listening') {
      void asr.stop();
      setMicState('idle');
      return;
    }
    setTranscript('');
    setMicState('listening');
    void asr.start({
      lang: 'ru',
      grammar,
      maxDurationMs: DEFAULT_MAX_DURATION_MS,
    });
  }, [asr, available, grammar, micState]);

  return {
    micState: available ? micState : 'unavailable',
    transcript,
    available,
    toggle,
  };
}
