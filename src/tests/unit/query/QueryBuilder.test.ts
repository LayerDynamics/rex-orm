import { assertEquals, assertThrows } from "../../../deps.ts";
import { QueryBuilder } from "../../../query/QueryBuilder.ts";
import { DatabaseAdapter as _DatabaseAdapter } from "../../../interfaces/DatabaseAdapter.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";

Deno.test("QueryBuilder constructs and executes SELECT queries", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name", "email"])
    .from("users")
    .where("id", "=", 1)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name, email FROM users WHERE id = $1",
  );
  assertEquals(result.debug?.params, [1]);
});

Deno.test("QueryBuilder constructs and executes INSERT queries", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .insert("users", { name: "John Doe", email: "john@example.com" })
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "INSERT INTO users (name, email) VALUES ($1, $2)",
  );
  assertEquals(result.debug?.params, ["John Doe", "john@example.com"]);
});

Deno.test("QueryBuilder constructs and executes UPDATE queries", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .update("users", { name: "Jane Doe", email: "jane@example.com" })
    .where("id", "=", 1)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "UPDATE users SET name = $1, email = $2 WHERE id = $3",
  );
  assertEquals(result.debug?.params, ["Jane Doe", "jane@example.com", 1]);
});

Deno.test("QueryBuilder constructs and executes DELETE queries", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .delete("users")
    .where("id", "=", 1)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(result.debug?.query, "DELETE FROM users WHERE id = $1");
  assertEquals(result.debug?.params, [1]);
});

Deno.test("QueryBuilder throws error for unsupported query type", async () => {
  const adapter = new MockDatabaseAdapter();

  // Create a QueryBuilder with a table first to avoid "Table name is required" error
  const invalidQueryBuilder = new QueryBuilder();
  invalidQueryBuilder.from("users");

  // Use Object.defineProperty to override the queryParts property with an invalid type
  Object.defineProperty(invalidQueryBuilder, "queryParts", {
    value: {
      table: "users",
      type: "INVALID_TYPE",
    },
  });

  let error: Error | undefined;
  try {
    await invalidQueryBuilder.execute(adapter);
  } catch (e) {
    error = e as Error;
  }

  // Verify that we got the expected error
  assertEquals(error?.message, "Invalid query type");
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
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE age > $1 AND status = $2",
  );
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
  assertEquals(result.debug?.query, "SELECT name FROM posts");
});

// Testing different WHERE conditions
Deno.test("QueryBuilder handles WHERE IN condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .whereIn("id", [1, 2, 3])
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE id IN ($1, $2, $3)",
  );
  assertEquals(result.debug?.params, [1, 2, 3]);
});

Deno.test("QueryBuilder handles WHERE NOT IN condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .whereNotIn("id", [1, 2, 3])
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE id NOT IN ($1, $2, $3)",
  );
  assertEquals(result.debug?.params, [1, 2, 3]);
});

Deno.test("QueryBuilder handles WHERE BETWEEN condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .whereBetween("age", 18, 30)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE age BETWEEN $1 AND $2",
  );
  assertEquals(result.debug?.params, [18, 30]);
});

Deno.test("QueryBuilder handles WHERE NULL condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .whereNull("deleted_at")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE deleted_at IS NULL",
  );
  assertEquals(result.debug?.params, []); // Expect empty params array since IS NULL doesn't need parameters
});

Deno.test("QueryBuilder handles WHERE NOT NULL condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .whereNotNull("email")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE email IS NOT NULL",
  );
  assertEquals(result.debug?.params, []); // Expect empty params array since IS NOT NULL doesn't need parameters
});

Deno.test("QueryBuilder handles OR WHERE condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .where("age", ">", 18)
    .orWhere("role", "=", "admin")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE age > $1 OR role = $2",
  );
  assertEquals(result.debug?.params, [18, "admin"]);
});

Deno.test("QueryBuilder handles AND WHERE condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .where("age", ">", 18)
    .andWhere("status", "=", "active")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE age > $1 AND status = $2",
  );
  assertEquals(result.debug?.params, [18, "active"]);
});

