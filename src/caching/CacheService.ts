import { CacheAdapter } from "../interfaces/CacheAdapter.ts";
import { InMemoryCache } from "./InMemoryCache.ts";
import { DenoKVCache } from "./DenoKVCache.ts";

interface CacheOptions {
  ttl?: number;
  namespace?: string;
  [key: string]: unknown;
}

interface DisconnectableCache extends CacheAdapter {
  disconnect(): void | Promise<void>;
}

export class CacheService {
  private static instance: CacheService;
  private cache: CacheAdapter | null = null;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  initializeCache(type: "in-memory" | "deno-kv", options?: CacheOptions): void {
    switch (type) {
      case "in-memory":
        this.cache = new InMemoryCache(options?.ttl);
        break;
      case "deno-kv":
        this.cache = new DenoKVCache(options?.namespace, options?.ttl);
        break;
      default:
        throw new Error(`Unsupported cache type: ${type}`);
    }
  }

  getCacheAdapter(): CacheAdapter | null {
    return this.cache;
  }

  clearCache(): void | Promise<void> {
    if (!this.cache) return;
    return this.cache.clear();
  }

  disconnectCache(): void | Promise<void> {
    if (!this.cache) return;
    if ("disconnect" in this.cache) {
      return (this.cache as DisconnectableCache).disconnect();
    }
  }
}
