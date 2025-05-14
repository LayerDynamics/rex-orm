import { CacheAdapter } from "../interfaces/CacheAdapter.ts";

export class DenoKVCache implements CacheAdapter {
  private kv: Deno.Kv | null = null;
  private namespace?: string;
  public readonly defaultTtl?: number; // Make defaultTtl public and readonly

  constructor(namespace?: string, defaultTtl?: number) {
    this.namespace = namespace;
    this.defaultTtl = defaultTtl;
  }

  async connect(path?: string): Promise<void> {
    this.kv = await Deno.openKv(path);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.kv) throw new Error("Cache not connected");
    const result = await this.kv.get([key]);
    return result.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.kv) throw new Error("Cache not connected");
    
    // Use the provided TTL, fall back to the default TTL if available
    const expireIn = ttl !== undefined ? ttl : 
                    this.defaultTtl !== undefined ? this.defaultTtl * 1000 : undefined;
    
    const options = expireIn !== undefined ? { expireIn } : undefined;
    await this.kv.set([key], value, options);
  }

  async delete(key: string): Promise<void> {
    if (!this.kv) throw new Error("Cache not connected");
    await this.kv.delete([key]);
  }

  async clear(): Promise<void> {
    if (!this.kv) throw new Error("Cache not connected");

    // Use batch operations for better performance
    const batch = this.kv.atomic();

    // Collect all keys and delete them in a batch
    for await (const entry of this.kv.list({ prefix: [] })) {
      batch.delete(entry.key);
    }

    // Execute the batch operation
    await batch.commit();
  }

  async disconnect(): Promise<void> {
    if (this.kv) {
      await this.kv.close();
      this.kv = null;
    }
  }
}
