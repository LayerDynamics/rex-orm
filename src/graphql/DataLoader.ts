export class BatchLoader<K, V> {
  private batchFn: (keys: readonly K[]) => Promise<V[]>;
  private cache: Map<K, Promise<V>>;
  private queue: K[];
  private timeout: number | null;

  constructor(
    batchFn: (keys: readonly K[]) => Promise<V[]>,
    options: { cacheSize?: number; batchDelay?: number } = {},
  ) {
    this.batchFn = batchFn;
    this.cache = new Map();
    this.queue = [];
    this.timeout = null;
  }

  async load(key: K): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push(key);

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
        const promise = this.cache.get(key);
        if (promise) {
          (promise as any).resolve(values[i]);
        }
      });
    } catch (error) {
      keys.forEach((key) => {
        const promise = this.cache.get(key);
        if (promise) {
          (promise as any).reject(error);
        }
      });
    }
  }

  clear(key: K): void {
    this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
  }
}
