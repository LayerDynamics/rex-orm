# Working with Models

Models are the core building blocks of Rex-ORM. They represent database tables
and provide an object-oriented interface to interact with your data.

## Defining Models

To define a model, create a class that extends `BaseModel` and use decorators to
define the schema:

```typescript
import {
  BaseModel,
  Column,
  Entity,
  PrimaryKey,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

@Entity({ tableName: "users" })
export class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "timestamp", default: "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
```

## Model Decorators

Rex-ORM provides several decorators to define your model:

- `@Entity({ tableName: string })`: Marks a class as a model and specifies the
  table name
- `@PrimaryKey()`: Marks a property as the primary key
- `@Column(options)`: Defines a column in the database table
- `@OneToOne()`, `@OneToMany()`, `@ManyToOne()`, `@ManyToMany()`: Define
  relationships

## Column Options

The `@Column` decorator accepts various options:

```typescript
@Column({
  type: "varchar",          // Database column type
  length: 255,              // Column length (for types like varchar)
  nullable: false,          // Whether the column can be null
  unique: true,             // Whether the column should have a unique constraint
  default: "Default Value", // Default value for the column
  index: true,              // Whether to create an index on this column
  comment: "Description",   // Comment for the column
})
name!: string;
```

## Model Methods

### Instance Methods

Instance methods operate on a specific model instance:

```typescript
// Create and save a new user
const user = new User();
user.name = "John Doe";
user.email = "john@example.com";
await user.save();

// Update a user
user.name = "Jane Doe";
await user.save();

// Delete a user
await user.delete();

// Refresh data from the database
await user.refresh();
```

### Static Methods

Static methods operate on the model class:

```typescript
// Find a user by primary key
const user = await User.findByPk(1);

// Find a single user matching criteria
const user = await User.findOne({ email: "john@example.com" });

// Find all users matching criteria
const users = await User.findAll({ active: true });

// Find with pagination
const { rows, total } = await User.findAndCountAll({
  where: { active: true },
  limit: 10,
  offset: 0,
  orderBy: { createdAt: "DESC" },
});

// Delete by criteria
await User.deleteWhere({ active: false });
```

## Custom Methods

You can add custom methods to your models:

```typescript
@Entity({ tableName: "users" })
export class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  // Custom instance method
  async sendWelcomeEmail(): Promise<void> {
    // Implementation here
    console.log(`Sending welcome email to ${this.email}`);
  }

  // Custom static method
  static async findActive(): Promise<User[]> {
    return this.findAll({ active: true });
  }
}
```

## Model Hooks

Rex-ORM supports hooks (lifecycle callbacks) for various events:

```typescript
@Entity({ tableName: "users" })
export class User extends BaseModel {
  // ... properties

  // Before save hook
  static beforeSave(instance: User): void {
    // Perform actions before saving
    console.log("About to save user:", instance.name);
  }

  // After save hook
  static afterSave(instance: User): void {
    // Perform actions after saving
    console.log("User saved:", instance.id);
  }

  // Before delete hook
  static beforeDelete(instance: User): void {
    // Perform actions before deleting
    console.log("About to delete user:", instance.id);
  }

  // After delete hook
  static afterDelete(instance: User): void {
    // Perform actions after deleting
    console.log("User deleted");
  }
}
```

## Advanced Features

For more advanced model features, check out:

- [Relationships Guide](relationships.md): Working with model relationships
- [Querying Guide](querying.md): Advanced querying techniques
- [Validation Guide](validation.md): Adding validation to your models
