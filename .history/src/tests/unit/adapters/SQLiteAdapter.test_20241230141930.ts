import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { SQLiteAdapter } from "../../../adapters/SQLiteAdapter.ts";

Deno.test("SQLiteAdapter - Basic Operations", async (t) => {
  const adapter = new SQLiteAdapter(":memory:");

  await t.step("connect and disconnect", async () => {