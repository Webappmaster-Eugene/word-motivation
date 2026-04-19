import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

interface ErrorResponseBody {
  readonly statusCode: number;
  readonly message: string;
  readonly timestamp: string;
  readonly path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<{ url?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.extractMessage(exception);

    if (status >= 500) {
      this.logger.error(`[${status}] ${message}`, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(`[${status}] ${message}`);
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url ?? 'unknown',
    };

    void reply.status(status).send(body);
  }

  private extractMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (typeof resp === 'string') return resp;
      if (typeof resp === 'object' && resp !== null && 'message' in resp) {
        const msg = (resp as { message: unknown }).message;
        if (typeof msg === 'string') return msg;
        if (Array.isArray(msg)) return msg.join('; ');
      }
      return exception.message;
    }
    if (exception instanceof Error) return exception.message;
    return 'Внутренняя ошибка сервера';
  }
}
