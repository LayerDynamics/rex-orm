import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { SQLiteAdapter } from "../../../adapters/SQLiteAdapter.ts";

Deno.test("SQLiteAdapter - Basic Operations", async (t) => {
  const adapter = new SQLiteAdapter(":memory:");

  await t.step("connect and disconnect", async () => {
    await adapter.connect();
    assertEquals((adapter as any).connected, true);
    await adapter.disconnect();
    assertEquals((adapter as any).connected, false);
  });

  await t.step("create table and insert data", async () => {
    await adapter.connect();
    await adapter.execute(
      "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)",
    );
    await adapter.execute(
      "INSERT INTO test (name) VALUES (?)",
      ["test_value"],
    );
    const result = await adapter.execute("SELECT * FROM test");
    assertEquals(result.rows[0].name, "test_value");
    await adapter.disconnect();
  });

  await t.step("transaction rollback", async () => {
    await adapter.connect();
    await adapter.beginTransaction();
    await adapter.execute("INSERT INTO test (name) VALUES (?)", ["rollback"]);
    await adapter.rollback();
    const result = await adapter.execute("SELECT * FROM test WHERE name = ?", ["rollback"]);
    assertEquals(result.rows.length, 0);
    await adapter.disconnect();
  });
});
