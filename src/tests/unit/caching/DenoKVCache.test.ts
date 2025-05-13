const kv = await Deno.openKv(":memory:"); // Using in-memory KV for testing

import { assertEquals } from "../../../deps.ts";
import { DenoKVCache } from "../../../caching/DenoKVCache.ts";

Deno.test({
  name: "DenoKVCache tests",
  ignore: !Deno.env.get("UNSTABLE_KV_ENABLED"),
  async fn(t) {
    await t.step("DenoKVCache sets and gets values correctly", async () => {
      const cache = new DenoKVCache("test-namespace", 60);
      await cache.connect();
      try {
        await cache.set("denoKey1", { data: "denoValue1" });
        const value = await cache.get("denoKey1");
        assertEquals(value, { data: "denoValue1" });
        await cache.delete("denoKey1");
      } finally {
        await cache.disconnect();
      }
    });

    await t.step("DenoKVCache expires values after TTL", async () => {
      const cache = new DenoKVCache("test-namespace", 1); // 1-second TTL
      await cache.connect();
      try {
        await cache.set("denoKey2", "denoValue2");
        await delay(2000); // Wait for 2 seconds
        const value = await cache.get("denoKey2");
        assertEquals(value, null);
      } finally {
        await cache.disconnect();
      }
    });

    await t.step("DenoKVCache deletes values correctly", async () => {
      const cache = new DenoKVCache("test-namespace");
      await cache.set("denoKey3", "denoValue3");
      await cache.delete("denoKey3");
      const value = await cache.get("denoKey3");
      assertEquals(value, null);
    });

    await t.step("DenoKVCache clears all values correctly", async () => {
      const cache = new DenoKVCache("test-namespace");
      await cache.set("denoKey4", "denoValue4");
      await cache.set("denoKey5", "denoValue5");
      await cache.clear();
      const value1 = await cache.get("denoKey4");
      const value2 = await cache.get("denoKey5");
      assertEquals(value1, null);
      assertEquals(value2, null);
    });
  },
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
