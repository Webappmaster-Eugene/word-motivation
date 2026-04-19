import type { AgeBand } from '@prisma/client';

export class AuthPresenter {
  readonly token: string;
  readonly childId: string;
  readonly ageBand: AgeBand;

  constructor(params: { token: string; childId: string; ageBand: AgeBand }) {
    this.token = params.token;
    this.childId = params.childId;
    this.ageBand = params.ageBand;
  }
}
