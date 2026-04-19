import { Controller, Get } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

import { HealthPresenter, type HealthSnapshot } from './health.presenter';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<HealthSnapshot> {
    const dbOk = await this.checkDb();
    return HealthPresenter.toResponse({
      status: dbOk ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.0.0',
      database: dbOk ? 'ok' : 'error',
      uptimeSeconds: Math.round(process.uptime()),
    });
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
