import { config } from '../config';
import { logger } from '../utils/logger';

export class RedisCache {
  enabled = Boolean(config.upstashUrl && config.upstashToken);

  private async command<T>(cmd: unknown[]): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${config.upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.upstashToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify([cmd]),
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
      const data = await res.json();
      if (data?.[0]?.error) throw new Error(data[0].error);
      return data?.[0]?.result ?? null;
    } catch (error) {
      logger.warn('redis_cache_error', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.command<string>(['GET', key]);
    if (!value) return null;
    try { return JSON.parse(value) as T; } catch { return null; }
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.command(['SET', key, JSON.stringify(value), 'EX', ttlSeconds]);
  }
}
