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
    assertEquals((adapter as any).connected, false);
  });

  await t.step("execute query with parameters", async () => {
    await adapter.connect();
    const result = await adapter.execute(
      "SELECT $1::int as id, $2::text as name",
      [1, "test"],
    );
    assertEquals(result.rows[0], { id: 1, name: "test" });
    await adapter.disconnect();
  });