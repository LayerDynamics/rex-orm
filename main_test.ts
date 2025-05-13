import "reflect-metadata";
import "./src/deps.ts";
import { assertEquals } from "./src/deps.ts";
import { ModelRegistry } from "./src/models/ModelRegistry.ts";
import { Column, Entity, PrimaryKey } from "./src/decorators/index.ts";
import { BaseModel } from "./src/models/BaseModel.ts";

// Ensure migrations directory exists for all tests
import { ensureDir } from "https://deno.land/std@0.203.0/fs/mod.ts";

try {
  await ensureDir("./migrations");
  console.log("Migrations directory ensured");
} catch (error) {
  // Proper error type checking
  if (error instanceof Error) {
    console.warn("Could not create migrations directory:", error.message);
  } else {
    console.warn("Could not create migrations directory:", String(error));
  }
  console.warn("If running tests, make sure to use --allow-write flag");
}

// Register base models first
@Entity({ tableName: "users" })
class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;
}

import { Post } from "./src/models/Post.ts";

ModelRegistry.registerModels(User, Post);

// Initialize reflect-metadata before running tests
Reflect.defineMetadata("validations", [], Object);

import { add } from "./main.ts";

Deno.test(function addTest() {
  assertEquals(add(2, 3), 5);
});

Deno.test(function postCreationTest() {
  const post = new Post();
  post.title = "Sample Title";
  if (!post.title) {
    throw new Error("Post title was not set properly");
  }
});
