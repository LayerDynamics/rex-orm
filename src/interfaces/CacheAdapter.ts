export interface CacheAdapter {
  set<T>(key: string, value: T): void | Promise<void>;
  get<T>(key: string): T | null | Promise<T | null>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;
}
