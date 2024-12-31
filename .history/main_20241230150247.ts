import "./src/models/Post.ts";

export function add(a: number, b: number): number {
  return a + b;
}

export function runApp() {
  console.log("Loading and registering all models");
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  console.log("Add 2 + 3 =", add(2, 3));
}
