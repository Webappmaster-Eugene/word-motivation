import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Child } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { AppConfig } from '../../config/env.schema';

export interface AuthTokenPayload {
  readonly sub: string; // childId
  readonly ab: Child['ageBand'];
}

export interface AuthResult {
  readonly token: string;
  readonly childId: string;
  readonly ageBand: Child['ageBand'];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig>,
  ) {}

  /**
   * Анонимная регистрация устройства. Idempotent:
   *  - первый вызов с deviceId → создаёт Child + возвращает токен
   *  - повторный вызов с тем же deviceId → возвращает токен того же Child
   * Раз-deviceId никогда не хранится, только его sha256-hash с секретным salt.
   */
  async registerDevice(deviceId: string, ageBand?: Child['ageBand']): Promise<AuthResult> {
    const deviceIdHash = this.hashDeviceId(deviceId);
    const child = await this.prisma.child.upsert({
      where: { deviceIdHash },
      update: ageBand ? { ageBand } : {},
      create: {
        deviceIdHash,
        ageBand: ageBand ?? 'AGE_6_8',
      },
    });
    return this.issueToken(child);
  }

  async verifyToken(token: string): Promise<AuthTokenPayload> {
    return this.jwt.verifyAsync<AuthTokenPayload>(token);
  }

  private issueToken(child: Child): AuthResult {
    const payload: AuthTokenPayload = { sub: child.id, ab: child.ageBand };
    const token = this.jwt.sign(payload);
    return { token, childId: child.id, ageBand: child.ageBand };
  }

  private hashDeviceId(deviceId: string): string {
    const salt = this.config.getOrThrow('DEVICE_ID_SALT', { infer: true });
    return createHash('sha256').update(`${deviceId}:${salt}`).digest('hex');
  }
}
