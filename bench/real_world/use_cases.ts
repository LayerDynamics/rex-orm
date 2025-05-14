// benchmark/real_world/use_cases.ts
import { DatabaseFactory } from "../../src/factory/DatabaseFactory.ts";
import { SQLiteAdapter } from "../../src/adapters/SQLiteAdapter.ts";
import { PostgreSQLAdapter } from "../../src/adapters/PostgreSQLAdapter.ts";

// Setup in-memory SQLite database for benchmarking
async function getSQLiteAdapter() {
  const config = {
    database: "sqlite",
    databasePath: ":memory:",
  };

  const adapter = DatabaseFactory.createAdapter(config) as SQLiteAdapter;
  await adapter.connect();

  await setupECommerceSchema(adapter, "sqlite");
  return adapter;
}

// Setup PostgreSQL database for benchmarking
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

    const adapter = DatabaseFactory.createAdapter(config) as PostgreSQLAdapter;
    await adapter.connect();

    // Check if tables exist before trying to drop them
    const checkResult = await adapter.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items'
      )`);

    const tablesExist = checkResult.rows[0]?.exists === true;

    // Only attempt to drop if tables exist
    if (tablesExist) {
      await adapter.execute("DROP TABLE IF EXISTS order_items CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS orders CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS products CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS categories CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS users CASCADE");
    }

    await setupECommerceSchema(adapter, "postgres");
    return adapter;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Skipping PostgreSQL tests: ${errorMessage}`);
    return null;
  }
}

// Create e-commerce schema with users, products, orders, and order_items
async function setupECommerceSchema(
  adapter: SQLiteAdapter | PostgreSQLAdapter,
  dbType: "sqlite" | "postgres",
) {
  // Start a transaction for better performance and reliability
  try {
    await adapter.beginTransaction();

    // Drop existing tables if they exist (with CASCADE to handle dependencies)
    if (dbType === "postgres") {
      await adapter.execute("DROP TABLE IF EXISTS order_items CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS orders CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS products CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS categories CASCADE");
      await adapter.execute("DROP TABLE IF EXISTS users CASCADE");
    } else {
      await adapter.execute("DROP TABLE IF EXISTS order_items");
      await adapter.execute("DROP TABLE IF EXISTS orders");
      await adapter.execute("DROP TABLE IF EXISTS products");
      await adapter.execute("DROP TABLE IF EXISTS categories");
      await adapter.execute("DROP TABLE IF EXISTS users");
    }

    // Create users table
    if (dbType === "sqlite") {
      await adapter.execute(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active'
        )
      `);
    } else {
      await adapter.execute(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active'
        )
      `);
    }

    // Create categories table
    if (dbType === "sqlite") {
      await adapter.execute(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER NULL REFERENCES categories(id)
        )
      `);
    } else {
      await adapter.execute(`
        CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          parent_id INTEGER NULL REFERENCES categories(id)
        )
      `);
    }

    // Create products table
    if (dbType === "sqlite") {
      await adapter.execute(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_featured BOOLEAN DEFAULT 0
        )
      `);
    } else {
      await adapter.execute(`
        CREATE TABLE products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC(10, 2) NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_featured BOOLEAN DEFAULT FALSE
        )
      `);

      // Create index on category_id for better join performance
      await adapter.execute(`
        CREATE INDEX idx_products_category_id ON products(category_id)
      `);
    }

    // Create orders table
    if (dbType === "sqlite") {
      await adapter.execute(`
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status TEXT CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
          total_amount REAL NOT NULL
        )
      `);
    } else {
      await adapter.execute(`
        CREATE TABLE orders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
          total_amount NUMERIC(10, 2) NOT NULL
        )
      `);

      // Create index on user_id for better join performance
      await adapter.execute(`
        CREATE INDEX idx_orders_user_id ON orders(user_id)
      `);
    }

    // Create order_items table
    if (dbType === "sqlite") {
      await adapter.execute(`
        CREATE TABLE order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          product_id INTEGER NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL,
          price_per_unit REAL NOT NULL
        )
      `);
    } else {
      await adapter.execute(`
        CREATE TABLE order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          product_id INTEGER NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL,
          price_per_unit NUMERIC(10, 2) NOT NULL
        )
      `);

      // Create indices for better join performance
      await adapter.execute(`
        CREATE INDEX idx_order_items_order_id ON order_items(order_id)
      `);

      await adapter.execute(`
        CREATE INDEX idx_order_items_product_id ON order_items(product_id)
      `);
    }

    // Commit schema creation
    await adapter.commit();

    // Start a new transaction for data population
    await adapter.beginTransaction();
    await populateTestData(adapter, dbType);
    await adapter.commit();
  } catch (error) {
    // Rollback on error
    try {
      await adapter.rollback();
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw error;
  }
}

