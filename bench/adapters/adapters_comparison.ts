// benchmarks/adapters/adapters_comparison.ts
import { DatabaseFactory } from "../../src/factory/DatabaseFactory.ts";
import { QueryBuilder } from "../../src/query/QueryBuilder.ts";
import { SQLiteAdapter } from "../../src/adapters/SQLiteAdapter.ts";
import { PostgreSQLAdapter } from "../../src/adapters/PostgreSQLAdapter.ts";
import { BulkOperations } from "../../src/bulk/BulkOperations.ts";
import { BaseModel } from "../../src/models/BaseModel.ts";
import { DatabaseAdapter } from "../../src/interfaces/DatabaseAdapter.ts";
import { Entity } from "../../src/decorators/Entity.ts";
import { Column } from "../../src/decorators/Column.ts";

// Create a benchmark model that extends BaseModel for testing
@Entity({ tableName: "bench_models" })
class BenchModel extends BaseModel {
  @Column({ primaryKey: true })
  id!: number;

  @Column()
  name!: string;

  @Column()
  value!: string;

  @Column({ name: "created_at" })
  created_at!: Date;

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;

  constructor(data?: Partial<BenchModel>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }

  // Method to demonstrate QueryBuilder usage (addressing unused import)
  static createQueryBuilder(): QueryBuilder {
    return new QueryBuilder();
  }

  // This static property helps with table name convention
  static get tableName(): string {
    return "bench_models";
  }
}

// Setup in-memory SQLite database for benchmarking
async function getSQLiteAdapter() {
  const config = {
    database: "sqlite",
    databasePath: ":memory:",
  };

  const adapter = DatabaseFactory.createAdapter(config) as SQLiteAdapter;
  await adapter.connect();

  // Set pragmas for better performance in benchmarks
  await adapter.execute("PRAGMA journal_mode = OFF;");
  await adapter.execute("PRAGMA synchronous = OFF;");
  await adapter.execute("PRAGMA cache_size = 1000000;");
  await adapter.execute("PRAGMA temp_store = MEMORY;");
  await adapter.execute("PRAGMA locking_mode = EXCLUSIVE;");

  // Create test table
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS bench_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return adapter;
}

