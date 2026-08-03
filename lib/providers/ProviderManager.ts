import type { AnimeProvider } from './AnimeProvider';
import { SankaProvider } from './SankaProvider';
import { SamehadakuFallbackProvider } from './SamehadakuFallbackProvider';
import { getCached, setCached } from '../cache';
import { config } from '../config';
import { logger } from '../utils/logger';

type ProviderMethod<TArgs extends unknown[], TReturn> = (provider: AnimeProvider, ...args: TArgs) => Promise<TReturn>;

export class ProviderManager {
  providers: AnimeProvider[] = [new SankaProvider(), new SamehadakuFallbackProvider()];

  async execute<TArgs extends unknown[], TReturn>(key: string, ttl: number, method: ProviderMethod<TArgs, TReturn>, ...args: TArgs): Promise<TReturn> {
    const fresh = await getCached<TReturn>(key);
    if (fresh) return fresh.value;

    const errors: string[] = [];
    for (const provider of this.providers) {
      try {
        const value = await method(provider, ...args);
        await setCached(key, value, ttl);
        return value;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${provider.name}: ${message}`);
        logger.warn('provider_failed_try_next', { provider: provider.name, key, error: message });
      }
    }

    const stale = await getCached<TReturn>(key, true);
    if (stale) {
      logger.warn('serving_stale_cache', { key, cacheSource: stale.source, errors });
      return stale.value;
    }

    logger.error('all_providers_failed_no_cache', { key, errors });
    // Tidak bocorkan error upstream detail ke pengguna; route akan balas payload kosong aman.
    throw new Error('DATA_TEMPORARILY_UNAVAILABLE');
  }

  ttl(kind: 'short' | 'medium' | 'long') { return config.cacheTtl[kind]; }
}

export const providerManager = new ProviderManager();
