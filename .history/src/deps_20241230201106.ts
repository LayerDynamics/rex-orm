export { assertEquals, assertThrows } from "https://deno.land/std@0.182.0/testing/asserts.ts";
export { load } from "https://deno.land/std@0.182.0/dotenv/mod.ts";

// Import reflect-metadata globally
import "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";

// Import type definitions only
import type { Reflect } from "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";
export type { Reflect };

// Reference the type declarations
/// <reference path="./types/reflect-metadata.d.ts" />