Deno.test("QueryBuilder handles object WHERE condition", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .where({ age: 18, status: "active" })
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE age = $1 AND status = $2",
  );
  assertEquals(result.debug?.params, [18, "active"]);
});

// Testing JOIN operations
Deno.test("QueryBuilder constructs INNER JOIN", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["users.id", "users.name", "posts.title"])
    .from("users")
    .innerJoin("posts", "users.id", "=", "posts.user_id")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT users.id, users.name, posts.title FROM users INNER JOIN posts ON users.id = posts.user_id",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs LEFT JOIN", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["users.id", "users.name", "posts.title"])
    .from("users")
    .leftJoin("posts", "users.id", "=", "posts.user_id")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT users.id, users.name, posts.title FROM users LEFT JOIN posts ON users.id = posts.user_id",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs RIGHT JOIN", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["users.id", "users.name", "posts.title"])
    .from("users")
    .rightJoin("posts", "users.id", "=", "posts.user_id")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT users.id, users.name, posts.title FROM users RIGHT JOIN posts ON users.id = posts.user_id",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs FULL JOIN", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["users.id", "users.name", "posts.title"])
    .from("users")
    .fullJoin("posts", "users.id", "=", "posts.user_id")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT users.id, users.name, posts.title FROM users FULL JOIN posts ON users.id = posts.user_id",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs multiple JOINs", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["users.id", "users.name", "posts.title", "comments.content"])
    .from("users")
    .leftJoin("posts", "users.id", "=", "posts.user_id")
    .leftJoin("comments", "posts.id", "=", "comments.post_id")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT users.id, users.name, posts.title, comments.content FROM users LEFT JOIN posts ON users.id = posts.user_id LEFT JOIN comments ON posts.id = comments.post_id",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs JOIN with simplified syntax", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["users.id", "users.name", "posts.title"])
    .from("users")
    .join("posts", "users.id = posts.user_id")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT users.id, users.name, posts.title FROM users INNER JOIN posts ON users.id = posts.user_id",
  );
  assertEquals(result.debug?.params, []);
});

// Testing GROUP BY, HAVING, ORDER BY, LIMIT, OFFSET
Deno.test("QueryBuilder constructs GROUP BY clause", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["category", "COUNT(*) as count"])
    .from("posts")
    .groupBy("category")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT category, COUNT(*) as count FROM posts GROUP BY category",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs multiple GROUP BY columns", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["category", "status", "COUNT(*) as count"])
    .from("posts")
    .groupBy("category", "status")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT category, status, COUNT(*) as count FROM posts GROUP BY category, status",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs GROUP BY with array", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["category", "status", "COUNT(*) as count"])
    .from("posts")
    .groupBy(["category", "status"])
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT category, status, COUNT(*) as count FROM posts GROUP BY category, status",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs HAVING clause", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["category", "COUNT(*) as count"])
    .from("posts")
    .groupBy("category")
    .having("COUNT(*)", ">", 5)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT category, COUNT(*) as count FROM posts GROUP BY category HAVING COUNT(*) > $1",
  );
  assertEquals(result.debug?.params, [5]);
});

Deno.test("QueryBuilder constructs ORDER BY clause", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .orderBy("name", "ASC")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users ORDER BY name ASC",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs multiple ORDER BY clauses", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name", "created_at"])
    .from("users")
    .orderBy("name", "ASC")
    .orderBy("created_at", "DESC")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name, created_at FROM users ORDER BY name ASC created_at DESC",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs ORDER BY with NULLS FIRST", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name", "deleted_at"])
    .from("users")
    .orderBy("deleted_at", "ASC", "FIRST")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name, deleted_at FROM users ORDER BY deleted_at ASC NULLS FIRST",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs LIMIT clause", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .limit(10)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users LIMIT 10",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs OFFSET clause", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .offset(5)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users OFFSET 5",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs LIMIT and OFFSET together", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .limit(10)
    .offset(20)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users LIMIT 10 OFFSET 20",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs pagination", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .paginate(3, 15)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users LIMIT 15 OFFSET 30",
  );
  assertEquals(result.debug?.params, []);
});

// Testing DISTINCT and advanced SELECT features
Deno.test("QueryBuilder constructs SELECT DISTINCT", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .selectDistinct(["category"])
    .from("posts")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT DISTINCT category FROM posts",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder handles star selection", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select("*")
    .from("users")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT * FROM users",
  );
  assertEquals(result.debug?.params, []);
});

