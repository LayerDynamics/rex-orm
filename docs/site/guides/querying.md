# Querying Data with Rex-ORM

Rex-ORM provides a powerful and flexible query system to retrieve, filter, and
manipulate your data. This guide explains the various querying methods and
features available.

## Basic Queries

### Finding a Single Record

To find a single record by its primary key:

```typescript
const user = await User.findByPk(1);
```

To find a single record matching specific criteria:

```typescript
const user = await User.findOne({ email: "john@example.com" });
```

### Finding Multiple Records

To find all records matching certain criteria:

```typescript
const activeUsers = await User.findAll({ active: true });
```

### Counting Records

To count the number of records matching criteria:

```typescript
const count = await User.count({ active: true });
```

### Pagination

To retrieve records with pagination:

```typescript
const { rows, total } = await User.findAndCountAll({
  where: { active: true },
  limit: 10,
  offset: 0,
});
```

## Advanced Queries

### Complex Conditions

Rex-ORM supports complex conditions for more advanced filtering:

```typescript
const users = await User.findAll({
  where: {
    // AND condition (default)
    active: true,
    role: "admin",

    // OR condition
    $or: [
      { lastLogin: { $gt: new Date("2023-01-01") } },
      { createdAt: { $gt: new Date("2023-06-01") } },
    ],

    // NOT condition
    $not: {
      email: { $like: "%test%" },
    },
  },
});
```

### Operators

Rex-ORM supports various comparison operators:

```typescript
const users = await User.findAll({
  where: {
    // Equal (default)
    role: "user",

    // Not equal
    status: { $ne: "inactive" },

    // Greater than
    age: { $gt: 18 },

    // Greater than or equal
    loginCount: { $gte: 5 },

    // Less than
    loginCount: { $lt: 100 },

    // Less than or equal
    age: { $lte: 65 },

    // LIKE pattern matching
    email: { $like: "%@gmail.com" },

    // NOT LIKE pattern matching
    username: { $notLike: "test%" },

    // IN list
    role: { $in: ["admin", "moderator"] },

    // NOT IN list
    status: { $notIn: ["banned", "suspended"] },

    // BETWEEN range
    createdAt: { $between: [new Date("2023-01-01"), new Date("2023-12-31")] },

    // IS NULL
    deletedAt: { $null: true },

    // IS NOT NULL
    email: { $null: false },
  },
});
```

### Ordering Results

To order results by one or more fields:

```typescript
const users = await User.findAll({
  where: { active: true },
  orderBy: [
    ["lastName", "ASC"],
    ["firstName", "ASC"],
  ],
});

// Alternative syntax
const users = await User.findAll({
  where: { active: true },
  orderBy: {
    lastName: "ASC",
    firstName: "ASC",
  },
});
```

### Grouping and Aggregation

To group records and perform aggregation:

```typescript
const result = await Order.findAll({
  attributes: [
    "customerId",
    [{ $func: "SUM", args: ["amount"] }, "totalAmount"],
    [{ $func: "COUNT", args: ["id"] }, "orderCount"],
  ],
  groupBy: ["customerId"],
  having: {
    totalAmount: { $gt: 1000 },
  },
});
```

## Query Builder

For more complex queries, you can use the QueryBuilder:

```typescript
import { QueryBuilder } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

const query = new QueryBuilder("users", "u")
  .select("u.id", "u.name", "u.email")
  .join("profiles as p", "u.id = p.userId")
  .where("u.active = ?", [true])
  .where("u.role IN (?)", [["admin", "moderator"]])
  .orderBy("u.createdAt DESC")
  .limit(10)
  .offset(0);

const results = await query.execute(db);
```

## Raw Queries

For cases where you need to execute raw SQL:

```typescript
import { DatabaseFactory } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

const db = await DatabaseFactory.create({
  type: "postgres",
  // connection details...
});

const results = await db.query(
  "SELECT * FROM users WHERE email LIKE $1 AND active = $2",
  ["%@example.com", true],
);
```

## Transactions

To perform operations within a transaction:

```typescript
import { TransactionManager } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

// Using the transaction manager
const result = await TransactionManager.run(async (transaction) => {
  // All operations here are part of the same transaction
  const user = new User();
  user.name = "John Doe";
  user.email = "john@example.com";
  await user.save({ transaction });

  const profile = new Profile();
  profile.userId = user.id;
  profile.bio = "This is my bio";
  await profile.save({ transaction });

  return { user, profile };
});

// If any operation fails, the transaction is rolled back
// If all operations succeed, the transaction is committed
```

## Working with Related Data

To query models with related data:

```typescript
// Find users and include their profiles
const users = await User.findAll({
  where: { active: true },
  include: ["profile"],
});

// Find posts and include author and comments
const posts = await Post.findAll({
  where: { published: true },
  include: [
    "author",
    { model: "comments", where: { approved: true } },
  ],
});

// Nested includes
const authors = await Author.findAll({
  include: [
    {
      model: "books",
      include: ["reviews", "categories"],
    },
  ],
});
```

## Performance Optimization

### Selecting Specific Fields

To select only specific fields:

```typescript
const users = await User.findAll({
  attributes: ["id", "name", "email"],
  where: { active: true },
});
```

### Using Indexes

Ensure your database has appropriate indexes for frequent queries:

```typescript
@Entity({ tableName: "users" })
class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255, index: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  // A compound index on multiple columns
  static indexes = [
    { name: "idx_name_email", columns: ["name", "email"] },
  ];
}
```

For more details on querying, check out the
[API Documentation](../../api/index.md).
