import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { PostgresAdapter } from "../../../adapters/PostgreSQLAdapter.ts";
import type { PostgresConfig } from "../../../interfaces/DatabaseConfig.ts";

const testConfig: PostgresConfig = {
  database: "postgres",
  user: "test_user",
  password: "test_pass",
  host: "localhost",
  port: 5432,
  databaseName: "test_db",
};

Deno.test("PostgresAdapter - Basic Operations", async (t) => {
  const adapter = new PostgresAdapter(testConfig);

  await t.step("connect and disconnect", async () => {
    await adapter.connect();
    assertEquals((adapter as any).connected, true);
    await adapter.disconnect();