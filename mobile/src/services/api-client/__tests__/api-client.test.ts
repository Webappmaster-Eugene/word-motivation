import { ApiClient } from '../api-client';
import { ApiError, NetworkError, TimeoutError } from '../errors';

const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as Record<string, unknown>).fetch = mockFetch;
});

afterAll(() => {
  (globalThis as Record<string, unknown>).fetch = originalFetch;
});

function mockJsonResponse(status: number, body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('ApiClient', () => {
  it('успешный GET отдаёт parsed JSON', async () => {
    mockJsonResponse(200, { hello: 'world' });
    const client = new ApiClient({ baseUrl: 'http://localhost:3000' });
    const result = await client.request<{ hello: string }>({ path: '/ping' });
    expect(result).toEqual({ hello: 'world' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/ping',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('trailing slash в baseUrl убирается', async () => {
    mockJsonResponse(200, {});
    const client = new ApiClient({ baseUrl: 'http://localhost:3000///' });
    await client.request({ path: '/x' });
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/x', expect.any(Object));
  });

  it('path без ведущего слэша добавляется', async () => {
    mockJsonResponse(200, {});
    const client = new ApiClient({ baseUrl: 'http://localhost:3000' });
    await client.request({ path: 'foo' });
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/foo', expect.any(Object));
  });

  it('query-параметры сериализуются, undefined пропускается', async () => {
    mockJsonResponse(200, {});
    const client = new ApiClient({ baseUrl: 'http://api' });
    await client.request({ path: '/list', query: { minAge: 8, biome: 'FOREST', extra: undefined } });
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toBe('http://api/list?minAge=8&biome=FOREST');
  });

  it('Bearer-токен подставляется', async () => {
    mockJsonResponse(200, {});
    const client = new ApiClient({ baseUrl: 'http://api' });
    await client.request({ path: '/x', token: 'tok123' });
    const init = mockFetch.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer tok123');
  });

  it('POST с body проставляет Content-Type и сериализует JSON', async () => {
    mockJsonResponse(201, { ok: true });
    const client = new ApiClient({ baseUrl: 'http://api' });
    await client.request({ method: 'POST', path: '/x', body: { foo: 'bar' } });
    const init = mockFetch.mock.calls[0]![1] as {
      headers: Record<string, string>;
      body: string;
    };
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ foo: 'bar' });
  });

  it('4xx маппится в ApiError с сообщением сервера', async () => {
    mockJsonResponse(400, { message: 'Ошибка валидации: deviceId слишком короткий' });
    const client = new ApiClient({ baseUrl: 'http://api' });
    await expect(client.request({ path: '/x' })).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        status: 400,
        message: 'Ошибка валидации: deviceId слишком короткий',
      }),
    );
  });

  it('5xx без тела — ApiError с фолбэк-сообщением', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => '',
    });
    const client = new ApiClient({ baseUrl: 'http://api' });
    await expect(client.request({ path: '/x' })).rejects.toBeInstanceOf(ApiError);
  });

  it('сетевая ошибка → NetworkError', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const client = new ApiClient({ baseUrl: 'http://api' });
    await expect(client.request({ path: '/x' })).rejects.toBeInstanceOf(NetworkError);
  });

  it('таймаут → TimeoutError', async () => {
    mockFetch.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        }),
    );
    const client = new ApiClient({ baseUrl: 'http://api' });
    await expect(client.request({ path: '/x', timeoutMs: 30 })).rejects.toBeInstanceOf(TimeoutError);
  });
});
