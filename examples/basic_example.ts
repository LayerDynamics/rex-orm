// Basic Rex-ORM Example
// This example demonstrates core Rex-ORM features with SQLite database

import {
  BaseModel,
  Column,
  DatabaseFactory,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
} from "../mod.ts";

// Define Post model first to avoid "used before declaration" error
@Entity({ tableName: "posts" })
class Post extends BaseModel {
  static findAll(_criteria: { published: boolean }): Post[] {
    // For example implementation only
    return [];
  }

  static findByPk(_id: number): Post | null {
    // For example implementation only
    return new Post();
  }

  static deleteWhere(_criteria: { id: number }): void {
    // For example implementation only
  }

  static count(): number {
    // For example implementation only
    return 1;
  }

  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "boolean" })
  published!: boolean;

  @Column({ type: "timestamp" })
  createdAt!: Date;

  @Column({ type: "int" })
  userId!: number;

  // Relationship: Post belongs to a user
  @ManyToOne(() => User, "posts", {
    target: () => "user",
    inverse: (obj) => obj.posts,
  })
  user!: User;
}

// Define User model
@Entity({ tableName: "users" })
class User extends BaseModel {
  static findOne(
    _criteria: { id: number },
    _options: { include: string[] },
  ): User | null {
    // For example implementation only
    return new User();
  }

  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "boolean" })
  isActive!: boolean;

  // Define one-to-many relationship with posts
  @OneToMany(() => Post, "user", {
    target: () => "posts",
    inverse: (obj) => obj.user,
  })
  posts!: Post[];
}

// Main example function
async function main(): Promise<void> {
  // Initialize the database (in-memory SQLite for this example)
  // and get the database instance
  const db = await DatabaseFactory.create({
    type: "sqlite",
    database: ":memory:",
  });

  // Register models with the database instance
  db.registerModels(User, Post);

  // Sync models to create tables
  console.log("📊 Creating database tables...");
  await db.sync();

  // Create a user
  console.log("👤 Creating a user...");
  const user = new User();
  user.name = "John Doe";
  user.email = "john@example.com";
  user.isActive = true;
  await user.save(db);
  console.log("✅ User created:", user);

  // Create some posts for the user
  console.log("📝 Creating posts...");
  const post1 = new Post();
  post1.title = "Getting Started with Rex-ORM";
  post1.content = "Rex-ORM is a powerful ORM for Deno...";
  post1.userId = user.id;
  post1.published = true;
  await post1.save(db);

  const post2 = new Post();
  post2.title = "Advanced Rex-ORM Features";
  post2.content = "Learn about relationships and transactions...";
  post2.userId = user.id;
  post2.published = false;
  await post2.save(db);

  // Find user with posts
  const userWithPosts = User.findOne(
    { id: user.id },
    { include: ["posts"] },
  );

  console.log("User:", userWithPosts?.name);
  console.log("Email:", userWithPosts?.email);
  console.log("Posts:");

  if (userWithPosts?.posts) {
    for (const post of userWithPosts.posts) {
      console.log(
        `- ${post.title} (${post.published ? "Published" : "Draft"})`,
      );
    }
  }

  // Find published posts
  console.log("\n🔍 Finding published posts...");
  const publishedPosts = Post.findAll({ published: true });
  console.log(`Found ${publishedPosts.length} published posts:`);

  for (const post of publishedPosts) {
    console.log(`- ${post.title}`);
  }

  // Update a post
  console.log("\n✏️ Updating a post...");
  const postToUpdate = Post.findByPk(post2.id);
  if (postToUpdate) {
    postToUpdate.published = true;
    postToUpdate.title = "Updated: Advanced Rex-ORM Features";
    await postToUpdate.save(db);
    console.log("✅ Post updated:", postToUpdate.title);
  }

  // Count remaining posts
  const remainingPosts = Post.count();
  console.log(`There are now ${remainingPosts} posts in the database`);

  console.log("\n🎉 Example completed successfully!");
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}
