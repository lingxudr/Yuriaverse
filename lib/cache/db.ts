import { config } from '../config';
import { logger } from '../utils/logger';

let initialized = false;

export class DatabaseCache {
  enabled = Boolean(config.postgresUrl);

  private async sql(strings: TemplateStringsArray, ...values: unknown[]) {
    if (!this.enabled) return null;
    try {
      const mod = await import('@vercel/postgres');
      return await mod.sql(strings, ...values as never[]);
    } catch (error) {
      logger.warn('db_cache_error', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  private async ensure() {
    if (!this.enabled || initialized) return;
    await this.sql`CREATE TABLE IF NOT EXISTS anime_cache (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    initialized = true;
  }

  async get<T>(key: string, allowStale = false): Promise<{ value: T; stale: boolean } | null> {
    await this.ensure();
    const result = await this.sql`SELECT value, expires_at < NOW() AS stale FROM anime_cache WHERE key = ${key} LIMIT 1`;
    const row = result?.rows?.[0] as { value: T; stale: boolean } | undefined;
    if (!row) return null;
    if (row.stale && !allowStale) return null;
    return { value: row.value, stale: row.stale };
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.ensure();
    const payload = JSON.stringify(value);
    await this.sql`INSERT INTO anime_cache (key, value, expires_at, updated_at)
      VALUES (${key}, ${payload}::jsonb, NOW() + (${ttlSeconds} || ' seconds')::interval, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at, updated_at = NOW()`;
  }
}
