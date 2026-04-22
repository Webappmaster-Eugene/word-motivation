import type { Session, UnlockedAnimal } from '@prisma/client';

export class SessionPresenter {
  readonly id: string;
  readonly gameId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;

  constructor(session: Session) {
    this.id = session.id;
    this.gameId = session.gameId;
    this.startedAt = session.startedAt.toISOString();
    this.endedAt = session.endedAt ? session.endedAt.toISOString() : null;
  }
}

export class UnlockedAnimalPresenter {
  readonly animalId: string;
  readonly unlockedAt: string;
  readonly visits: number;

  constructor(u: UnlockedAnimal) {
    this.animalId = u.animalId;
    this.unlockedAt = u.unlockedAt.toISOString();
    this.visits = u.visits;
  }

  static collection(items: readonly UnlockedAnimal[]): UnlockedAnimalPresenter[] {
    return items.map((x) => new UnlockedAnimalPresenter(x));
  }
}

export class ResetProgressPresenter {
  readonly unlockedAnimals: number;
  readonly sessions: number;
  readonly attempts: number;

  constructor(params: {
    readonly unlockedAnimals: number;
    readonly sessions: number;
    readonly attempts: number;
  }) {
    this.unlockedAnimals = params.unlockedAnimals;
    this.sessions = params.sessions;
    this.attempts = params.attempts;
  }
}
