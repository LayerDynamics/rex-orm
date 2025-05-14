import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

interface CacheEntry<T = unknown> {
  data: T;
  expiry: number;
}

export class InMemoryCache implements CacheAdapter {
  private cache: Map<string, CacheEntry<unknown>>;
  readonly defaultTtl: number;

  constructor(options: { ttl?: number } = {}) {
    this.cache = new Map();
    this.defaultTtl = options.ttl || 3600; // Default to 1 hour if not specified
  }

  set<T>(key: string, value: T): void {
    const expiry = Date.now() + this.defaultTtl;
    this.cache.set(key, { data: value, expiry });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
