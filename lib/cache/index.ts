import { RedisCache } from './redis';
import { DatabaseCache } from './db';
import { logger } from '../utils/logger';

const memory = new Map<string, { value: unknown; expiresAt: number }>();
const redis = new RedisCache();
const db = new DatabaseCache();

export async function getCached<T>(key: string, allowStale = false): Promise<{ value: T; source: 'memory' | 'redis' | 'database'; stale: boolean } | null> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && (mem.expiresAt > now || allowStale)) {
    return { value: mem.value as T, source: 'memory', stale: mem.expiresAt <= now };
  }

  const r = await redis.get<{ value: T; expiresAt: number }>(key);
  if (r && (r.expiresAt > now || allowStale)) {
    memory.set(key, r);
    return { value: r.value, source: 'redis', stale: r.expiresAt <= now };
  }

  const d = await db.get<T>(key, allowStale);
  if (d) return { value: d.value, source: 'database', stale: d.stale };
  return null;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number) {
  const wrapped = { value, expiresAt: Date.now() + ttlSeconds * 1000 };
  memory.set(key, wrapped);
  await Promise.allSettled([redis.set(key, wrapped, ttlSeconds), db.set(key, value, ttlSeconds)]);
  logger.info('cache_write', { key, ttlSeconds });
}
