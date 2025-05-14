import { assertEquals, assertThrows } from "../../../deps.ts";
import { CacheService } from "../../../caching/CacheService.ts";
import { DenoKVCache } from "../../../caching/DenoKVCache.ts";
import { InMemoryCache } from "../../../caching/InMemoryCache.ts";

Deno.test("CacheService initializes InMemoryCache correctly", () => {
  const cacheService = CacheService.getInstance();
  // Using the default TTL
  cacheService.initializeCache("in-memory", {});
  const cacheAdapter = cacheService.getCacheAdapter();
  assertEquals(cacheAdapter instanceof InMemoryCache, true);
  assertEquals((cacheAdapter as InMemoryCache).defaultTtl, 3600); // Updated to match default
});

Deno.test("CacheService initializes DenoKVCache correctly", async () => {
  const cacheService = CacheService.getInstance();
  const namespace = "test-namespace";
  cacheService.initializeCache("deno-kv", { namespace, ttl: 120 });
  const cacheAdapter = cacheService.getCacheAdapter();
  assertEquals(cacheAdapter instanceof DenoKVCache, true);
  assertEquals((cacheAdapter as DenoKVCache).defaultTtl, 120);
  await cacheService.disconnectCache();
});

Deno.test("CacheService throws error for unsupported cache type", () => {
  const cacheService = CacheService.getInstance();
  assertThrows(
    () => {
      // Using type assertion with unknown first to be type-safe
      cacheService.initializeCache("unsupported" as unknown as "in-memory" | "deno-kv", {});
    },
    Error,
    "Unsupported cache type: unsupported",
  );
});

Deno.test("CacheService instance is singleton", () => {
  const instance1 = CacheService.getInstance();
  const instance2 = CacheService.getInstance();
  assertEquals(instance1 === instance2, true);
});
