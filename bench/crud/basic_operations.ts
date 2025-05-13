// benchmarks/crud/basic_operations.ts
import { DatabaseFactory } from "../../src/factory/DatabaseFactory.ts";
import { QueryBuilder } from "../../src/query/QueryBuilder.ts";
import { BaseModel } from "../../src/models/BaseModel.ts";
import { Column, Entity, PrimaryKey } from "../../src/decorators/index.ts";

// Setup in-memory SQLite database for benchmarking
async function getTestAdapter() {
  const config = {
    database: "sqlite",
    databasePath: ":memory:",
  };

  const adapter = DatabaseFactory.createAdapter(config);
  await adapter.connect();

  // Create test table
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS bench_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return adapter;
}

// Define a test model for benchmarking
@Entity({ tableName: "bench_users" })
class BenchUser extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "integer" })
  age!: number;

  @Column({ type: "timestamp" })
  createdAt!: Date;
}

// Register CRUD benchmarks
Deno.bench("CRUD: Create 1,000 records", async () => {
  const adapter = await getTestAdapter();

  try {
    // Setup: Prepare data
    const users = Array.from({ length: 1000 }, (_, i) => ({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 20 + (i % 50),
      createdAt: new Date(),
    }));

    // Insert records using QueryBuilder
    for (const userData of users) {
      const qb = new QueryBuilder();
      await qb.insert("bench_users", userData).execute(adapter);
    }
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_users");
    await adapter.disconnect();
  }
});

Deno.bench("CRUD: Read 1,000 records", async () => {
  const adapter = await getTestAdapter();

  try {
    // Setup: Insert test data
    const insertQb = new QueryBuilder();
    const insertPromises = [];

    for (let i = 0; i < 1000; i++) {
      insertPromises.push(
        insertQb.insert("bench_users", {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
          createdAt: new Date(),
        }).execute(adapter),
      );
    }

    await Promise.all(insertPromises);

    // Read all records
    const qb = new QueryBuilder();
    await qb.select("*").from("bench_users").execute(adapter);
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_users");
    await adapter.disconnect();
  }
});

Deno.bench("CRUD: Update 1,000 records", async () => {
  const adapter = await getTestAdapter();

  try {
    // Setup: Insert test data
    const insertQb = new QueryBuilder();
    const insertPromises = [];

    for (let i = 0; i < 1000; i++) {
      insertPromises.push(
        insertQb.insert("bench_users", {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
          createdAt: new Date(),
        }).execute(adapter),
      );
    }

    await Promise.all(insertPromises);

    // Update all records
    const qb = new QueryBuilder();
    await qb
      .update("bench_users", { name: "Updated User" })
      .where("age", ">", 30)
      .execute(adapter);
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_users");
    await adapter.disconnect();
  }
});

Deno.bench("CRUD: Delete 1,000 records", async () => {
  const adapter = await getTestAdapter();

  try {
    // Setup: Insert test data
    const insertQb = new QueryBuilder();
    const insertPromises = [];

    for (let i = 0; i < 1000; i++) {
      insertPromises.push(
        insertQb.insert("bench_users", {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
          createdAt: new Date(),
        }).execute(adapter),
      );
    }

    await Promise.all(insertPromises);

    // Delete all records
    const qb = new QueryBuilder();
    await qb.delete("bench_users").execute(adapter);
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_users");
    await adapter.disconnect();
  }
});

Deno.bench("CRUD: Model-based Create", async () => {
  const adapter = await getTestAdapter();

  try {
    // Create records using the model
    for (let i = 0; i < 100; i++) {
      const user = new BenchUser();
      user.name = `User ${i}`;
      user.email = `user${i}@example.com`;
      user.age = 20 + (i % 50);
      user.createdAt = new Date();
      await user.save(adapter);
    }
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_users");
    await adapter.disconnect();
  }
});
