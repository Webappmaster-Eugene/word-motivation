import { Injectable, NotFoundException } from '@nestjs/common';
import type { AttemptKind, Prisma, Session, UnlockedAnimal } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

export interface StartSessionInput {
  readonly childId: string;
  readonly gameId: string;
}

export interface EndSessionInput {
  readonly sessionId: string;
  readonly childId: string;
  readonly summaryStats?: Record<string, unknown>;
  readonly fsmSnapshot?: unknown;
}

export interface RecordAttemptInput {
  readonly sessionId: string;
  readonly childId: string;
  readonly kind: AttemptKind;
  readonly wordId?: string;
  readonly expected: string;
  readonly heard: string;
  readonly correct: boolean;
  readonly latencyMs?: number;
}

export interface UnlockAnimalInput {
  readonly childId: string;
  readonly animalId: string;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(input: StartSessionInput): Promise<Session> {
    return this.prisma.session.create({
      data: {
        childId: input.childId,
        gameId: input.gameId,
      },
    });
  }

  async endSession(input: EndSessionInput): Promise<Session> {
    const existing = await this.prisma.session.findUnique({ where: { id: input.sessionId } });
    if (!existing || existing.childId !== input.childId) {
      throw new NotFoundException('Сессия не найдена');
    }
    return this.prisma.session.update({
      where: { id: input.sessionId },
      data: {
        endedAt: new Date(),
        ...(input.summaryStats ? { summaryStats: input.summaryStats as Prisma.InputJsonValue } : {}),
        ...(input.fsmSnapshot !== undefined
          ? { fsmSnapshot: input.fsmSnapshot as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async recordAttempt(input: RecordAttemptInput): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: input.sessionId } });
    if (!session || session.childId !== input.childId) {
      throw new NotFoundException('Сессия не найдена');
    }
    await this.prisma.attempt.create({
      data: {
        sessionId: input.sessionId,
        kind: input.kind,
        wordId: input.wordId,
        expected: input.expected,
        heard: input.heard,
        correct: input.correct,
        latencyMs: input.latencyMs,
      },
    });
  }

  async unlockAnimal(input: UnlockAnimalInput): Promise<UnlockedAnimal> {
    return this.prisma.unlockedAnimal.upsert({
      where: {
        childId_animalId: {
          childId: input.childId,
          animalId: input.animalId,
        },
      },
      update: { visits: { increment: 1 } },
      create: {
        childId: input.childId,
        animalId: input.animalId,
      },
    });
  }

  listUnlocked(childId: string): Promise<UnlockedAnimal[]> {
    return this.prisma.unlockedAnimal.findMany({
      where: { childId },
      orderBy: { unlockedAt: 'desc' },
    });
  }
}