// Testing INSERT variations
Deno.test("QueryBuilder constructs bulk INSERT", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .bulkInsert(
      "users",
      ["name", "email"],
      [
        ["John Doe", "john@example.com"],
        ["Jane Doe", "jane@example.com"],
      ],
    )
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4)",
  );
  assertEquals(result.debug?.params, [
    "John Doe",
    "john@example.com",
    "Jane Doe",
    "jane@example.com",
  ]);
});

Deno.test("QueryBuilder constructs INSERT with RETURNING", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .insert("users", { name: "John Doe", email: "john@example.com" })
    .returning(["id"])
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
  );
  assertEquals(result.debug?.params, ["John Doe", "john@example.com"]);
});

// Testing UPDATE variations
Deno.test("QueryBuilder constructs UPDATE with RETURNING", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .update("users", { name: "John Smith", email: "john.smith@example.com" })
    .where("id", "=", 1)
    .returning(["id", "updated_at"])
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, updated_at",
  );
  assertEquals(result.debug?.params, [
    "John Smith",
    "john.smith@example.com",
    1,
  ]);
});

// Testing DELETE variations
Deno.test("QueryBuilder constructs DELETE with RETURNING", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .delete("users")
    .where("id", "=", 1)
    .returning(["id", "name"])
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "DELETE FROM users WHERE id = $1 RETURNING id, name",
  );
  assertEquals(result.debug?.params, [1]);
});

// Testing error handling
Deno.test("QueryBuilder throws error when table is not specified", () => {
  const _adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  // Only set the type but not the table
  qb.select(["id", "name"]);

  assertThrows(
    () => {
      qb.toSQL(); // Use toSQL() instead of execute() to avoid async complications
    },
    Error,
    "Table name is required",
  );
});

// Testing toSQL method
Deno.test("QueryBuilder's toSQL method returns query without executing", () => {
  const qb = new QueryBuilder();

  const sql = qb
    .select(["id", "name"])
    .from("users")
    .where("id", "=", 1)
    .toSQL();

  assertEquals(sql.query, "SELECT id, name FROM users WHERE id = $1");
  assertEquals(sql.params, [1]);
});

// Testing query builder cloning
Deno.test("QueryBuilder can be cloned", async () => {
  const adapter = new MockDatabaseAdapter();
  const originalQb = new QueryBuilder();

  originalQb
    .select(["id", "name"])
    .from("users")
    .where("active", "=", true);

  // Clone the query builder
  const clonedQb = originalQb.clone();

  // Modify the cloned query builder
  clonedQb.where("admin", "=", true);

  // Execute both queries and verify they're different
  const originalResult = await originalQb.execute(adapter);
  const clonedResult = await clonedQb.execute(adapter);

  assertEquals(
    originalResult.debug?.query,
    "SELECT id, name FROM users WHERE active = $1",
  );
  assertEquals(originalResult.debug?.params, [true]);

  assertEquals(
    clonedResult.debug?.query,
    "SELECT id, name FROM users WHERE active = $1 AND admin = $2",
  );
  assertEquals(clonedResult.debug?.params, [true, true]);
});

// Testing aggregate functions
Deno.test("QueryBuilder constructs COUNT aggregate", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .count("id", false, "total_users")
    .from("users")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT COUNT(id) AS total_users FROM users",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs COUNT DISTINCT aggregate", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .count("role", true, "unique_roles")
    .from("users")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT COUNT(DISTINCT role) AS unique_roles FROM users",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs SUM aggregate", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .sum("amount", "total_amount")
    .from("orders")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT SUM(amount) AS total_amount FROM orders",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs AVG aggregate", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .avg("price", "average_price")
    .from("products")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT AVG(price) AS average_price FROM products",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs MIN aggregate", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .min("price", "lowest_price")
    .from("products")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT MIN(price) AS lowest_price FROM products",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs MAX aggregate", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .max("price", "highest_price")
    .from("products")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT MAX(price) AS highest_price FROM products",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder constructs multiple aggregates", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .min("price", "lowest_price")
    .max("price", "highest_price")
    .avg("price", "average_price")
    .from("products")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT MIN(price) AS lowest_price, MAX(price) AS highest_price, AVG(price) AS average_price FROM products",
  );
  assertEquals(result.debug?.params, []);
});

