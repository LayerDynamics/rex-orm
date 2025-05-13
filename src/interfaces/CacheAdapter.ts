export interface CacheAdapter {
  set(key: string, value: any): void | Promise<void>;
  get(key: string): any | null | Promise<any | null>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;
}
