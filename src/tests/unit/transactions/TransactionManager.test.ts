import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std/testing/asserts.ts";
import { TransactionManager } from "../../../transactions/TransactionManager.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";

Deno.test("TransactionManager commits transactions correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const txManager = new TransactionManager(adapter);

  await txManager.executeInTransaction(async (tx) => {
    await adapter.execute("INSERT INTO users (name) VALUES ($1);", ["Alice"]);
    await adapter.execute("INSERT INTO posts (title) VALUES ($1);", [
      "First Post",
    ]);
  });

  assertEquals(adapter.executedQueries.map((eq) => eq.query), [
    "BEGIN TRANSACTION;",
    "INSERT INTO users (name) VALUES ($1);",
    "INSERT INTO posts (title) VALUES ($1);",
    "COMMIT;",
  ]);
});

Deno.test("TransactionManager rolls back transactions on error", async () => {
  const adapter = new MockDatabaseAdapter();
  const manager = new TransactionManager(adapter);

  await assertRejects(
    async () => {
      await manager.executeInTransaction(async () => {
        throw new Error("Test error");
      });
    },
    Error,
    "Test error",
  );

  assertEquals(
    adapter.executedQueries.map((q) => q.query),
    ["BEGIN TRANSACTION;", "ROLLBACK;"],
  );
});
