import type { SileroVoice } from '../synthesizer/types';
import type { SynthesizeOutput } from '../tts.service';

export class SynthesizePresenter {
  readonly url: string;
  readonly hash: string;
  readonly voice: SileroVoice;
  readonly rate: number;
  readonly cached: boolean;
  readonly sizeBytes: number;

  constructor(output: SynthesizeOutput) {
    this.url = output.url;
    this.hash = output.hash;
    this.voice = output.voice;
    this.rate = output.rate;
    this.cached = output.cached;
    this.sizeBytes = output.sizeBytes;
  }
}
