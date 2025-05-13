// src/deps.ts
// Core Deno std library dependencies
export { ensureDir, exists } from "https://deno.land/std@0.203.0/fs/mod.ts";

export {
  dirname,
  extname,
  fromFileUrl,
  join,
  resolve,
} from "https://deno.land/std@0.203.0/path/mod.ts";

// CLI dependencies
export { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";

export {
  Confirm,
  Input,
  Select,
} from "https://deno.land/x/cliffy@v1.0.0-rc.4/prompt/mod.ts";

// GraphQL dependencies
export { gql } from "https://deno.land/x/graphql_tag@0.1.0/mod.ts";

// Reflection/Decorator support - proper import
import "npm:reflect-metadata@0.1.14";

// Export the reflection methods
export const defineMetadata = Reflect.defineMetadata;
export const getMetadata = Reflect.getMetadata;
export const hasMetadata = Reflect.hasMetadata;

// Testing assertions
export {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.203.0/testing/asserts.ts";
