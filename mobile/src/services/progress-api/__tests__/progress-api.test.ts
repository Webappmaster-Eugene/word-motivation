import type { ApiClient } from '@/services/api-client/api-client';
import type { DeviceAuthService } from '@/services/auth/device-auth-service';

import { ProgressApi } from '../progress-api';

describe('ProgressApi', () => {
  let request: jest.Mock;
  let api: ApiClient;
  let auth: DeviceAuthService;

  beforeEach(() => {
    request = jest.fn().mockResolvedValue({});
    api = { request } as unknown as ApiClient;
    auth = {
      ensure: jest.fn().mockResolvedValue({ token: 'tok', childId: 'c1', ageBand: 'AGE_6_8' }),
    } as unknown as DeviceAuthService;
  });

  it('startSession POST /progress/session с токеном', async () => {
    request.mockResolvedValueOnce({ id: 's1', gameId: 'alphabet', startedAt: 'now', endedAt: null });
    const svc = new ProgressApi(api, auth);
    const result = await svc.startSession({ gameId: 'alphabet' });

    expect(result.id).toBe('s1');
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/progress/session',
      token: 'tok',
      body: { gameId: 'alphabet' },
    });
  });

  it('endSession пропускает summary/snapshot если не заданы', async () => {
    request.mockResolvedValueOnce({});
    const svc = new ProgressApi(api, auth);
    await svc.endSession({ sessionId: 's1' });
    const call = request.mock.calls[0]![0] as { body: Record<string, unknown> };
    expect(call.body).toEqual({});
  });

  it('recordAttempt шлёт POST /progress/attempt', async () => {
    const svc = new ProgressApi(api, auth);
    await svc.recordAttempt({
      sessionId: 's1',
      kind: 'LETTER',
      expected: 'с',
      heard: 'с',
      correct: true,
    });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/progress/attempt',
        token: 'tok',
      }),
    );
  });

  it('unlockAnimal POST /progress/unlock с animalId', async () => {
    request.mockResolvedValueOnce({ animalId: 'dog', unlockedAt: 'now', visits: 1 });
    const svc = new ProgressApi(api, auth);
    const result = await svc.unlockAnimal('dog');
    expect(result).toEqual({ animalId: 'dog', unlockedAt: 'now', visits: 1 });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/progress/unlock',
        body: { animalId: 'dog' },
      }),
    );
  });

  it('listUnlocked GET /progress/unlocked', async () => {
    request.mockResolvedValueOnce([{ animalId: 'dog', unlockedAt: 'now', visits: 1 }]);
    const svc = new ProgressApi(api, auth);
    const result = await svc.listUnlocked();
    expect(result).toHaveLength(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/progress/unlocked', token: 'tok' }),
    );
  });
});
