// benchmarks/query/complex_queries.ts
import { DatabaseFactory } from "../../src/factory/DatabaseFactory.ts";
import { QueryBuilder } from "../../src/query/QueryBuilder.ts";
import { SQLiteAdapter } from "../../src/adapters/SQLiteAdapter.ts";

// Setup in-memory SQLite database for benchmarking
async function getQueryTestDatabase() {
  const config = {
    database: "sqlite",
    databasePath: ":memory:",
  };

  const adapter = DatabaseFactory.createAdapter(config) as SQLiteAdapter;
  await adapter.connect();

  // Create test tables
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS bench_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      active BOOLEAN DEFAULT 1
    )
  `);

  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS bench_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      user_id INTEGER NOT NULL,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES bench_users(id)
    )
  `);

  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS bench_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES bench_posts(id),
      FOREIGN KEY(user_id) REFERENCES bench_users(id)
    )
  `);

  // Insert test data - users
  for (let i = 0; i < 50; i++) {
    await adapter.execute(
      "INSERT INTO bench_users (name, email, active) VALUES (?, ?, ?)",
      [`User ${i}`, `user${i}@example.com`, i % 5 !== 0],
    );
  }

  // Insert test data - posts
  for (let i = 0; i < 200; i++) {
    await adapter.execute(
      "INSERT INTO bench_posts (title, content, user_id, views) VALUES (?, ?, ?, ?)",
      [
        `Post Title ${i}`,
        `This is the content for post ${i}`,
        (i % 50) + 1,
        i * 5,
      ],
    );
  }

  // Insert test data - comments
  for (let i = 0; i < 1000; i++) {
    await adapter.execute(
      "INSERT INTO bench_comments (content, post_id, user_id) VALUES (?, ?, ?)",
      [
        `Comment ${i} on a post`,
        (i % 200) + 1,
        (i % 50) + 1,
      ],
    );
  }

  return adapter;
}

// Clean up function
async function cleanupAdapter(adapter: SQLiteAdapter) {
  try {
    await adapter.execute("DROP TABLE IF EXISTS bench_comments");
    await adapter.execute("DROP TABLE IF EXISTS bench_posts");
    await adapter.execute("DROP TABLE IF EXISTS bench_users");
    await adapter.disconnect();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during cleanup: ${errorMessage}`);
  }
}

// Benchmark: Complex Query Builder operations
Deno.bench("QueryBuilder: Simple WHERE conditions", async () => {
  const adapter = await getQueryTestDatabase();

  try {
    // Execute query with multiple WHERE conditions
    const queryBuilder = new QueryBuilder()
      .select(["id", "name", "email"])
      .from("bench_users")
      .where("active", "=", true)
      .andWhere("name", "LIKE", "User%")
      .limit(10);

    await queryBuilder.execute(adapter);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("QueryBuilder: JOIN operations", async () => {
  const adapter = await getQueryTestDatabase();

  try {
    // Execute query with JOIN
    const queryBuilder = new QueryBuilder()
      .select(["u.id", "u.name", "p.title", "p.views"])
      .from("bench_users", "u")
      .join("bench_posts", "u.id = bench_posts.user_id")
      .where("u.active", "=", true)
      .orderBy("p.views", "DESC")
      .limit(20);

    await queryBuilder.execute(adapter);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("QueryBuilder: Multiple JOINs with conditions", async () => {
  const adapter = await getQueryTestDatabase();

  try {
    // Execute query with multiple JOINs
    const queryBuilder = new QueryBuilder()
      .select([
        "u.name AS user_name",
        "p.title AS post_title",
        "c.content AS comment",
      ])
      .from("bench_comments", "c")
      .join("bench_posts", "c.post_id = bench_posts.id")
      .join("bench_users", "c.user_id = bench_users.id")
      .where("p.views", ">", 50)
      .limit(30);

    await queryBuilder.execute(adapter);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("QueryBuilder: GROUP BY with aggregates", async () => {
  const adapter = await getQueryTestDatabase();

  try {
    // Execute query with GROUP BY and aggregates
    const queryBuilder = new QueryBuilder()
      .select([
        "u.id",
        "u.name",
        "COUNT(p.id) AS post_count",
        "SUM(p.views) AS total_views",
      ])
      .from("bench_users", "u")
      .join("bench_posts", "u.id = bench_posts.user_id")
      .groupBy(["u.id", "u.name"])
      .having("COUNT(p.id)", ">", 3)
      .orderBy("total_views", "DESC")
      .limit(10);

    await queryBuilder.execute(adapter);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("QueryBuilder: Complex subquery", async () => {
  const adapter = await getQueryTestDatabase();

  try {
    // Create a subquery
    const subquery = new QueryBuilder()
      .select(["user_id", "COUNT(*) AS comment_count"])
      .from("bench_comments")
      .groupBy("user_id")
      .having("COUNT(*)", ">", 5);

    // Main query using the subquery
    const queryBuilder = new QueryBuilder()
      .select([
        "u.id",
        "u.name",
        "u.email",
        "c.comment_count",
      ])
      .from("bench_users", "u")
      .join("(" + subquery.toSQL().query + ")", "c", "=", "u.id", "INNER")
      .orderBy("c.comment_count", "DESC")
      .limit(10);

    await queryBuilder.execute(adapter);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench(
  "QueryBuilder: Advanced filtering with multiple conditions",
  async () => {
    const adapter = await getQueryTestDatabase();

    try {
      // Execute query with advanced filtering
      const queryBuilder = new QueryBuilder()
        .select(["p.id", "p.title", "u.name", "p.views"])
        .from("bench_posts", "p")
        .join("bench_users AS u", "p.user_id = u.id")
        .where("p.views", ">", 40)
        .andWhere("u.active", "=", true)
        .orderBy("p.views", "DESC")
        .limit(25);

      await queryBuilder.execute(adapter);
    } finally {
      await cleanupAdapter(adapter);
    }
  },
);
