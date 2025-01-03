import "./src/deps.ts";
import { assertEquals } from "./src/deps.ts";
import { ModelRegistry } from "./src/models/ModelRegistry.ts";

// Register base models first
import { User } from "./src/models/User.ts";
import { Post } from "./src/models/Post.ts";

ModelRegistry.registerModels(User, Post);

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
