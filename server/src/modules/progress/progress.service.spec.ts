import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../common/prisma/prisma.service';

import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let session: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  let attempt: { create: jest.Mock; deleteMany: jest.Mock };
  let unlocked: { upsert: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock };
  let $transaction: jest.Mock;

  beforeEach(async () => {
    session = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    };
    attempt = { create: jest.fn(), deleteMany: jest.fn() };
    unlocked = { upsert: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() };
    // transaction-обёртка пробрасывает тот же мок-клиент в callback
    $transaction = jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({ session, attempt, unlockedAnimal: unlocked }),
    );
    const module = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: PrismaService,
          useValue: { session, attempt, unlockedAnimal: unlocked, $transaction },
        },
      ],
    }).compile();
    service = module.get(ProgressService);
  });

  it('startSession создаёт запись', async () => {
    session.create.mockResolvedValueOnce({ id: 's1' });
    await service.startSession({ childId: 'c1', gameId: 'alphabet' });
    expect(session.create).toHaveBeenCalledWith({
      data: { childId: 'c1', gameId: 'alphabet' },
    });
  });

  it('endSession требует совпадения childId', async () => {
    session.findUnique.mockResolvedValueOnce({ id: 's1', childId: 'other' });
    await expect(service.endSession({ sessionId: 's1', childId: 'c1' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('endSession обновляет запись', async () => {
    session.findUnique.mockResolvedValueOnce({ id: 's1', childId: 'c1' });
    session.update.mockResolvedValueOnce({ id: 's1' });
    await service.endSession({
      sessionId: 's1',
      childId: 'c1',
      summaryStats: { correct: 10 },
      fsmSnapshot: { state: 'done' },
    });
    expect(session.update).toHaveBeenCalledTimes(1);
    const args = session.update.mock.calls[0]![0] as {
      data: { summaryStats: unknown; fsmSnapshot: unknown; endedAt: Date };
    };
    expect(args.data.summaryStats).toEqual({ correct: 10 });
    expect(args.data.fsmSnapshot).toEqual({ state: 'done' });
    expect(args.data.endedAt).toBeInstanceOf(Date);
  });

  it('recordAttempt проверяет владельца сессии', async () => {
    session.findUnique.mockResolvedValueOnce({ id: 's1', childId: 'other' });
    await expect(
      service.recordAttempt({
        sessionId: 's1',
        childId: 'c1',
        kind: 'LETTER',
        expected: 'с',
        heard: 'с',
        correct: true,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('recordAttempt создаёт attempt при валидной сессии', async () => {
    session.findUnique.mockResolvedValueOnce({ id: 's1', childId: 'c1' });
    await service.recordAttempt({
      sessionId: 's1',
      childId: 'c1',
      kind: 'LETTER',
      expected: 'с',
      heard: 'с',
      correct: true,
    });
    expect(attempt.create).toHaveBeenCalledTimes(1);
  });

  it('unlockAnimal upsert инкрементит visits при повторной разблокировке', async () => {
    unlocked.upsert.mockResolvedValueOnce({ childId: 'c1', animalId: 'dog', visits: 2 });
    await service.unlockAnimal({ childId: 'c1', animalId: 'dog' });
    const args = unlocked.upsert.mock.calls[0]![0] as { update: { visits: unknown } };
    expect(args.update).toMatchObject({ visits: { increment: 1 } });
  });

  it('listUnlocked возвращает список по childId', async () => {
    unlocked.findMany.mockResolvedValueOnce([{ animalId: 'dog' }]);
    const result = await service.listUnlocked('c1');
    expect(result).toEqual([{ animalId: 'dog' }]);
    expect(unlocked.findMany).toHaveBeenCalledWith({
      where: { childId: 'c1' },
      orderBy: { unlockedAt: 'desc' },
    });
  });

  describe('resetProgress', () => {
    it('сносит сессии, попытки и открытых животных в транзакции', async () => {
      session.findMany.mockResolvedValueOnce([{ id: 's1' }, { id: 's2' }]);
      attempt.deleteMany.mockResolvedValueOnce({ count: 4 });
      session.deleteMany.mockResolvedValueOnce({ count: 2 });
      unlocked.deleteMany.mockResolvedValueOnce({ count: 3 });

      const result = await service.resetProgress('c1');

      expect($transaction).toHaveBeenCalledTimes(1);
      expect(session.findMany).toHaveBeenCalledWith({
        where: { childId: 'c1' },
        select: { id: true },
      });
      expect(attempt.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: { in: ['s1', 's2'] } },
      });
      expect(session.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['s1', 's2'] } } });
      expect(unlocked.deleteMany).toHaveBeenCalledWith({ where: { childId: 'c1' } });
      expect(result).toEqual({ unlockedAnimals: 3, sessions: 2, attempts: 4 });
    });

    it('корректно обрабатывает ребёнка без истории сессий', async () => {
      session.findMany.mockResolvedValueOnce([]);
      unlocked.deleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await service.resetProgress('c1');

      expect(attempt.deleteMany).not.toHaveBeenCalled();
      expect(session.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ unlockedAnimals: 0, sessions: 0, attempts: 0 });
    });
  });
});
