# Rex-ORM

A robust, type-safe Object-Relational Mapping (ORM) library designed specifically for Deno. Rex-ORM provides seamless database interactions with PostgreSQL and SQLite, featuring real-time data synchronization, GraphQL integration, and optimized serverless deployment support.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Database Configuration](#database-configuration)
- [Models](#models)
  - [Defining Models](#defining-models)
  - [Relationships](#relationships)
  - [Validation](#validation)
- [Querying](#querying)
  - [CRUD Operations](#crud-operations)
  - [Advanced Queries](#advanced-queries)
  - [Relationships](#querying-relationships)
- [Migrations](#migrations)
  - [Creating Migrations](#creating-migrations)
  - [Running Migrations](#running-migrations)
  - [Rollbacks](#rollbacks)
- [Real-Time Synchronization](#real-time-synchronization)
  - [Setup](#real-time-setup)
  - [Event Handling](#event-handling)
  - [Client Integration](#client-integration)
- [GraphQL Integration](#graphql-integration)
  - [Schema Generation](#schema-generation)
  - [Custom Resolvers](#custom-resolvers)
  - [GraphQL Server](#graphql-server)
- [Serverless Deployment](#serverless-deployment)
  - [Configuration](#serverless-configuration)
  - [Cold Start Optimization](#cold-start-optimization)
  - [Connection Management](#connection-management)
- [Plugin System](#plugin-system)
  - [Creating Plugins](#creating-plugins)
  - [Using Plugins](#using-plugins)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Type-Safe Database Operations**: Leverages TypeScript's type system for compile-time error checking
- **Multiple Database Support**: Built-in support for PostgreSQL and SQLite
- **Real-Time Synchronization**: WebSocket-based real-time updates and notifications
- **GraphQL Integration**: Automatic schema generation and resolver implementation
- **Serverless Optimized**: Efficient connection pooling and cold start optimization
- **Comprehensive Migration System**: Version-controlled database schema changes
- **Plugin Architecture**: Extensible system for adding new functionality
- **Validation System**: Declarative data validation using decorators
- **Relationship Management**: Support for all standard database relationships
- **Query Builder**: Fluent, chainable API for complex queries
- **Connection Pooling**: Efficient database connection management
- **Transaction Support**: ACID-compliant transaction handling

## Installation

Add Rex-ORM to your Deno project:

```typescript
// deps.ts
export { BaseModel, Model, Column, PrimaryKey } from "https://deno.land/x/rex_orm@v1.0.0/mod.ts";
```

## Quick Start

1. Define your model:

```typescript
import { Model, Column, PrimaryKey } from "./deps.ts";

@Model({ tableName: "users" })
export class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;
}
```

2. Configure database connection:

```typescript
import { DatabaseFactory } from "./deps.ts";

const config = {
  database: "postgres", // or "sqlite"
  host: "localhost",
  port: 5432,
  username: "user",
  password: "password",
  databaseName: "my_app"
};

const adapter = DatabaseFactory.createAdapter(config);
await adapter.connect();
```

3. Perform operations:

```typescript
// Create
const user = new User();
user.name = "John Doe";
user.email = "john@example.com";
await user.save(adapter);

// Query
const users = await qb
  .select(["id", "name", "email"])
  .from("users")
  .where("name", "LIKE", "%John%")
  .execute(adapter);
```

## Database Configuration

Rex-ORM supports both PostgreSQL and SQLite. Configure your database connection based on your needs:

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
  idleTimeout: 30000 // Optional: Idle timeout in milliseconds
};
```

### SQLite Configuration

```typescript
const config = {
  database: "sqlite",
  databasePath: "./data/database.sqlite"
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
    message: "Name must be at least 3 characters long"
  })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  @ValidateMultiple([
    {
      validator: (value: string) => /^[^@]+@[^@]+\.[^@]+$/.test(value),
      message: "Invalid email format"
    },
    {
      validator: (value: string) => value.length <= 255,
      message: "Email cannot exceed 255 characters"
    }
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
  .andWhere("posts.created_at", ">", new Date('2023-01-01'))
  .orderBy("posts.created_at", "DESC")
  .limit(20)
  .offset(40)
  .execute(adapter);

// Aggregations
const stats = await qb
  .select([
    "COUNT(*) as total_posts",
    "AVG(view_count) as avg_views"
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
  }
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
  port: 8080
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
      payload: this.toJSON()
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
  adapter
}, {
  port: 4000
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
    }
  },
  Mutation: {
    async createPost(_: any, { input }: { input: any }, context: any) {
      const post = new Post();
      Object.assign(post, input);
      await post.save(context.adapter);
      return post;
    }
  }
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
  idleTimeout: 30000
});

// Get connection
const connection = await StatelessPoolManager.getConnection();
try {
  // Use connection
} finally {
  await StatelessPoolManager.releaseConnection(connection);
}
```

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
  new MySQLPlugin()
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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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