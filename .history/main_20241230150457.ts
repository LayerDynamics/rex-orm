import { Post } from "./src/models/Post.ts";

export function add(a: number, b: number): number {
  return a + b;
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const examplePost = new Post();
  console.log("Example post created:", examplePost);
  console.log("Add 2 + 3 =", add(2, 3));
}
