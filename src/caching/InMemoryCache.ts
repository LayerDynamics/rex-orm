import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

interface CacheEntry {
  data: any;
  expiry: number;
}

export class InMemoryCache implements CacheAdapter {
  private cache: Map<string, CacheEntry>;
  readonly defaultTtl: number;

  constructor(options: { ttl?: number } = {}) {
    this.cache = new Map();
    this.defaultTtl = options.ttl || 3600; // Default to 1 hour if not specified
  }

  set(key: string, value: any): void {
    const expiry = Date.now() + this.defaultTtl;
    this.cache.set(key, { data: value, expiry });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