// Populate test data for e-commerce schema
async function populateTestData(
  adapter: SQLiteAdapter | PostgreSQLAdapter,
  dbType: "sqlite" | "postgres",
) {
  const placeholders = dbType === "sqlite" ? "(?, ?, ?)" : "($1, $2, $3)";
  const categoryPlaceholders = dbType === "sqlite" ? "(?, ?)" : "($1, $2)";

  // No need to start a transaction here - it's already started in setupECommerceSchema

  try {
    // Insert users
    const userStmt =
      `INSERT INTO users (name, email, status) VALUES ${placeholders}`;
    for (let i = 0; i < 100; i++) {
      const status = i % 10 === 0
        ? "inactive"
        : i % 20 === 0
        ? "suspended"
        : "active";
      await adapter.execute(userStmt, [
        `User ${i}`,
        `user${i}@example.com`,
        status,
      ]);
    }

    // Insert categories (include parent-child relationships)
    const categoryStmt =
      `INSERT INTO categories (name, parent_id) VALUES ${categoryPlaceholders}`;

    // Main categories
    for (let i = 0; i < 10; i++) {
      await adapter.execute(categoryStmt, [`Main Category ${i}`, null]);
    }

    // Sub-categories
    for (let i = 0; i < 30; i++) {
      const parentId = (i % 10) + 1; // Assign to one of the main categories
      await adapter.execute(categoryStmt, [`Sub Category ${i}`, parentId]);
    }

    // Insert products
    const productStmt = dbType === "sqlite"
      ? `INSERT INTO products (name, description, price, category_id, stock_quantity, is_featured) VALUES (?, ?, ?, ?, ?, ?)`
      : `INSERT INTO products (name, description, price, category_id, stock_quantity, is_featured) VALUES ($1, $2, $3, $4, $5, $6)`;

    for (let i = 0; i < 500; i++) {
      const categoryId = (i % 30) + 11; // Use subcategories (11-40)
      const price = 10 + (i % 100) * 2.5;
      const isFeatured = i % 10 === 0;
      await adapter.execute(
        productStmt,
        [
          `Product ${i}`,
          `This is a detailed description for product ${i}. It has various features and benefits.`,
          price,
          categoryId,
          50 + (i % 200),
          isFeatured,
        ],
      );
    }

    // Preload all product prices to avoid individual queries for each order item
    const productPricesResult = await adapter.execute(
      "SELECT id, price FROM products",
    );

    // Fix the Record type with proper key typing
    const productPrices: Record<number | string, number> = {};
    for (const row of productPricesResult.rows) {
      const price = typeof row.price === "string"
        ? parseFloat(row.price)
        : Number(row.price);
      productPrices[row.id as number | string] = price;
    }

    // Insert orders and order items
    const orderStmt = dbType === "sqlite"
      ? `INSERT INTO orders (user_id, status, total_amount) VALUES (?, ?, ?)`
      : `INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3)`;

    const orderItemStmt = dbType === "sqlite"
      ? `INSERT INTO order_items (order_id, product_id, quantity, price_per_unit) VALUES (?, ?, ?, ?)`
      : `INSERT INTO order_items (order_id, product_id, quantity, price_per_unit) VALUES ($1, $2, $3, $4)`;

    const statuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    // Create orders
    for (let i = 0; i < 200; i++) {
      const userId = (i % 100) + 1;
      const status = statuses[i % 5];

      // Initially set total to 0, will update after adding items
      await adapter.execute(orderStmt, [userId, status, 0]);

      // Get the order ID
      const orderIdResult = await adapter.execute(
        dbType === "sqlite"
          ? "SELECT last_insert_rowid() as id"
          : "SELECT lastval() as id",
      );
      const orderId = orderIdResult.rows[0].id;

      // Add 1-5 items to each order
      let totalAmount = 0;
      const itemCount = 1 + (i % 5);

      // Prepare batch parameters for order items with proper typing
      const orderItemParams: (string | number)[][] = [];

      for (let j = 0; j < itemCount; j++) {
        const productId = ((i * 3 + j) % 500) + 1;
        const quantity = 1 + (j % 3);

        // Use cached product price instead of querying
        const pricePerUnit = productPrices[productId];
        totalAmount += pricePerUnit * quantity;

        // Add to batch parameters
        if (dbType === "sqlite") {
          await adapter.execute(orderItemStmt, [
            orderId as number | string,
            productId,
            quantity,
            pricePerUnit,
          ]);
        } else {
          orderItemParams.push([
            orderId as number | string,
            productId,
            quantity,
            pricePerUnit,
          ]);
        }
      }

      // For PostgreSQL, use executeMany for better performance
      if (dbType === "postgres" && orderItemParams.length > 0) {
        await adapter.executeMany(orderItemStmt, orderItemParams);
      }

      // Update order with correct total with explicit numeric type
      await adapter.execute(
        dbType === "sqlite"
          ? "UPDATE orders SET total_amount = ? WHERE id = ?"
          : "UPDATE orders SET total_amount = $1 WHERE id = $2",
        [totalAmount as number, orderId as number | string],
      );
    }

    // No need to commit here - it will be committed in setupECommerceSchema
  } catch (error) {
    // No need to rollback here - it will be handled in setupECommerceSchema
    throw error;
  }
}

