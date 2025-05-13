import { assertEquals } from "../../../deps.ts";
import { InMemoryCache } from "../../../caching/InMemoryCache.ts";

Deno.test("InMemoryCache sets and gets values correctly", () => {
  const cache = new InMemoryCache({ ttl: 1000 }); // 1-second TTL
  cache.set("key1", { data: "value1" });
  const value = cache.get("key1");
  assertEquals(value, { data: "value1" });
});

Deno.test("InMemoryCache expires values after TTL", async () => {
  const cache = new InMemoryCache({ ttl: 100 }); // 100ms TTL
  cache.set("key2", { data: "value2" });
  await delay(200);
  const value = cache.get("key2");
  assertEquals(value, null);
});

Deno.test("InMemoryCache deletes values correctly", () => {
  const cache = new InMemoryCache();
  cache.set("key3", "value3");
  cache.delete("key3");
  const value = cache.get("key3");
  assertEquals(value, null);
});

Deno.test("InMemoryCache clears all values correctly", () => {
  const cache = new InMemoryCache();
  cache.set("key4", "value4");
  cache.set("key5", "value5");
  cache.clear();
  assertEquals(cache.get("key4"), null);
  assertEquals(cache.get("key5"), null);
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
