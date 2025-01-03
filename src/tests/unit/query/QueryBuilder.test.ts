import { assertEquals, assertThrows } from "../../../deps.ts";
import { QueryBuilder } from "../../../query/QueryBuilder.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";

Deno.test("QueryBuilder constructs and executes SELECT queries", async () => {
  // ...existing code...
});

Deno.test("QueryBuilder constructs and executes INSERT queries", async () => {
  // ...existing code...
});

Deno.test("QueryBuilder constructs and executes UPDATE queries", async () => {
  // ...existing code...
});

Deno.test("QueryBuilder constructs and executes DELETE queries", async () => {
  // ...existing code...
});

Deno.test("QueryBuilder throws error for unsupported query type", async () => {
  // ...existing code...
});

// Add additional test cases
Deno.test("QueryBuilder handles empty WHERE conditions", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(result.debug?.query, "SELECT id, name FROM users");
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder handles multiple WHERE conditions", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .where("age", ">", 18)
    .where("status", "=", "active")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(result.debug?.query, "SELECT id, name FROM users WHERE age > $1 AND status = $2");
  assertEquals(result.debug?.params, [18, "active"]);
});

Deno.test("QueryBuilder resets after execution", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  await qb
    .select(["id"])
    .from("users")
    .execute(adapter);

  // Should be able to build a new query with the same instance
  const result = await qb
    .select(["name"])
    .from("posts")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(result.rows[0].query, "SELECT name FROM posts");
});

// Add remaining test cases...
