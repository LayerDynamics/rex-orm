export {
  assert,
  assertEquals,
  assertExists,
  assertStrictEquals,
  assertThrows,
  assertArrayIncludes,  // Added this export
} from "https://deno.land/std@0.203.0/testing/asserts.ts";
export { load } from "https://deno.land/std@0.182.0/dotenv/mod.ts";

import "reflect-metadata";

// Export Reflect methods directly
export const { defineMetadata, getMetadata, hasMetadata } = Reflect;