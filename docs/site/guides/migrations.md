# Database Migrations with Rex-ORM

Database migrations are a way to manage changes to your database schema over
time. Rex-ORM provides a robust migration system to help you manage these
changes safely and consistently.

## Migration Basics

Migrations in Rex-ORM are version-controlled scripts that describe changes to
your database schema. They allow you to:

- Track schema changes in your version control system
- Apply changes consistently across development, testing, and production
  environments
- Roll back changes when needed

## Directory Structure

By default, Rex-ORM looks for migrations in the `migrations` directory at the
root of your project:

```
my-project/
├── migrations/
│   ├── 001_create_users_table.ts
│   ├── 002_create_posts_table.ts
│   └── 003_add_email_to_users.ts
└── ...
```

## Creating Migrations

### Manual Creation

Create a new file in the `migrations` directory with a sequential number prefix:

```typescript
// migrations/001_create_users_table.ts
import { Migration } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

export class CreateUsersTable implements Migration {
  async up(db: any): Promise<void> {
    await db.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async down(db: any): Promise<void> {
    await db.query(`DROP TABLE IF EXISTS users`);
  }
}
```

### Generating from Models

Rex-ORM can generate migrations from your model definitions:

```typescript
import { MigrationManager } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
import { Post, User } from "./models/index.ts";

// Generate migrations from models
await MigrationManager.generateFromModels([User, Post], {
  outputDir: "./migrations",
  name: "create_initial_tables",
});
```

## Running Migrations

### Running All Pending Migrations

To apply all pending migrations:

```typescript
import { MigrationRunner } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

const db = await DatabaseFactory.create({
  type: "postgres",
  // connection details...
});

const migrationRunner = new MigrationRunner(db, {
  migrationsDir: "./migrations",
});

// Run all pending migrations
await migrationRunner.up();
```

### Running to a Specific Version

To migrate to a specific version:

```typescript
// Migrate up to version 3
await migrationRunner.upTo(3);

// Migrate down to version 1
await migrationRunner.downTo(1);
```

### Rolling Back Migrations

To roll back the most recent migration:

```typescript
await migrationRunner.down();
```

To roll back all migrations:

```typescript
await migrationRunner.reset();
```

## Migration Status

To check the status of your migrations:

```typescript
const status = await migrationRunner.status();
console.log(status);
// [
//   { version: 1, name: "create_users_table", applied: true, appliedAt: "2023-01-01T12:00:00Z" },
//   { version: 2, name: "create_posts_table", applied: true, appliedAt: "2023-01-02T12:00:00Z" },
//   { version: 3, name: "add_email_to_users", applied: false, appliedAt: null }
// ]
```

## Migration Tracking

Rex-ORM tracks applied migrations in a special table in your database (typically
called `migrations`). This table keeps track of which migrations have been
applied and when.

## Common Migration Operations

### Creating Tables

```typescript
async up(db: any): Promise<void> {
  await db.query(`
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
```

### Altering Tables

```typescript
async up(db: any): Promise<void> {
  // Add a column
  await db.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE`);
  
  // Rename a column
  await db.query(`ALTER TABLE users RENAME COLUMN name TO full_name`);
  
  // Change column type
  await db.query(`ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(12, 2)`);
  
  // Add a constraint
  await db.query(`ALTER TABLE users ADD CONSTRAINT users_email_check CHECK (email LIKE '%@%.%')`);
}
```

### Creating Indexes

```typescript
async up(db: any): Promise<void> {
  // Create a simple index
  await db.query(`CREATE INDEX idx_users_email ON users(email)`);
  
  // Create a unique index
  await db.query(`CREATE UNIQUE INDEX idx_users_username ON users(username)`);
  
  // Create a composite index
  await db.query(`CREATE INDEX idx_products_name_price ON products(name, price)`);
}
```

### Foreign Keys

```typescript
async up(db: any): Promise<void> {
  await db.query(`
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}
```

## Best Practices

1. **Make migrations idempotent**: Ensure they can be run multiple times without
   causing errors (e.g., use `IF NOT EXISTS` or `IF EXISTS` clauses).
2. **Test both up and down migrations**: Make sure you can roll back changes
   correctly.
3. **Keep migrations small and focused**: Each migration should handle a single
   logical change.
4. **Include meaningful names**: Use descriptive names that clearly indicate
   what the migration does.
5. **Use transactions**: Wrap complex migrations in transactions to ensure
   atomic changes.

```typescript
async up(db: any): Promise<void> {
  await db.query("BEGIN");
  try {
    // Migration operations here...
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
```

For more details on migrations, check out the
[API Documentation](../../api/index.md).
