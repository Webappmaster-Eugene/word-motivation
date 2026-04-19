export interface HealthSnapshot {
  readonly status: 'ok' | 'degraded';
  readonly version: string;
  readonly database: 'ok' | 'error';
  readonly uptimeSeconds: number;
}

export class HealthPresenter {
  static toResponse(snapshot: HealthSnapshot): HealthSnapshot {
    return {
      status: snapshot.status,
      version: snapshot.version,
      database: snapshot.database,
      uptimeSeconds: snapshot.uptimeSeconds,
    };
  }
}
