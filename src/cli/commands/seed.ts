// src/cli/commands/seed.ts

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { loadConfig } from "../utils/migrationUtils.ts";
import { DatabaseFactory } from "../../factory/DatabaseFactory.ts";
// If ModelRegistry is unused, prefix with _ or remove:
import { ModelRegistry as _ModelRegistry } from "../../models/ModelRegistry.ts";
import { User } from "../../models/User.ts";
import { Post } from "../../models/Post.ts";
import { MigrationTracker } from "../../migration/MigrationTracker.ts";
import { DatabaseAdapter } from "../../interfaces/DatabaseAdapter.ts";
import { TestConfig } from "../../db/ConnectionManager.ts";

interface SeedOptions {
  config?: TestConfig;
  adapter?: DatabaseAdapter;
  configPath?: string;
}

export const seedCommand = new Command()
  .name("seed")
  .description("Seed the database with initial data")
  .option("--config <path:string>", "Path to config file")
  .action(async (options: { config?: string }) => {
    await execute({ configPath: options.config });
  });

// Separate execute function for testing
export async function execute(options: SeedOptions = {}) {
  let ownAdapter = false;
  let adapter = options.adapter;

  try {
    if (!adapter) {
      ownAdapter = true;
      const config = options.config || await loadConfig(options.configPath);
      adapter = await DatabaseFactory.createAdapter(config);
      await adapter.connect();
    }

    const tracker = new MigrationTracker(adapter);

    // Verify required table exists
    const usersExist = await tracker.tableExists("users");
    if (!usersExist) {
      throw new Error(
        "Required table 'users' does not exist. Please run migrations first.",
      );
    }

    // Example seed data
    const users = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ];

    for (const userData of users) {
      const user = new User();
      user.name = userData.name;
      user.email = userData.email;
      await user.save(adapter);
      console.log(`Seeded user: ${user.name}`);
    }

    const posts = [
      { title: "First Post", content: "Hello World", userId: 1 },
      { title: "Second Post", content: "Another post", userId: 2 },
    ];

    for (const postData of posts) {
      const post = new Post();
      post.title = postData.title;
      post.content = postData.content;
      post.userId = postData.userId;
      await post.save(adapter);
      console.log(`Seeded post: ${post.title}`);
    }

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  } finally {
    if (ownAdapter && adapter) {
      await adapter.disconnect();
    }
  }
}
