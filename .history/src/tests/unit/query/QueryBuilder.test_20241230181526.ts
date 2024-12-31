import { assertEquals, assertThrows } from "../../../deps.ts";
import { QueryBuilder } from "../../../query/QueryBuilder.ts";
import { DatabaseAdapter, QueryResult } from "../../../interfaces/DatabaseAdapter.ts";

class MockDatabaseAdapter implements DatabaseAdapter {
  execute(query: string, params: any[]): Promise<QueryResult> {
    return Promise.resolve({
      rows: [{ query, params }],
      rowCount: 1,
    });
  }
}

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
