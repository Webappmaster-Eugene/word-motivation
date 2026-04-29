import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../common/prisma/prisma.service';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let upsert: jest.Mock;
  let sign: jest.Mock;
  let verify: jest.Mock;

  beforeEach(async () => {
    upsert = jest.fn();
    sign = jest.fn().mockReturnValue('signed.jwt.token');
    verify = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { child: { upsert } },
        },
        {
          provide: JwtService,
          useValue: { sign, verifyAsync: verify },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'DEVICE_ID_SALT') return 'test-salt-very-random';
              throw new Error(`ConfigService stub: key=${key}`);
            },
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('registerDevice upsert + выпуск токена', async () => {
    const child = {
      id: '11111111-1111-1111-1111-111111111111',
      ageBand: 'AGE_6_8' as const,
    };
    upsert.mockResolvedValueOnce(child);

    const result = await service.registerDevice('device-abc-xyz-0001');

    expect(result).toEqual({
      token: 'signed.jwt.token',
      childId: child.id,
      ageBand: 'AGE_6_8',
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const args = upsert.mock.calls[0]![0] as { where: { deviceIdHash: string } };
    // hash — sha256(deviceId+salt), длина 64 hex-символа
    expect(args.where.deviceIdHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('повторный registerDevice с тем же deviceId даёт ТОТ же hash', async () => {
    const child = { id: 'id-1', ageBand: 'AGE_6_8' as const };
    upsert.mockResolvedValue(child);

    await service.registerDevice('same-device-id');
    await service.registerDevice('same-device-id');

    const hash1 = (upsert.mock.calls[0]![0] as { where: { deviceIdHash: string } }).where
      .deviceIdHash;
    const hash2 = (upsert.mock.calls[1]![0] as { where: { deviceIdHash: string } }).where
      .deviceIdHash;
    expect(hash1).toBe(hash2);
  });

  it('разные deviceId дают разные hash-и', async () => {
    const child = { id: 'id-1', ageBand: 'AGE_6_8' as const };
    upsert.mockResolvedValue(child);

    await service.registerDevice('device-one-1111');
    await service.registerDevice('device-two-2222');

    const hash1 = (upsert.mock.calls[0]![0] as { where: { deviceIdHash: string } }).where
      .deviceIdHash;
    const hash2 = (upsert.mock.calls[1]![0] as { where: { deviceIdHash: string } }).where
      .deviceIdHash;
    expect(hash1).not.toBe(hash2);
  });

  it('verifyToken проксирует в JwtService', async () => {
    verify.mockResolvedValueOnce({ sub: 'child-1', ab: 'AGE_6_8' });
    const payload = await service.verifyToken('tok');
    expect(payload).toEqual({ sub: 'child-1', ab: 'AGE_6_8' });
    expect(verify).toHaveBeenCalledWith('tok');
  });
});