// Update the PostgreSQL connection configuration to match your Docker setup
async function tryGetPostgresAdapter() {
  try {
    const config = {
      database: "postgres",
      databaseName: "rex_orm_benchmark",
      user: "rex_user",
      password: "rex_password",
      host: "localhost",
      port: 5432,
    };

    // Directly use the PostgreSQLAdapter type to satisfy the linter
    // while maintaining the same functionality through the factory
    const adapter = DatabaseFactory.createAdapter(config) as PostgreSQLAdapter;
    await adapter.connect();

    // Create test table
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_data (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return adapter;
  } catch (error: unknown) {
    // Properly handle unknown error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Skipping PostgreSQL tests: ${errorMessage}`);
    return null;
  }
}

// Improved cleanup function with better type annotation
async function cleanupAdapter(adapter: DatabaseAdapter) {
  if (!adapter) return;

  try {
    await adapter.execute("DROP TABLE IF EXISTS bench_data");
    await adapter.disconnect();
  } catch (error: unknown) {
    // Properly handle unknown error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during cleanup: ${errorMessage}`);
  }
}

// Register adapter comparison benchmarks
Deno.bench("Adapter: SQLite - Simple INSERT", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Insert 100 records
    for (let i = 0; i < 100; i++) {
      await adapter.execute(
        "INSERT INTO bench_data (name, value) VALUES (?, ?)",
        [`Name ${i}`, `Value ${i}`],
      );
    }
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("Adapter: SQLite - Simple SELECT", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Insert test data
    for (let i = 0; i < 100; i++) {
      await adapter.execute(
        "INSERT INTO bench_data (name, value) VALUES (?, ?)",
        [`Name ${i}`, `Value ${i}`],
      );
    }

    // Perform SELECT
    await adapter.execute("SELECT * FROM bench_data");
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("Adapter: SQLite - Transaction with 100 INSERTs", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Use transaction
    await adapter.transaction(async () => {
      for (let i = 0; i < 100; i++) {
        await adapter.execute(
          "INSERT INTO bench_data (name, value) VALUES (?, ?)",
          [`Name ${i}`, `Value ${i}`],
        );
      }
    });
  } finally {
    await cleanupAdapter(adapter);
  }
});

// Conditionally add PostgreSQL benchmarks - they will only run if PostgreSQL is available
Deno.bench("Adapter: PostgreSQL - Simple INSERT", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    // Skip benchmark if PostgreSQL is not available
    return;
  }

  try {
    // Insert 100 records
    for (let i = 0; i < 100; i++) {
      await adapter.execute(
        "INSERT INTO bench_data (name, value) VALUES ($1, $2)",
        [`Name ${i}`, `Value ${i}`],
      );
    }
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("Adapter: PostgreSQL - Simple SELECT", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    // Skip benchmark if PostgreSQL is not available
    return;
  }

  try {
    // Insert test data
    for (let i = 0; i < 100; i++) {
      await adapter.execute(
        "INSERT INTO bench_data (name, value) VALUES ($1, $2)",
        [`Name ${i}`, `Value ${i}`],
      );
    }

    // Perform SELECT
    await adapter.execute("SELECT * FROM bench_data");
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("Adapter: PostgreSQL - Transaction with 100 INSERTs", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    // Skip benchmark if PostgreSQL is not available
    return;
  }

  try {
    // Use transaction
    await adapter.transaction(async () => {
      for (let i = 0; i < 100; i++) {
        await adapter.execute(
          "INSERT INTO bench_data (name, value) VALUES ($1, $2)",
          [`Name ${i}`, `Value ${i}`],
        );
      }
    });
  } finally {
    await cleanupAdapter(adapter);
  }
});

// Compare query performance between adapters
Deno.bench("Adapter: SQLite - Complex Query", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Setup: Create and populate tables for join test
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        price REAL,
        FOREIGN KEY(category_id) REFERENCES bench_categories(id)
      )
    `);

    // Insert test data - categories
    for (let i = 0; i < 10; i++) {
      await adapter.execute(
        "INSERT INTO bench_categories (name) VALUES (?)",
        [`Category ${i}`],
      );
    }

    // Insert test data - products
    for (let i = 0; i < 200; i++) {
      await adapter.execute(
        "INSERT INTO bench_products (name, category_id, price) VALUES (?, ?, ?)",
        [`Product ${i}`, (i % 10) + 1, 10 + (i % 90)],
      );
    }

    // Perform complex query with JOIN, GROUP BY, and aggregates
    await adapter.execute(`
      SELECT c.name as category, 
             COUNT(p.id) as product_count, 
             AVG(p.price) as avg_price, 
             SUM(p.price) as total_price
      FROM bench_categories c
      JOIN bench_products p ON c.id = p.category_id
      GROUP BY c.id
      HAVING COUNT(p.id) > 5
      ORDER BY avg_price DESC
    `);
  } finally {
    // Cleanup
    await adapter.execute("DROP TABLE IF EXISTS bench_products");
    await adapter.execute("DROP TABLE IF EXISTS bench_categories");
    await cleanupAdapter(adapter);
  }
});

Deno.bench("Adapter: PostgreSQL - Complex Query", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    // Skip benchmark if PostgreSQL is not available
    return;
  }

  try {
    // Setup: Create and populate tables for join test
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id INTEGER,
        price REAL,
        FOREIGN KEY(category_id) REFERENCES bench_categories(id)
      )
    `);

    // Insert test data - categories
    for (let i = 0; i < 10; i++) {
      await adapter.execute(
        "INSERT INTO bench_categories (name) VALUES ($1)",
        [`Category ${i}`],
      );
    }

    // Insert test data - products
    for (let i = 0; i < 200; i++) {
      await adapter.execute(
        "INSERT INTO bench_products (name, category_id, price) VALUES ($1, $2, $3)",
        [`Product ${i}`, (i % 10) + 1, 10 + (i % 90)],
      );
    }

    // Perform complex query with JOIN, GROUP BY, and aggregates
    await adapter.execute(`
      SELECT c.name as category, 
             COUNT(p.id) as product_count, 
             AVG(p.price) as avg_price, 
             SUM(p.price) as total_price
      FROM bench_categories c
      JOIN bench_products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      HAVING COUNT(p.id) > 5
      ORDER BY avg_price DESC
    `);
  } finally {
    // Cleanup
    await adapter.execute("DROP TABLE IF EXISTS bench_products");
    await adapter.execute("DROP TABLE IF EXISTS bench_categories");
    await cleanupAdapter(adapter);
  }
});

