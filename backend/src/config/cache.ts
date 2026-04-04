import { cacheLogger } from './logger';

export class MemoryCache {
  private store = new Map<string, { value: unknown; expiresAt: number; hits: number }>();
  private stats = { hits: 0, misses: 0, evictions: 0 };

  set<T>(key: string, value: T, ttlSeconds = 60): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000, hits: 0 });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) { this.stats.misses++; return null; }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }
    entry.hits++;
    this.stats.hits++;
    return entry.value as T;
  }

  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) { this.store.delete(key); this.stats.evictions++; }
    }
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) { this.store.delete(key); pruned++; }
    }
    this.stats.evictions += pruned;
    return pruned;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size:    this.store.size,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
    };
  }

  flush(): void { this.store.clear(); }
}

export const cache = new MemoryCache();

// Limpieza periódica de entradas expiradas
setInterval(() => {
  const pruned = cache.prune();
  if (pruned > 0) {
    cacheLogger.debug({ pruned }, 'Entradas expiradas eliminadas del caché');
  }
}, 5 * 60 * 1000);

export const TTL = {
  CATEGORIES:   5 * 60,
  SCRIPTS_LIST: 60,
  SCRIPT_DETAIL: 2 * 60,
  METRICS:      10 * 60,
};

export const CacheKeys = {
  categories:  () => 'categories:all',
  scriptsList: (filters: string, page: number) => `scripts:list:${filters}:${page}`,
  script:      (id: string) => `scripts:${id}`,
  metrics:     () => 'metrics:all',
};
