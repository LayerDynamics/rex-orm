import { assertEquals } from "@std/assert";
import { add } from "./main.ts";
import "./src/tests/unit/modelLayer/ModelRegistry.test.ts";
import "./src/tests/unit/modelLayer/Decorators.test.ts";

Deno.test(function addTest() {
  assertEquals(add(2, 3), 5);
});
