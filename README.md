# Rex-ORM - Sprint 3: Query Builder

## Overview

Sprint 3 implements the Query Builder module of Rex-ORM, providing a fluent API for constructing and executing SQL queries.

## Features

- Fluent, chainable API for building queries
- Support for all basic CRUD operations
- Parameterized queries to prevent SQL injection
- Comprehensive test coverage
- Type-safe query construction

## Getting Started

Ensure you have Deno installed. `reflect_metadata` is included via import statements in the source code with a fixed version.

No additional installation is required as dependencies are managed through import URLs.

## Query Examples

```typescript
// SELECT Query with conditions
const users = await qb
  .select(["id", "name"])
  .from("users")
  .where("age", ">", 18)
  .orderBy("name", "ASC")
  .execute(adapter);

// INSERT Query
const newUser = await qb
  .insert("users", {
    name: "John Doe",
    email: "john@example.com"
  })
  .execute(adapter);

// UPDATE Query
const updated = await qb
  .update("users", {
    status: "active"
  })
  .where("id", "=", 1)
  .execute(adapter);

// DELETE Query
const deleted = await qb
  .delete("users")
  .where("status", "=", "inactive")
  .execute(adapter);
```

## API Reference

// ...existing API documentation...

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License. See LICENSE file for details.
