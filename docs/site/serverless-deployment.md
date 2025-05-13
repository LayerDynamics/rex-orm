# Serverless Deployment with Rex-ORM

This guide covers best practices and strategies for deploying Rex-ORM
applications in serverless environments.

## Understanding Serverless Constraints

Serverless environments present unique challenges for database-driven
applications:

1. **Cold Starts**: Functions may start from a cold state, requiring new
   database connections
2. **Connection Limits**: Database services have connection limits that can be
   quickly exhausted
3. **Execution Duration**: Functions have time limits for execution
4. **Statelessness**: No guarantee that state is preserved between invocations

Rex-ORM provides features specifically designed to address these challenges.

## Optimizing Database Connections

### Connection Pooling

Rex-ORM provides specialized connection pooling for serverless environments:

```typescript
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

const db = await DatabaseFactory.create({
  type: "postgres",
  host: "your-postgres-host.com",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "my_database",

  // Serverless-optimized pooling
  pool: {
    max: 1, // Keep connections minimal
    min: 0, // Allow pool to empty completely
    idleTimeoutMillis: 10000, // Release connections quickly when idle
    acquireTimeoutMillis: 10000, // Fail fast if connection can't be acquired
    enableKeepAlive: false, // Don't use persistent heartbeat
  },
});
```

### Connection Reuse

In environments that support it (like AWS Lambda with connection reuse), you can
store the database connection outside the handler:

```typescript
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
import { User } from "./models/user.ts";

// Connection is established once and reused across invocations
let db;

async function initDb() {
  if (!db) {
    console.log("Initializing database connection");
    db = await DatabaseFactory.create({
      type: "postgres",
      // connection details...
    });

    // Register models
    db.registerModels(User);
  }
  return db;
}

// Handler function
export async function handler(event) {
  // Reuse or initialize the database connection
  const database = await initDb();

  // Process the request
  const users = await User.findAll();

  return {
    statusCode: 200,
    body: JSON.stringify(users),
  };
}
```

## Optimizing Cold Starts

### Lazy Loading

Use lazy loading to defer database operations until absolutely necessary:

```typescript
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

export class DatabaseService {
  private static instance: DatabaseService;
  private _db: any = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async getDb() {
    if (!this._db) {
      this._db = await DatabaseFactory.create({
        // connection details...
      });
    }
    return this._db;
  }
}
```

### Minimizing Bundle Size

Import only what you need to reduce cold start times:

```typescript
// Instead of importing everything
// import * from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

// Import only what you need
import {
  BaseModel,
  Column,
  Entity,
  PrimaryKey,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
```

## Working with Limitations

### Handling Timeouts

Use timeouts to prevent long-running queries:

```typescript
import { QueryBuilder } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

async function getUsersWithTimeout() {
  // Create a query with a timeout
  const query = new QueryBuilder("users")
    .select("*")
    .where({ active: true })
    .timeout(2000); // 2 second timeout

  try {
    return await query.execute(db);
  } catch (error) {
    if (error.message.includes("timeout")) {
      // Handle timeout specifically
      console.error("Query timed out");
      return [];
    }
    throw error;
  }
}
```

### Batch Processing

For larger operations, use batching to process data in smaller chunks:

```typescript
import { BulkOperations } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

async function processLargeDataset(items) {
  // Process in batches of 100
  const bulkOps = new BulkOperations(db);

  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await bulkOps.insertMany("items", batch);
  }
}
```

## Deployment Strategies

### Deno Deploy

Rex-ORM works seamlessly with Deno Deploy:

```typescript
// main.ts
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
import { User } from "./models/user.ts";

// Initialize database once
let db;

async function initDb() {
  if (!db) {
    db = await DatabaseFactory.create({
      type: "postgres",
      // Use connection secrets from environment variables
      host: Deno.env.get("DB_HOST"),
      username: Deno.env.get("DB_USER"),
      password: Deno.env.get("DB_PASSWORD"),
      database: Deno.env.get("DB_NAME"),
    });

    db.registerModels(User);
  }
  return db;
}

serve(async (req) => {
  try {
    await initDb();

    const users = await User.findAll({ limit: 10 });

    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### AWS Lambda

When deploying to AWS Lambda with Deno runtime:

```typescript
// lambda.ts
import { User } from "./models/user.ts";
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

// Connection is initialized outside handler for reuse
let db;

async function initDb() {
  if (!db) {
    db = await DatabaseFactory.create({
      type: "postgres",
      // connection details...
      // AWS Lambda specific optimizations
      pool: {
        max: 1,
        acquireTimeoutMillis: 5000,
      },
    });

    db.registerModels(User);
  }
  return db;
}

export async function handler(event) {
  try {
    // Initialize or reuse DB connection
    await initDb();

    // Parse path parameters
    const userId = event.pathParameters?.id;

    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "User not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(user),
      };
    }

    // List users
    const users = await User.findAll();
    return {
      statusCode: 200,
      body: JSON.stringify(users),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
}
```

## Best Practices

1. **Use read replicas** for read-heavy operations to distribute database load
2. **Implement caching** to reduce database queries
3. **Keep functions focused** on single responsibilities
4. **Set appropriate timeouts** for database operations
5. **Monitor connection usage** to detect and fix connection leaks
6. **Use cursor-based pagination** for large datasets
7. **Implement robust error handling** to gracefully handle database failures

## Monitoring and Debugging

For effective monitoring in production:

```typescript
// Set up logging for database operations
const db = await DatabaseFactory.create({
  // connection details...
  logging: true,
  logLevel: "info", // "debug" for more verbose logging

  // Custom logger
  logger: (msg, level) => {
    // Send to your logging service
    console.log(`[${level}] DB: ${msg}`);
  },
});
```

For more details on serverless deployment, check out the
[API Documentation](../api/index.md) and the
[Rex-ORM Serverless Examples](https://github.com/username/rex-orm/tree/main/examples/serverless).