Deno.bench("Adapter: PostgreSQL - Complex Query (Optimized)", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    // Skip benchmark if PostgreSQL is not available
    return;
  }

  try {
    // Setup: Create and populate tables for join test
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    // Create index for better query performance
    await adapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_bench_categories_id ON bench_categories(id)
    `);

    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id INTEGER,
        price NUMERIC(10, 2),
        FOREIGN KEY(category_id) REFERENCES bench_categories(id)
      )
    `);

    // Create index for better join performance
    await adapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_bench_products_category_id ON bench_products(category_id)
    `);

    // Insert test data - categories
    for (let i = 0; i < 10; i++) {
      await adapter.execute(
        "INSERT INTO bench_categories (name) VALUES ($1)",
        [`Category ${i}`],
      );
    }

    // Use batched inserts for better performance
    const batchSize = 50;
    for (let i = 0; i < 200; i += batchSize) {
      const batchValues = [];
      const placeholders = [];

      for (let j = 0; j < batchSize && i + j < 200; j++) {
        const idx = i + j;
        batchValues.push(`Product ${idx}`, (idx % 10) + 1, 10 + (idx % 90));
        placeholders.push(`($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`);
      }

      await adapter.execute(
        `INSERT INTO bench_products (name, category_id, price) VALUES ${
          placeholders.join(", ")
        }`,
        batchValues,
      );
    }

    // Analyze tables for better query planning
    await adapter.execute("ANALYZE bench_categories");
    await adapter.execute("ANALYZE bench_products");

    // Perform complex query with JOIN, GROUP BY, and aggregates
    // Use CTE (Common Table Expression) for better readability and performance
    await adapter.execute(`
      WITH product_stats AS (
        SELECT 
          c.id AS category_id,
          c.name AS category,
          COUNT(p.id) AS product_count,
          AVG(p.price) AS avg_price,
          SUM(p.price) AS total_price
        FROM bench_categories c
        JOIN bench_products p ON c.id = p.category_id
        GROUP BY c.id, c.name
        HAVING COUNT(p.id) > 5
      )
      SELECT 
        category, 
        product_count, 
        avg_price, 
        total_price
      FROM product_stats
      ORDER BY avg_price DESC
    `);
  } finally {
    // Cleanup
    await adapter.execute("DROP TABLE IF EXISTS bench_products");
    await adapter.execute("DROP TABLE IF EXISTS bench_categories");
    await cleanupAdapter(adapter);
  }
});

// Add new benchmark for optimized batch operations using the executeMany method
Deno.bench(
  "Adapter: SQLite - Batched executeMany with 100 INSERTs",
  async () => {
    const adapter = await getSQLiteAdapter();

    try {
      // Create test data - 100 sets of parameters for the same query
      const paramSets = [];
      for (let i = 0; i < 100; i++) {
        paramSets.push([`Name ${i}`, `Value ${i}`]);
      }

      // Use the new executeMany method to run all inserts in a batch
      await adapter.executeMany(
        "INSERT INTO bench_data (name, value) VALUES (?, ?)",
        paramSets,
      );
    } finally {
      await cleanupAdapter(adapter);
    }
  },
);

// Add new benchmark for optimized batch operations using executeMany with PostgreSQL
Deno.bench(
  "Adapter: PostgreSQL - Batched executeMany with 100 INSERTs",
  async () => {
    const adapter = await tryGetPostgresAdapter();

    if (!adapter) {
      // Skip benchmark if PostgreSQL is not available
      return;
    }

    try {
      // Create test data - 100 sets of parameters for the same query
      const paramSets = [];
      for (let i = 0; i < 100; i++) {
        paramSets.push([`Name ${i}`, `Value ${i}`]);
      }

      // Use the executeMany method to run all inserts in a batch
      await adapter.executeMany(
        "INSERT INTO bench_data (name, value) VALUES ($1, $2)",
        paramSets,
      );
    } finally {
      await cleanupAdapter(adapter);
    }
  },
);

// Test BulkOperations with the new executeMany-based update
Deno.bench(
  "Adapter: SQLite - BulkOperations batch update 100 records",
  async () => {
    const adapter = await getSQLiteAdapter();

    try {
      // Set up table structure to match BenchModel structure
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS bench_models (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create test data
      for (let i = 0; i < 100; i++) {
        await adapter.execute(
          "INSERT INTO bench_models (name, value) VALUES (?, ?)",
          [`Name ${i}`, `Value ${i}`],
        );
      }

      // Get all records for update
      const result = await adapter.execute("SELECT * FROM bench_models");

      // Create BenchModel instances for bulk update
      const records = result.rows.map((record) =>
        new BenchModel({
          ...record,
          name: `Updated ${record.name}`,
          value: `Updated ${record.value}`,
          created_at: new Date(String(record.created_at)),
          createdAt: new Date(String(record.created_at)),
          updatedAt: new Date(),
        })
      );

      // Use BulkOperations to perform updates
      const bulkOps = new BulkOperations(adapter);
      await bulkOps.bulkUpdate(records, "id");
    } finally {
      await adapter.execute("DROP TABLE IF EXISTS bench_models");
      await cleanupAdapter(adapter);
    }
  },
);

// Add a comparison between individual INSERTs and batched INSERTs for SQLite
Deno.bench(
  "Adapter: SQLite - 100 Individual INSERTs without transaction",
  async () => {
    const adapter = await getSQLiteAdapter();

    try {
      // Insert 100 records individually without a transaction
      for (let i = 0; i < 100; i++) {
        await adapter.execute(
          "INSERT INTO bench_data (name, value) VALUES (?, ?)",
          [`Name ${i}`, `Value ${i}`],
        );
      }
    } finally {
      await cleanupAdapter(adapter);
    }
  },
);

// Create a benchmark specific to bulk insert operation
Deno.bench("Adapter: SQLite - BulkOperations insert 100 records", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Create models to insert with BenchModel instances that extend BaseModel
    const models = [];
    for (let i = 0; i < 100; i++) {
      models.push(
        new BenchModel({
          name: `Name ${i}`,
          value: `Value ${i}`,
          created_at: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    }

    // Set up table structure to match BenchModel's properties
    // Match column names to what's expected in your BenchModel class
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value TEXT,
        created_at TIMESTAMP,
        created_at_2 TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);

    // Clean table before insert to avoid conflicts
    await adapter.execute("DELETE FROM bench_models");

    // Use BulkOperations to perform inserts
    const bulkOps = new BulkOperations(adapter);
    await bulkOps.bulkInsert(models);
  } finally {
    await adapter.execute("DROP TABLE IF EXISTS bench_models");
    await cleanupAdapter(adapter);
  }
});

// Create a benchmark specific to bulk insert operation for PostgreSQL
Deno.bench(
  "Adapter: PostgreSQL - BulkOperations insert 100 records",
  async () => {
    const adapter = await tryGetPostgresAdapter();

    if (!adapter) {
      // Skip benchmark if PostgreSQL is not available
      return;
    }

    try {
      // Create models to insert with BenchModel instances that extend BaseModel
      const models = [];
      for (let i = 0; i < 100; i++) {
        models.push(
          new BenchModel({
            name: `Name ${i}`,
            value: `Value ${i}`,
            created_at: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );
      }

      // Set up table structure to match BenchModel's properties
      // Match column names to what's expected in your BenchModel class
      await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_models (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        value TEXT,
        created_at TIMESTAMP,
        created_at_2 TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);

      // Clean table before insert to avoid conflicts
      await adapter.execute("DELETE FROM bench_models");

      // Use BulkOperations to perform inserts
      const bulkOps = new BulkOperations(adapter);
      await bulkOps.bulkInsert(models);
    } finally {
      await adapter.execute("DROP TABLE IF EXISTS bench_models");
      await cleanupAdapter(adapter);
    }
  },
);

// Test BulkOperations with batch update for PostgreSQL
Deno.bench(
  "Adapter: PostgreSQL - BulkOperations batch update 100 records",
  async () => {
    const adapter = await tryGetPostgresAdapter();

    if (!adapter) {
      // Skip benchmark if PostgreSQL is not available
      return;
    }

    try {
      // Set up table structure to match BenchModel structure
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS bench_models (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create test data
      for (let i = 0; i < 100; i++) {
        await adapter.execute(
          "INSERT INTO bench_models (name, value) VALUES ($1, $2)",
          [`Name ${i}`, `Value ${i}`],
        );
      }

      // Get all records for update
      const result = await adapter.execute("SELECT * FROM bench_models");

      // Create BenchModel instances for bulk update
      const records = result.rows.map((record) =>
        new BenchModel({
          ...record,
          name: `Updated ${record.name}`,
          value: `Updated ${record.value}`,
          created_at: new Date(String(record.created_at)),
          createdAt: new Date(String(record.created_at)),
          updatedAt: new Date(),
        })
      );

      // Use BulkOperations to perform updates
      const bulkOps = new BulkOperations(adapter);
      await bulkOps.bulkUpdate(records, "id");
    } finally {
      await adapter.execute("DROP TABLE IF EXISTS bench_models");
      await cleanupAdapter(adapter);
    }
  },
);
