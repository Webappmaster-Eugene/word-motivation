import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AuthService, type AuthTokenPayload } from './auth.service';

export interface AuthenticatedRequest extends FastifyRequest {
  auth?: AuthTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Требуется Bearer-токен');
    }
    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Пустой Bearer-токен');
    }
    try {
      req.auth = await this.auth.verifyToken(token);
      return true;
    } catch {
      throw new UnauthorizedException('Недействительный или просроченный токен');
    }
  }
}

/**
 * Хелпер для контроллеров: вытащить childId из request после прохождения JwtAuthGuard.
 * Бросает, если guard не выполнялся.
 */
export function childIdFromRequest(req: AuthenticatedRequest): string {
  if (!req.auth) {
    throw new UnauthorizedException('Запрос не авторизован');
  }
  return req.auth.sub;
}
