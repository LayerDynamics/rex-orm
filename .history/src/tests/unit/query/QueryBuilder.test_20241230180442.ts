
import { assertEquals, assertThrows } from "../../../deps.ts";
import { QueryBuilder } from "../../../query/QueryBuilder.ts";
import { DatabaseAdapter, QueryResult } from "../../../interfaces/DatabaseAdapter.ts";

// Mock DatabaseAdapter for testing
class MockDatabaseAdapter implements DatabaseAdapter {
  connect(): Promise<void> {
    return Promise.resolve();
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  execute(query: string, params: any[] = []): Promise<QueryResult> {
    // For testing, simply return the query and params as rows
    return Promise.resolve({
      rows: [{ query, params }],
      rowCount: 1,
    });
  }
  beginTransaction(): Promise<void> {
    return Promise.resolve();
  }
  commit(): Promise<void> {
    return Promise.resolve();
  }
  rollback(): Promise<void> {
    return Promise.resolve();
  }
}

Deno.test("QueryBuilder constructs and executes SELECT queries", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .where("age", ">", 18)
    .orderBy("name", "ASC")
    .limit(10)
    .offset(5)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(result.rows[0].query, "SELECT id, name FROM users WHERE age > $1 ORDER BY name ASC LIMIT 10 OFFSET 5");
  assertEquals(result.rows[0].params, [18]);
});

Deno.test("QueryBuilder constructs and executes INSERT queries", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const data = { name: "John Doe", email: "john@example.com" };

  const result = await qb
    .insert("users", data)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(result.rows[0].query, "INSERT INTO users (name, email) VALUES ($1, $2)");
  assertEquals(result.rows[0].params, ["John Doe", "john@example.com"]);
});

Deno.test("QueryBuilder constructs and executes UPDATE queries", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const data = { name: "Jane Doe", email: "jane@example.com" };