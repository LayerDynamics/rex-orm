// src/tests/helpers/TestCacheHelper.ts

import { DenoKVCache } from "../../caching/DenoKVCache.ts";

export class TestCacheHelper {
  static async createTestCache(
    namespace: string = "test",
  ): Promise<DenoKVCache> {
    const cache = new DenoKVCache(namespace, 60); // 60 second TTL for tests
    await cache.connect();
    return cache;
  }

  static async cleanupTestCache(cache: DenoKVCache): Promise<void> {
    try {
      await cache.clear();
      await cache.disconnect();
    } catch (error) {
      console.error("Error cleaning up test cache:", error);
    }
  }
}
