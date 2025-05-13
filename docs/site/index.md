# Rex-ORM

A robust, type-safe Object-Relational Mapping (ORM) library designed
specifically for the Deno runtime environment. Rex-ORM bridges your TypeScript
code and relational databases with an elegant, developer-friendly API that
prioritizes type safety, performance, and real-time capabilities.

## Why Rex-ORM?

Rex-ORM goes beyond traditional ORMs by offering:

- **Built for Deno**: Fully leverages Deno's security model and modern
  JavaScript features
- **Enterprise-Ready**: Designed for both small projects and large-scale
  applications
- **Real-Time First**: Native support for WebSocket-based data synchronization
- **GraphQL Integration**: Seamlessly expose your data models through GraphQL
- **Serverless Optimized**: Engineered for cloud-native and serverless
  deployments
- **Developer Experience**: Intuitive TypeScript-first API with comprehensive
  validation

Whether you're building a small API, a complex enterprise application, or a
real-time collaborative tool, Rex-ORM provides the database foundation you need
without compromising on performance or type safety.

## Table of Contents

- [Rex-ORM](#rex-orm)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Database Configuration](#database-configuration)
    - [PostgreSQL Configuration](#postgresql-configuration)
    - [SQLite Configuration](#sqlite-configuration)
  - [Models](#models)
    - [Defining Models](#defining-models)
    - [Relationships](#relationships)
    - [Validation](#validation)
  - [Querying](#querying)
    - [CRUD Operations](#crud-operations)
    - [Advanced Queries](#advanced-queries)
    - [Querying Relationships](#querying-relationships)
  - [Migrations](#migrations)
    - [Creating Migrations](#creating-migrations)
    - [Running Migrations](#running-migrations)
  - [Real-Time Synchronization](#real-time-synchronization)
    - [Real-Time Setup](#real-time-setup)
    - [Event Handling](#event-handling)
  - [GraphQL Integration](#graphql-integration)
    - [Schema Generation](#schema-generation)
    - [Custom Resolvers](#custom-resolvers)
  - [Serverless Deployment](#serverless-deployment)
    - [Configuration](#configuration)
    - [Connection Management](#connection-management)
  - [Plugin System](#plugin-system)
    - [Creating Plugins](#creating-plugins)
    - [Using Plugins](#using-plugins)
  - [Best Practices](#best-practices)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)
  - [Support](#support)

## Features

- **Type-Safe Database Operations**: Leverages TypeScript's type system to catch
  errors at compile time instead of runtime
- **Multiple Database Support**: Native adapters for PostgreSQL and SQLite with
  a plugin system for extending to other databases
- **Real-Time Synchronization**: Built-in WebSocket server and event system for
  pushing data changes to connected clients in real-time
- **GraphQL Integration**: Automatic schema generation from model definitions
  with customizable resolvers for seamless API creation
- **Serverless Optimized**: Specialized connection pooling strategies and cold
  start optimizations for serverless environments
- **Comprehensive Migration System**: Version-controlled schema changes with
  robust up/down migrations and tracking
- **Plugin Architecture**: Extensible plugin system for adding new databases,
  functionalities, or third-party integrations
- **Validation System**: Rich decorator-based validation rules with custom
  validator support and error messaging
- **Relationship Management**: First-class support for One-to-One, One-to-Many,
  Many-to-One, and Many-to-Many relationships
- **Query Builder**: Intuitive fluent API for building complex SQL queries with
  protection against SQL injection
- **Connection Pooling**: Smart connection management for optimal database
  performance under varying loads
- **Transaction Support**: First-class ACID-compliant transaction handling with
  automatic rollback on errors

## Installation

Rex-ORM is designed specifically for Deno, making it easy to integrate into your
projects.

### Prerequisites

- Deno 1.34.0 or newer
- Database server (PostgreSQL 12+ or SQLite 3.38+)

### Local Installation

Since Rex-ORM is not currently on deno.land but will be available on JSR in the
future, you can use it by cloning the repository:

```bash
# Clone the repository
git clone https://github.com/username/rex-orm.git
```

Import it in your project:

```typescript
// deps.ts
export {
  BaseModel,
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  Model,
  OneToMany,
  // Relationships
  OneToOne,
  PrimaryKey,
  QueryBuilder,
  // Validation
  Validate,
  ValidateMultiple,
} from "./path/to/rex-orm/mod.ts";
```

### Future JSR Installation

When Rex-ORM becomes available on JSR, you'll be able to import it directly:

```typescript
// deps.ts
export {
  BaseModel,
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  Model,
  OneToMany,
  // Relationships
  OneToOne,
  PrimaryKey,
  QueryBuilder,
  // Validation
  Validate,
  ValidateMultiple,
} from "@jsr/rex-orm/mod.ts";
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
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
```

### Project Setup

If you're starting a new project, our CLI can help you set up the basic
structure:

```bash
deno run --allow-read --allow-write https://deno.land/x/rex_orm@v1.0.0/cli.ts init
```

This will create the following structure:

```
my-project/
├── config/
│   └── default.json      # Database configuration
├── migrations/           # Database migrations
├── models/               # Your data models
├── deps.ts               # Dependencies
├── main.ts               # Application entry point
└── deno.json             # Deno configuration
```

## Quick Start

Rex-ORM is designed to get you productive quickly while providing a path to
advanced usage as your application grows.

### Basic Setup

1. **Define your models** - Create TypeScript classes that map to your database
   tables:

```typescript
import {
  BaseModel,
  Column,
  Model,
  PrimaryKey,
} from "https://deno.land/x/rex_orm@v1.0.0/mod.ts";

@Model({ tableName: "users" })
export class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "timestamp", defaultValue: "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
```

2. **Configure database connection** - Connect to your database with type-safe
   configuration:

```typescript
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v1.0.0/mod.ts";

// Load configuration from environment or config file
const config = {
  database: "postgres",
  host: Deno.env.get("DB_HOST") || "localhost",
  port: Number(Deno.env.get("DB_PORT")) || 5432,
  username: Deno.env.get("DB_USER") || "postgres",
  password: Deno.env.get("DB_PASSWORD") || "postgres",
  databaseName: Deno.env.get("DB_NAME") || "my_app",
  // Connection pooling options
  poolSize: 10,
  idleTimeout: 30000,
};

// Create and initialize database adapter
const adapter = DatabaseFactory.createAdapter(config);
await adapter.connect();
```

3. **Perform CRUD operations** - Interact with your database using models and
   the query builder:

```typescript
// CREATE: Insert a new user
const user = new User();
user.name = "Jane Doe";
user.email = "jane@example.com";
await user.save(adapter);
console.log(`Created user with ID: ${user.id}`);

// READ: Query users with the fluent query builder
import { QueryBuilder } from "https://deno.land/x/rex_orm@v1.0.0/mod.ts";

const qb = new QueryBuilder();
const recentUsers = await qb
  .select(["id", "name", "email", "createdAt"])
  .from("users")
  .where("createdAt", ">", new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
  .orderBy("createdAt", "DESC")
  .limit(10)
  .execute(adapter);

console.log(`Found ${recentUsers.rows.length} recent users`);

// UPDATE: Modify an existing user
const userToUpdate = await User.findById(1, adapter);
if (userToUpdate) {
  userToUpdate.name = "Jane Smith";
  await userToUpdate.save(adapter);
  console.log("User updated successfully");
}

// DELETE: Remove a user from the database
const userToDelete = await User.findById(2, adapter);
if (userToDelete) {
  await userToDelete.delete(adapter);
  console.log("User deleted successfully");
}
```

### Complete Application Example

Here's a complete example of a basic RESTful API using Rex-ORM with Deno's HTTP
server:

```typescript
// app.ts
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import {
  BaseModel,
  Column,
  DatabaseFactory,
  Model,
  PrimaryKey,
  QueryBuilder,
} from "https://deno.land/x/rex_orm@v1.0.0/mod.ts";

// 1. Define model
@Model({ tableName: "tasks" })
class Task extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "boolean", defaultValue: "false" })
  completed!: boolean;

  @Column({ type: "timestamp", defaultValue: "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}

// 2. Database setup
const adapter = DatabaseFactory.createAdapter({
  database: "sqlite",
  databasePath: "./tasks.sqlite",
});

// 3. Create initial schema
await adapter.connect();
await adapter.execute(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// 4. HTTP server with REST endpoints
const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  // GET /tasks - List all tasks
  if (path === "/tasks" && req.method === "GET") {
    const qb = new QueryBuilder();
    const result = await qb.select("*").from("tasks").execute(adapter);
    return new Response(JSON.stringify(result.rows), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // POST /tasks - Create a new task
  if (path === "/tasks" && req.method === "POST") {
    try {
      const body = await req.json();
      const task = new Task();
      task.title = body.title;
      task.description = body.description;
      await task.save(adapter);

      return new Response(JSON.stringify(task), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // GET /tasks/:id - Get a specific task
  if (path.match(/^\/tasks\/\d+$/) && req.method === "GET") {
    const id = parseInt(path.split("/")[2]);
    const task = await Task.findById(id, adapter);

    if (!task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(task), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Default: Not found
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};

// 5. Start the server
console.log("Server running on http://localhost:8000");
await serve(handler, { port: 8000 });
```

Run the example with:

```bash
deno run --allow-net --allow-read --allow-write app.ts
```

## Database Configuration

Rex-ORM supports both PostgreSQL and SQLite. Configure your database connection
based on your needs:

### PostgreSQL Configuration

```typescript
const config = {
  database: "postgres",
  host: "localhost",
  port: 5432,
  username: "user",
  password: "password",
  databaseName: "my_app",
  poolSize: 10, // Optional: Connection pool size
  idleTimeout: 30000, // Optional: Idle timeout in milliseconds
};
```

### SQLite Configuration

```typescript
const config = {
  database: "sqlite",
  databasePath: "./data/database.sqlite",
};
```

## Models

### Defining Models

Models represent your database tables and are defined using decorators:

```typescript
@Model({ tableName: "posts" })
export class Post extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "timestamp", nullable: true })
  publishedAt?: Date;

  @ManyToOne(() => User, (user) => user.posts)
  author!: User;
}
```

### Relationships

Rex-ORM supports all standard relationship types:

```typescript
// One-to-Many
@OneToMany(() => Post, (post) => post.author)
posts!: Post[];

// Many-to-One
@ManyToOne(() => User, (user) => user.posts)
author!: User;

// One-to-One
@OneToOne(() => Profile, (profile) => profile.user)
profile!: Profile;

// Many-to-Many
@ManyToMany(() => Tag, (tag) => tag.posts)
tags!: Tag[];
```

### Validation

Add validation rules using decorators:

```typescript
@Model({ tableName: "users" })
export class User extends BaseModel {
  @Column({ type: "varchar", length: 255 })
  @Validate({
    validator: (value: string) => value.length >= 3,
    message: "Name must be at least 3 characters long",
  })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  @ValidateMultiple([
    {
      validator: (value: string) => /^[^@]+@[^@]+\.[^@]+$/.test(value),
      message: "Invalid email format",
    },
    {
      validator: (value: string) => value.length <= 255,
      message: "Email cannot exceed 255 characters",
    },
  ])
  email!: string;
}
```

## Querying

### CRUD Operations

```typescript
// Create
const post = new Post();
post.title = "Hello World";
post.content = "First post content";
await post.save(adapter);

// Read
const qb = new QueryBuilder();
const posts = await qb
  .select(["id", "title", "content"])
  .from("posts")
  .where("title", "LIKE", "%Hello%")
  .orderBy("createdAt", "DESC")
  .limit(10)
  .execute(adapter);

// Update
const post = await Post.findById(1);
post.title = "Updated Title";
await post.save(adapter);

// Delete
await post.delete(adapter);
```

### Advanced Queries

```typescript
const qb = new QueryBuilder();

// Complex conditions
const results = await qb
  .select(["posts.*", "users.name AS author_name"])
  .from("posts")
  .join("users", "users.id = posts.author_id")
  .where("posts.published", "=", true)
  .andWhere("posts.created_at", ">", new Date("2023-01-01"))
  .orderBy("posts.created_at", "DESC")
  .limit(20)
  .offset(40)
  .execute(adapter);

// Aggregations
const stats = await qb
  .select([
    "COUNT(*) as total_posts",
    "AVG(view_count) as avg_views",
  ])
  .from("posts")
  .groupBy("author_id")
  .having("COUNT(*)", ">", 5)
  .execute(adapter);
```

### Querying Relationships

```typescript
// Eager loading
const postsWithAuthor = await qb
  .select(["posts.*", "users.*"])
  .from("posts")
  .join("users", "users.id = posts.author_id")
  .where("posts.published", "=", true)
  .execute(adapter);

// Lazy loading
const post = await Post.findById(1);
const author = await post.author; // Loads author when accessed
```

## Migrations

### Creating Migrations

Create a new migration:

```bash
deno run --allow-read --allow-write cli.ts migration:create add_published_flag_to_posts
```

This creates a migration file:

```typescript
// migrations/20240101000000_add_published_flag_to_posts.ts
import { Migration } from "../types.ts";

const migration: Migration = {
  id: "20240101000000_add_published_flag_to_posts",
  up: async (adapter) => {
    await adapter.execute(`
      ALTER TABLE posts
      ADD COLUMN published BOOLEAN NOT NULL DEFAULT FALSE
    `);
  },
  down: async (adapter) => {
    await adapter.execute(`
      ALTER TABLE posts
      DROP COLUMN published
    `);
  },
};

export default migration;
```

### Running Migrations

```bash
# Apply pending migrations
deno run --allow-read --allow-write cli.ts migrate:up

# Rollback last migration
deno run --allow-read --allow-write cli.ts migrate:down

# Reset database
deno run --allow-read --allow-write cli.ts migrate:reset
```

## Real-Time Synchronization

### Real-Time Setup

```typescript
import { RealTimeSync } from "./deps.ts";

const realTimeSync = new RealTimeSync({
  port: 8080,
});

await realTimeSync.start();

// Enable real-time updates for models
BaseModel.initializeRealTimeSync(realTimeSync);
```

### Event Handling

```typescript
// Server-side event emission
@Model({ tableName: "posts" })
export class Post extends BaseModel {
  async save(adapter: DatabaseAdapter) {
    await super.save(adapter);
    realTimeSync.getEventEmitter().emit({
      type: "POST_UPDATED",
      payload: this.toJSON(),
    });
  }
}

// Client-side event handling
const ws = new WebSocket("ws://localhost:8080");

ws.onmessage = (event) => {
  const { type, payload } = JSON.parse(event.data);
  switch (type) {
    case "POST_UPDATED":
      updateUI(payload);
      break;
  }
};
```

## GraphQL Integration

### Schema Generation

```typescript
import { GraphQLSchemaGenerator } from "./deps.ts";

// Generate schema from models
const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

// Create GraphQL server
const server = new GraphQLServerWrapper(schemaConfig, {
  adapter,
}, {
  port: 4000,
});

await server.start();
```

### Custom Resolvers

```typescript
const resolvers = {
  Query: {
    async getPost(_: any, { id }: { id: string }, context: any) {
      const post = await Post.findById(id);
      return post;
    },
  },
  Mutation: {
    async createPost(_: any, { input }: { input: any }, context: any) {
      const post = new Post();
      Object.assign(post, input);
      await post.save(context.adapter);
      return post;
    },
  },
};
```

## Serverless Deployment

### Configuration

```typescript
// serverless.yml
service: rex-orm-api

provider:
  name: aws
  runtime: provided.al2
  memorySize: 1024
  timeout: 30

functions:
  graphql:
    handler: handler.graphqlHandler
    events:
      - http:
          path: graphql
          method: post
          cors: true

  realtime:
    handler: handler.realtimeHandler
    events:
      - websocket:
          route: $connect
      - websocket:
          route: $disconnect
      - websocket:
          route: $default
```

### Connection Management

```typescript
import { StatelessPoolManager } from "./deps.ts";

// Initialize connection pool
StatelessPoolManager.initialize({
  database: "postgres",
  maxConnections: 10,
  idleTimeout: 30000,
});

// Get connection
const connection = await StatelessPoolManager.getConnection();
try {
  // Use connection
} finally {
  await StatelessPoolManager.releaseConnection(connection);
}
```

- This project supports AWS Lambda deployment via the Serverless Framework.
- We provide a deploy.sh script under src/serverless for easy setup:
  - Installs Serverless if missing.
  - Installs required plugins.
  - Runs "serverless deploy".
- Configure AWS credentials before deploying (aws configure).
- Adjust memory, timeout, and region in serverless.yml as needed.

## Plugin System

### Creating Plugins

```typescript
import { Plugin } from "./deps.ts";

export class MySQLPlugin implements Plugin {
  name = "mysql";

  initialize() {
    // Register MySQL adapter
    DatabaseFactory.registerAdapter("mysql", MySQLAdapter);
  }
}
```

### Using Plugins

```typescript
import { ORM } from "./deps.ts";
import { MySQLPlugin } from "./plugins/mysql.ts";

// Initialize ORM with plugins
ORM.initialize([
  new MySQLPlugin(),
]);
```

## Best Practices

1. **Model Organization**
   - Keep models in separate files
   - Use clear, descriptive names
   - Document complex relationships

2. **Query Optimization**
   - Use appropriate indexes
   - Limit result sets
   - Use eager loading for relationships

3. **Migration Management**
   - One change per migration
   - Include both up and down migrations
   - Test migrations before production

4. **Error Handling**
   - Implement proper error handling
   - Use custom error classes
   - Log errors appropriately

5. **Real-Time Updates**
   - Implement proper reconnection logic
   - Handle connection failures
   - Use appropriate event types

6. **Security**
   - Validate input data
   - Use parameterized queries
   - Implement proper authentication

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Acknowledgments

- Deno community for their excellent standard library
- GraphQL Deno for GraphQL support
- Contributors who have helped shape this project

## Support

For support, please:

- Open an issue on GitHub
- Join our Discord community
- Check the documentation
- Contact the maintainers

For commercial support options, please contact the maintainers directly.
