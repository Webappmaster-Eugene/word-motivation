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
        ...(input.summaryStats
          ? { summaryStats: input.summaryStats as Prisma.InputJsonValue }
          : {}),
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

  /**
   * Полный сброс прогресса ребёнка.
   *
   * Сносит:
   *  - все открытые животные (`UnlockedAnimal`);
   *  - все попытки в сессиях ребёнка (`Attempt`), потому что они ссылаются на
   *    сессию по `sessionId` (FK без ON DELETE CASCADE в prisma-схеме — удаляем
   *    вручную, чтобы не упасть на FK-constraint);
   *  - все сессии (`Session`).
   *
   * Выполняется в транзакции, чтобы либо всё сбросилось, либо ничего
   * (иначе zoo мог бы остаться пустым, но session-history сохранилась бы и
   * ребёнок увидел старые attempts).
   *
   * Возвращает количество удалённых записей по категориям — нужно для
   * UI-подтверждения и телеметрии.
   */
  async resetProgress(childId: string): Promise<{
    unlockedAnimals: number;
    sessions: number;
    attempts: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const sessions = await tx.session.findMany({
        where: { childId },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      const attempts = sessionIds.length
        ? await tx.attempt.deleteMany({ where: { sessionId: { in: sessionIds } } })
        : { count: 0 };
      const sessionsDeleted = sessionIds.length
        ? await tx.session.deleteMany({ where: { id: { in: sessionIds } } })
        : { count: 0 };
      const unlocked = await tx.unlockedAnimal.deleteMany({ where: { childId } });

      return {
        unlockedAnimals: unlocked.count,
        sessions: sessionsDeleted.count,
        attempts: attempts.count,
      };
    });
  }
}