// Clean up function
async function cleanupAdapter(
  adapter: SQLiteAdapter | PostgreSQLAdapter | null,
) {
  if (!adapter) return;

  try {
    // Check if we're connected before attempting operations
    if (adapter.connected) {
      try {
        // Start a transaction for cleanup
        await adapter.beginTransaction();

        // Use CASCADE for PostgreSQL to handle dependencies
        if (adapter instanceof PostgreSQLAdapter) {
          await adapter.execute("DROP TABLE IF EXISTS order_items CASCADE");
          await adapter.execute("DROP TABLE IF EXISTS orders CASCADE");
          await adapter.execute("DROP TABLE IF EXISTS products CASCADE");
          await adapter.execute("DROP TABLE IF EXISTS categories CASCADE");
          await adapter.execute("DROP TABLE IF EXISTS users CASCADE");
          await adapter.commit();
        } else {
          // SQLite cleanup
          await adapter.execute("DROP TABLE IF EXISTS order_items");
          await adapter.execute("DROP TABLE IF EXISTS orders");
          await adapter.execute("DROP TABLE IF EXISTS products");
          await adapter.execute("DROP TABLE IF EXISTS categories");
          await adapter.execute("DROP TABLE IF EXISTS users");
          await adapter.commit();
        }
      } catch (_error) {
        // Try to rollback if possible
        try {
          await adapter.rollback();
        } catch {
          // Ignore rollback errors during cleanup
        }
      }

      // Disconnect regardless of cleanup success
      await adapter.disconnect();
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during cleanup: ${errorMessage}`);
  }
}

// Real-world benchmark: E-commerce Product Catalog Query
Deno.bench("RealWorld: SQLite - Product Catalog with Filtering", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // A typical product catalog query with filtering and sorting
    await adapter.execute(`
      SELECT p.id, p.name, p.price, p.stock_quantity, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.price BETWEEN 20 AND 100
      AND p.stock_quantity > 0
      ORDER BY p.price ASC
      LIMIT 20
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench(
  "RealWorld: PostgreSQL - Product Catalog with Filtering",
  async () => {
    const adapter = await tryGetPostgresAdapter();

    if (!adapter) {
      return;
    }

    try {
      // PostgreSQL-optimized product catalog query
      await adapter.execute(`
      SELECT p.id, p.name, p.price, p.stock_quantity, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.price BETWEEN 20 AND 100
      AND p.stock_quantity > 0
      ORDER BY p.price ASC
      LIMIT 20
    `);
    } finally {
      await cleanupAdapter(adapter);
    }
  },
);

// Real-world benchmark: Order History for a User
Deno.bench("RealWorld: SQLite - User Order History", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Query to get a user's order history with item details
    await adapter.execute(`
      SELECT o.id as order_id, o.order_date, o.status, o.total_amount,
             COUNT(oi.id) as total_items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = 5
      GROUP BY o.id
      ORDER BY o.order_date DESC
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("RealWorld: PostgreSQL - User Order History", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    return;
  }

  try {
    // PostgreSQL-optimized user order history query
    await adapter.execute(`
      SELECT o.id as order_id, o.order_date, o.status, o.total_amount,
             COUNT(oi.id) as total_items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = 5
      GROUP BY o.id, o.order_date, o.status, o.total_amount
      ORDER BY o.order_date DESC
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});

// Real-world benchmark: Product Sales Analytics
Deno.bench("RealWorld: SQLite - Product Sales Analytics", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Analytics query for product sales performance
    await adapter.execute(`
      SELECT p.id, p.name, 
             SUM(oi.quantity) as total_sold,
             SUM(oi.quantity * oi.price_per_unit) as total_revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status <> 'cancelled'
      GROUP BY p.id, p.name
      HAVING SUM(oi.quantity) > 0
      ORDER BY total_revenue DESC
      LIMIT 20
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("RealWorld: PostgreSQL - Product Sales Analytics", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    return;
  }

  try {
    // PostgreSQL-optimized analytics query with materialized calculation
    await adapter.execute(`
      WITH sales AS (
        SELECT 
          p.id, 
          p.name,
          SUM(oi.quantity) as total_sold,
          SUM(oi.quantity * oi.price_per_unit) as total_revenue
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status <> 'cancelled'
        GROUP BY p.id, p.name
        HAVING SUM(oi.quantity) > 0
      )
      SELECT id, name, total_sold, total_revenue
      FROM sales
      ORDER BY total_revenue DESC
      LIMIT 20
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});

// Real-world benchmark: Complex Category Hierarchy Navigation
Deno.bench("RealWorld: SQLite - Category Hierarchy Navigation", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Query to get a category with its subcategories and product counts
    await adapter.execute(`
      SELECT c.id, c.name, 
             (SELECT COUNT(*) FROM products WHERE category_id = c.id) as direct_product_count,
             (SELECT COUNT(*) FROM categories sc JOIN products p ON p.category_id = sc.id WHERE sc.parent_id = c.id) as child_product_count
      FROM categories c
      WHERE c.parent_id IS NULL
      ORDER BY direct_product_count + child_product_count DESC
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench(
  "RealWorld: PostgreSQL - Category Hierarchy Navigation",
  async () => {
    const adapter = await tryGetPostgresAdapter();

    if (!adapter) {
      return;
    }

    try {
      // PostgreSQL-optimized category hierarchy query using WITH RECURSIVE
      await adapter.execute(`
      WITH RECURSIVE category_tree AS (
        -- Base case: all parent categories
        SELECT c.id, c.name, c.parent_id, 0 AS level
        FROM categories c
        WHERE c.parent_id IS NULL
        
        UNION ALL
        
        -- Recursive case: all child categories
        SELECT c.id, c.name, c.parent_id, ct.level + 1
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
      ),
      product_counts AS (
        SELECT 
          c.id,
          COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
      )
      SELECT 
        ct.id, 
        ct.name, 
        ct.level,
        COALESCE(pc.product_count, 0) as product_count
      FROM category_tree ct
      LEFT JOIN product_counts pc ON ct.id = pc.id
      WHERE ct.level = 0
      ORDER BY product_count DESC
    `);
    } finally {
      await cleanupAdapter(adapter);
    }
  },
);

// Real-world benchmark: Dashboard Summary Query
Deno.bench("RealWorld: SQLite - E-commerce Dashboard Summary", async () => {
  const adapter = await getSQLiteAdapter();

  try {
    // Dashboard summary statistics query
    await adapter.execute(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'processing') as processing_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'shipped') as shipped_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'delivered') as delivered_orders,
        (SELECT SUM(total_amount) FROM orders WHERE status <> 'cancelled') as total_revenue
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});

Deno.bench("RealWorld: PostgreSQL - E-commerce Dashboard Summary", async () => {
  const adapter = await tryGetPostgresAdapter();

  if (!adapter) {
    return;
  }

  try {
    // PostgreSQL-optimized dashboard summary query using a single scan
    await adapter.execute(`
      SELECT
        SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) as active_users,
        (SELECT COUNT(*) FROM products) as total_products,
        SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN o.status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
        SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END) as total_revenue
      FROM
        users u
      CROSS JOIN
        (SELECT status, total_amount FROM orders) o
    `);
  } finally {
    await cleanupAdapter(adapter);
  }
});
