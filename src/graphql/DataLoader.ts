export class BatchLoader<K, V> {
  private batchFn: (keys: readonly K[]) => Promise<V[]>;
  private cache: Map<K, Promise<V>>;
  private queue: K[];
  private timeout: number | null;
  private resolvers: Map<K, { resolve: (value: V) => void; reject: (error: unknown) => void }>;

  constructor(
    batchFn: (keys: readonly K[]) => Promise<V[]>,
    _options: { cacheSize?: number; batchDelay?: number } = {},
  ) {
    this.batchFn = batchFn;
    this.cache = new Map();
    this.queue = [];
    this.timeout = null;
    this.resolvers = new Map();
  }

  load(key: K): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push(key);
      this.resolvers.set(key, { resolve, reject });

      if (this.timeout === null) {
        this.timeout = setTimeout(() => this.flush(), 0);
      }
    });

    this.cache.set(key, promise);
    return promise;
  }

  private async flush(): Promise<void> {
    const keys = [...this.queue];
    this.queue = [];
    this.timeout = null;

    try {
      const values = await this.batchFn(keys);
      keys.forEach((key, i) => {
        const resolver = this.resolvers.get(key);
        if (resolver) {
          resolver.resolve(values[i]);
          this.resolvers.delete(key);
        }
      });
    } catch (error) {
      keys.forEach((key) => {
        const resolver = this.resolvers.get(key);
        if (resolver) {
          resolver.reject(error);
          this.resolvers.delete(key);
        }
      });
    }
  }

  clear(key: K): void {
    this.cache.delete(key);
    this.resolvers.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
    this.resolvers.clear();
  }
}
