import { ApiError, NetworkError, TimeoutError } from './errors';

export interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly body?: unknown;
  readonly token?: string;
  readonly query?: Record<string, string | number | undefined>;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface ApiClientConfig {
  readonly baseUrl: string;
  readonly defaultTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async request<T>(opts: ApiRequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Пробрасываем внешний abort в локальный controller
    const externalAbort = () => controller.abort();
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', externalAbort);
    }

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
      if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new TimeoutError(timeoutMs);
        }
        throw new NetworkError(err instanceof Error ? err.message : 'Сбой сети', err);
      }

      const text = await response.text();
      const parsed = this.safeJson(text);

      if (!response.ok) {
        const message = this.extractMessage(parsed) ?? `HTTP ${response.status}`;
        throw new ApiError(message, response.status, parsed);
      }

      return parsed as T;
    } finally {
      clearTimeout(timer);
      if (opts.signal) opts.signal.removeEventListener('abort', externalAbort);
    }
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const normalised = path.startsWith('/') ? path : `/${path}`;
    let url = `${this.baseUrl}${normalised}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private safeJson(text: string): unknown {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private extractMessage(body: unknown): string | null {
    if (body && typeof body === 'object' && !Array.isArray(body) && 'message' in body) {
      const msg = (body as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    return null;
  }
}
