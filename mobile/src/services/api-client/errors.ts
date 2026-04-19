/**
 * Типизированные ошибки API-клиента. Используются для сужения веток в UI и тестах.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Превышен таймаут ${timeoutMs} мс`);
    this.name = 'TimeoutError';
  }
}
