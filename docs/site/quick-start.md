# Quick Start Guide

This quick start guide will help you set up a basic Rex-ORM project with
essential features.

## Create a New Project

1. Create a new directory for your project:

```bash
mkdir my-rex-project
cd my-rex-project
```

2. Initialize a basic Deno project:

```bash
touch main.ts
touch deps.ts
```

3. Create a `deno.json` configuration file:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "tasks": {
    "dev": "deno run --watch main.ts",
    "start": "deno run main.ts"
  }
}
```

## Define Your Models

Create a `models` directory and define your data models:

```bash
mkdir models
```

Create `models/user.ts`:

```typescript
import { BaseModel, Column, Entity, PrimaryKey } from "../deps.ts";

@Entity({ tableName: "users" })
export class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "boolean", default: false })
  isActive!: boolean;
}
```

## Set Up Database Connection

In your `deps.ts` file, import the necessary modules:

```typescript
export {
  BaseModel,
  Column,
  DatabaseFactory,
  Entity,
  PrimaryKey,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
```

In your `main.ts` file, set up the database connection:

```typescript
import { DatabaseFactory } from "./deps.ts";
import { User } from "./models/user.ts";

// Initialize the database
async function initDatabase() {
  const db = await DatabaseFactory.create({
    type: "sqlite", // or "postgres"
    database: "./database.sqlite", // for SQLite
    // For PostgreSQL, you would use:
    // host: "localhost",
    // port: 5432,
    // username: "postgres",
    // password: "password",
    // database: "my_database"
  });

  // Register your models
  db.registerModels(User);

  // Create tables based on your models
  await db.sync();

  return db;
}

// Main application function
async function main() {
  const db = await initDatabase();

  // Create a new user
  const user = new User();
  user.name = "John Doe";
  user.email = "john@example.com";
  user.isActive = true;
  await user.save();

  console.log("User created:", user);

  // Query users
  const users = await User.findAll({ isActive: true });
  console.log("Active users:", users);
}

// Run the application
if (import.meta.main) {
  main().catch(console.error);
}
```

## Run Your Application

```bash
deno task dev
```

This will run your application with file watching for development.

## Next Steps

- Add more models and relationships
- Set up migrations for schema management
- Implement business logic in your models
- Explore advanced features like real-time updates

For more detailed information, check out the
[API Documentation](../api/index.md) and [Guides](../guides/models.md).
