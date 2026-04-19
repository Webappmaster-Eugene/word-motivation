import { Test } from '@nestjs/testing';

import { PrismaService } from '../../common/prisma/prisma.service';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: queryRaw },
        },
      ],
    }).compile();
    controller = module.get(HealthController);
  });

  it('возвращает ok при живой БД', async () => {
    const result = await controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('ok');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('возвращает degraded при недоступной БД', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const result = await controller.getHealth();
    expect(result.status).toBe('degraded');
    expect(result.database).toBe('error');
  });
});
