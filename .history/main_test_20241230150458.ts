import { assertEquals } from "@std/assert";
import { add } from "./main.ts";
import { Post } from "./src/models/Post.ts";

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
