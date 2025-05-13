// src/tests/utils/testSetup.ts

import { ensureDir } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";
import { ConnectionManager } from "../../db/ConnectionManager.ts";
import type { TestConfig } from "../../types/config.ts";

export async function setupTestEnvironment(
  testDir: string,
): Promise<{ config: TestConfig }> {
  // Create directory structure
  const dirs = [
    join(testDir, "config"),
    join(testDir, "migrations"),
    join(testDir, "src", "interfaces"),
    join(testDir, "src", "migration"),
  ];

  for (const dir of dirs) {
    await ensureDir(dir);
  }

  // Create test config with proper Record<string, unknown> implementation
  const config: TestConfig = {
    database: "sqlite",
    databasePath: ":memory:",
    [Symbol.iterator]: undefined as unknown as undefined,
  };

  // Write config file
  const configPath = join(testDir, "config", "config.json");
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));

  return { config };
}

export async function cleanupTestEnvironment(testDir: string): Promise<void> {
  // Instead of ConnectionManager.getInstance(), we create a new manager
  const connectionManager = new ConnectionManager();
  await connectionManager.reset();

  try {
    await Deno.remove(testDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }
}
