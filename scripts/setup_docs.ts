#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Rex-ORM Documentation Structure
 *
 * This script creates the directory structure for documentation.
 * It ensures that all necessary directories exist before generating docs.
 */

import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

const ROOT_DIR = Deno.cwd();

// Required documentation directories
const DIRS = [
  "docs/api",
  "docs/site",
  "docs/site/guides",
  "docs/site/development",
  "examples",
];

async function main(): Promise<void> {
  console.log("🗂️ Creating documentation directory structure...");

  for (const dir of DIRS) {
    const path = join(ROOT_DIR, dir);
    await ensureDir(path);
    console.log(`✅ Created: ${dir}`);
  }

  console.log("📂 Documentation structure is ready!");
}

if (import.meta.main) {
  await main();
}
