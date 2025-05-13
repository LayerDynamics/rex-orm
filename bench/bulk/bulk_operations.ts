// benchmarks/bulk/bulk_operations.ts
import { DatabaseFactory } from "../../src/factory/DatabaseFactory.ts";
import { BulkOperations } from "../../src/bulk/BulkOperations.ts";
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
    CREATE TABLE IF NOT EXISTS bench_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL,
      quantity INTEGER,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return adapter;
}

// Define a test model for benchmarking
@Entity({ tableName: "bench_items" })
class BenchItem extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "float" })
  price!: number;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({ type: "boolean" })
  active!: boolean;

  @Column({ type: "timestamp" })
  createdAt!: Date;
}

// Define a specific type for database rows
interface BenchItemRow {
  id: number;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  active: boolean;
  created_at: string | Date;
}

// Generate test data
function generateItems(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const item = new BenchItem();
    item.name = `Item ${i}`;
    item.description =
      `This is a detailed description for item ${i}. It contains various details about the product.`;
    item.price = Math.round((10 + Math.random() * 90) * 100) / 100;
    item.quantity = Math.floor(Math.random() * 100);
    item.active = Math.random() > 0.2;
    item.createdAt = new Date();
    return item;
  });
}

// Register bulk operation benchmarks
Deno.bench("Bulk: Insert 1,000 records (individual)", async () => {
  const adapter = await getTestAdapter();

  try {
    // Generate test data
    const items = generateItems(1000);

    // Insert individual records
    const qb = new QueryBuilder();
    for (const item of items) {
      await qb.insert("bench_items", {
        name: item.name,
        description: item.description,
        price: item.price,
        quantity: item.quantity,
        active: item.active,
        created_at: item.createdAt,
      }).execute(adapter);
    }
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_items");
    await adapter.disconnect();
  }
});

Deno.bench("Bulk: Insert 1,000 records (bulk operation)", async () => {
  const adapter = await getTestAdapter();

  try {
    // Generate test data
    const items = generateItems(1000);

    // Use bulk operations
    const bulkOps = new BulkOperations(adapter);
    await bulkOps.bulkInsert(items);
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_items");
    await adapter.disconnect();
  }
});

Deno.bench("Bulk: Update 1,000 records (individual)", async () => {
  const adapter = await getTestAdapter();

  try {
    // Generate and insert test data
    const items = generateItems(1000);
    const bulkOps = new BulkOperations(adapter);
    await bulkOps.bulkInsert(items);

    // Update individual records
    const qb = new QueryBuilder();
    for (let i = 1; i <= 1000; i++) {
      await qb.update("bench_items", {
        price: 99.99,
        active: false,
      }).where("id", "=", i).execute(adapter);
    }
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_items");
    await adapter.disconnect();
  }
});

Deno.bench("Bulk: Update 1,000 records (bulk operation)", async () => {
  const adapter = await getTestAdapter();

  try {
    // Generate and insert test data
    const items = generateItems(1000);
    const bulkOps = new BulkOperations(adapter);
    await bulkOps.bulkInsert(items);

    // Retrieve all items to update
    const qb = new QueryBuilder();
    const result = await qb.select("*").from("bench_items").execute(adapter);

    // Prepare models for bulk update
    const modelsToUpdate = result.rows.map((row) => {
      const rowData = row as unknown as BenchItemRow;
      const item = new BenchItem();
      Object.assign(item, {
        ...rowData,
        createdAt: rowData.created_at instanceof Date
          ? rowData.created_at
          : new Date(rowData.created_at),
      });
      item.price = 99.99;
      item.active = false;
      return item;
    });

    // Use bulk operations for update
    await bulkOps.bulkUpdate(modelsToUpdate);
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_items");
    await adapter.disconnect();
  }
});

Deno.bench("Bulk: Delete 1,000 records (individual)", async () => {
  const adapter = await getTestAdapter();

  try {
    // Generate and insert test data
    const items = generateItems(1000);
    const bulkOps = new BulkOperations(adapter);
    await bulkOps.bulkInsert(items);

    // Delete individual records
    const qb = new QueryBuilder();
    for (let i = 1; i <= 1000; i++) {
      await qb.delete("bench_items").where("id", "=", i).execute(adapter);
    }
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_items");
    await adapter.disconnect();
  }
});

Deno.bench("Bulk: Delete 1,000 records (bulk operation)", async () => {
  const adapter = await getTestAdapter();

  try {
    // Generate and insert test data
    const items = generateItems(1000);
    const bulkOps = new BulkOperations(adapter);
    await bulkOps.bulkInsert(items);

    // Retrieve all items to delete
    const qb = new QueryBuilder();
    const result = await qb.select("*").from("bench_items").execute(adapter);

    // Prepare models for bulk delete
    const modelsToDelete = result.rows.map((row) => {
      const rowData = row as unknown as BenchItemRow;
      const item = new BenchItem();
      Object.assign(item, {
        ...rowData,
        createdAt: rowData.created_at instanceof Date
          ? rowData.created_at
          : new Date(rowData.created_at),
      });
      return item;
    });

    // Use bulk operations for delete
    await bulkOps.bulkDelete(modelsToDelete);
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_items");
    await adapter.disconnect();
  }
});

Deno.bench("Bulk: Transaction with 1,000 operations", async () => {
  const adapter = await getTestAdapter();

  try {
    // Use transaction
    await adapter.transaction(async () => {
      const qb = new QueryBuilder();

      // Insert 1,000 records in a single transaction
      for (let i = 0; i < 1000; i++) {
        await qb.insert("bench_items", {
          name: `Item ${i}`,
          description: `Transaction item ${i}`,
          price: 10.99 + i * 0.1,
          quantity: i,
          active: true,
          created_at: new Date(),
        }).execute(adapter);
      }
    });
  } finally {
    // Clean up
    await adapter.execute("DROP TABLE IF EXISTS bench_items");
    await adapter.disconnect();
  }
});