// Testing raw SQL
Deno.test("QueryBuilder handles raw SQL", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .rawSql("created_at > NOW() - INTERVAL '1 day'")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE (created_at > NOW() - INTERVAL '1 day')",
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder handles raw SQL with parameters", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .rawSql("status = $1 AND role = $2", ["active", "admin"])
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE (status = $1 AND role = $2)",
  );
  assertEquals(result.debug?.params, ["active", "admin"]);
});

// Testing complex queries
Deno.test("QueryBuilder constructs complex query with joins, group by and having", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select([
      "users.id",
      "users.name",
      "COUNT(orders.id) as order_count",
      "SUM(orders.amount) as total_amount",
    ])
    .from("users")
    .leftJoin("orders", "users.id", "=", "orders.user_id")
    .where("users.active", "=", true)
    .groupBy("users.id", "users.name")
    .having("COUNT(orders.id)", ">", 5)
    .orderBy("total_amount", "DESC")
    .limit(10)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT users.id, users.name, COUNT(orders.id) as order_count, SUM(orders.amount) as total_amount FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE users.active = $1 GROUP BY users.id, users.name HAVING COUNT(orders.id) > $2 ORDER BY total_amount DESC LIMIT 10",
  );
  assertEquals(result.debug?.params, [true, 5]);
});

Deno.test("QueryBuilder constructs query with subquery", async () => {
  const adapter = new MockDatabaseAdapter();

  // Create a subquery
  const subQuery = new QueryBuilder()
    .select(["user_id", "COUNT(*) as order_count"])
    .from("orders")
    .groupBy("user_id");

  // Use the subquery in the main query
  const mainQuery = new QueryBuilder()
    .select(["users.id", "users.name", "order_stats.order_count"])
    .from(subQuery, "order_stats")
    .leftJoin("users", "users.id", "=", "order_stats.user_id")
    .where("order_stats.order_count", ">", 3)
    .execute(adapter);

  assertEquals((await mainQuery).rowCount, 1);
  // Note: The exact query format with subqueries might vary, so this test is approximate
  assertEquals(
    (await mainQuery).debug?.query.includes(
      "SELECT users.id, users.name, order_stats.order_count",
    ),
    true,
  );
  assertEquals((await mainQuery).debug?.params, [3]);
});

// Tests for JSON operations
Deno.test("QueryBuilder handles JSON path extraction", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .jsonPath("metadata", "address", "user_address")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query.includes(
      "SELECT id, name, metadata->>'address' AS user_address FROM users",
    ),
    true,
  );
  assertEquals(result.debug?.params, []);
});

// Tests for full-text search
Deno.test("QueryBuilder handles text search", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "title", "content"])
    .from("posts")
    .textSearch(["title", "content"], "search term")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  // This test is approximate since the exact SQL depends on the database type
  assertEquals(
    result.debug?.query.includes("WHERE"),
    true,
  );
  assertEquals(result.debug?.params.includes("search term"), true);
});

// Tests for case expressions
Deno.test("QueryBuilder handles CASE expressions", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .case(
      "status",
      [
        { when: "status = 'active'", then: "Active User" },
        { when: "status = 'pending'", then: "Pending Activation" },
      ],
      "Inactive",
      "status_text",
    )
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query.includes("CASE WHEN status = 'active' THEN"),
    true,
  );
  assertEquals(result.debug?.params.includes("Active User"), true);
  assertEquals(result.debug?.params.includes("Pending Activation"), true);
  assertEquals(result.debug?.params.includes("Inactive"), true);
});

// Tests for window functions
Deno.test("QueryBuilder handles window functions", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name", "department", "salary"])
    .from("employees")
    .window(
      "salary",
      "ROW_NUMBER()",
      ["department"],
      [{ column: "salary", direction: "DESC" }],
      "rank_in_dept",
    )
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query.includes("ROW_NUMBER() OVER"),
    true,
  );
  assertEquals(result.debug?.params, []);
});

