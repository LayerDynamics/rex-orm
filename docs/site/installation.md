# Getting Started with Rex-ORM

This guide will help you get started with Rex-ORM in your Deno project.

## Installation

Rex-ORM is designed specifically for Deno, making it easy to integrate into your
projects.

### Prerequisites

- Deno 1.34.0 or newer
- Database server (PostgreSQL 12+ or SQLite 3.38+)

### Import in Your Project

```typescript
// deps.ts
export {
  BaseModel,
  Column,
  Entity,
  PrimaryKey,
  ValidateMultiple,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
```

### Editor Integration

For the best development experience, set up your editor with proper Deno
configuration:

```json
// .vscode/settings.json
{
  "deno.enable": true,
  "deno.lint": true,
  "editor.formatOnSave": true,
  "[typescript]": { "editor.defaultFormatter": "denoland.vscode-deno" }
}
```

## Basic Usage

Here's a simple example of defining a model and performing basic operations:

```typescript
import {
  BaseModel,
  Column,
  Entity,
  PrimaryKey,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

// Define your model
@Entity({ tableName: "users" })
class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;
}

// Configure database connection
const db = await DatabaseFactory.create({
  type: "sqlite",
  database: ":memory:",
});

// Register your models
db.registerModels(User);

// Create a new user
const user = new User();
user.name = "John Doe";
user.email = "john@example.com";
await user.save();

// Find a user
const foundUser = await User.findOne({ id: 1 });
console.log(foundUser?.name); // "John Doe"
```

For more detailed examples, check out the [Examples](/examples) directory.