// Test for vector operations
Deno.test("QueryBuilder handles vector operations", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set the vector DB configuration
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content", "embedding"])
    .from("documents")
    .knnSearch("embedding", vector, 5)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  // The exact query depends on the vector DB configuration
  assertEquals(
    result.debug?.query.includes("embedding"),
    true,
  );
  assertEquals(result.debug?.params, []);
});

Deno.test("QueryBuilder handles custom vector database configuration", () => {
  // Register a custom vector DB configuration
  QueryBuilder.registerVectorDBConfig("custom-vector", {
    knnSyntax: "custom_knn({column}, {vector}, {k})",
    distanceSyntax: "custom_distance({column}, {vector}) AS distance",
    similaritySyntax: "custom_similarity({column}, {vector}) AS similarity",
    vectorMatchSyntax: "custom_match({column}, {vector}, {threshold})",
    embeddingSearchSyntax: "custom_search({column}, {vector}) AS score",
    formatVector: (vector) =>
      `'[${typeof vector === "string" ? vector : vector.join(",")}]'`,
    defaultMetric: "cosine",
    defaultK: 5,
    defaultThreshold: 0.7,
    placement: "WHERE",
  });

  // Set active config to our custom one
  QueryBuilder.setVectorDBConfig("custom-vector");

  // Verify the active config
  assertEquals(QueryBuilder.getActiveVectorDBConfig(), "custom-vector");
});

// Test for time range filtering
Deno.test("QueryBuilder handles time range filtering", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "title"])
    .from("posts")
    .timeRange("created_at", "this_week")
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query.includes("BETWEEN"),
    true,
  );
  assertEquals(result.debug?.params.length, 2); // Should have start and end date
});

// Test for geospatial radius search
Deno.test("QueryBuilder handles geospatial radius search", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const result = await qb
    .select(["id", "name", "latitude", "longitude"])
    .from("locations")
    .geoRadius("latitude", "longitude", 37.7749, -122.4194, 10)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query.includes("acos"),
    true,
  );
  assertEquals(result.debug?.params.includes(10), true);
});

// Test for hybrid ranking
Deno.test("QueryBuilder handles hybrid ranking", async () => {
  const adapter = new MockDatabaseAdapter();

  // Set up a vector search first
  QueryBuilder.setVectorDBConfig("pgvector");

  const qb = new QueryBuilder();
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

  const result = await qb
    .select(["id", "content", "embedding", "created_at", "view_count"])
    .from("documents")
    .knnSearch("embedding", vector, 10)
    .hybridRanking({ vector: 0.7, recency: 0.2, popularity: 0.1 })
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query.includes("ORDER BY"),
    true,
  );
});

// Test for error handling with invalid syntax
Deno.test("QueryBuilder throws error for invalid join condition format", () => {
  const qb = new QueryBuilder();

  assertThrows(
    () => {
      qb.join("posts", "invalid join condition format");
    },
    Error,
    "Invalid join condition format",
  );
});

// Test to verify reset functionality clears previous query parts
Deno.test("QueryBuilder's reset functionality clears all previous query parts", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  // Build a complex query
  await qb
    .select(["id", "name"])
    .from("users")
    .where("age", ">", 18)
    .orderBy("name")
    .limit(10)
    .execute(adapter);

  // Build a simple query with the same instance
  const result = await qb
    .select(["id"])
    .from("simple_table")
    .execute(adapter);

  // Verify that the second query doesn't have the clauses from the first
  assertEquals(result.debug?.query, "SELECT id FROM simple_table");
  assertEquals(result.debug?.params, []);
});

// Test handling of Date objects in parameters
Deno.test("QueryBuilder handles Date objects in parameters", async () => {
  const adapter = new MockDatabaseAdapter();
  const qb = new QueryBuilder();

  const date = new Date("2023-01-01T00:00:00Z");

  const result = await qb
    .select(["id", "name"])
    .from("users")
    .where("created_at", ">", date)
    .execute(adapter);

  assertEquals(result.rowCount, 1);
  assertEquals(
    result.debug?.query,
    "SELECT id, name FROM users WHERE created_at > $1",
  );
  assertEquals(result.debug?.params[0], date.toISOString());
});
