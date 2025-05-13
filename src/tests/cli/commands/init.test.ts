// src/tests/unit/cli/commands/init.test.ts

import { assertEquals, assertExists } from "../../../deps.ts";
import { initCommand } from "../../../cli/commands/init.ts";
import { exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";

// Add mock for Deno.readSync at the beginning
// @ts-ignore
Deno.readSync = () => new Uint8Array();

Deno.test("init command initializes a new Rex-ORM project correctly", async () => {
  const testDir = "./test_project_init";

  try {
    // Create test directory first
    await Deno.mkdir(testDir, { recursive: true });

    // Execute command
    await initCommand.parse(["--dir", testDir]);

    // Verify directories
    const expectedDirs = [
      join(testDir, "models"),
      join(testDir, "migrations"),
      join(testDir, "config"),
      join(testDir, "tests/unit"),
      join(testDir, "data"),
    ];

    for (const dir of expectedDirs) {
      assertEquals(await exists(dir), true, `Directory should exist: ${dir}`);
    }

    // Verify config file
    const configPath = join(testDir, "config", "config.json");
    assertEquals(
      await exists(configPath),
      true,
      "Configuration file should exist",
    );

    const configContent = await Deno.readTextFile(configPath);
    const config = JSON.parse(configContent);
    assertEquals(config.database, "sqlite");
    assertEquals(config.databasePath, "./data/rex_orm_db.sqlite");
  } finally {
    // Clean up after test
    await Deno.remove(testDir, { recursive: true });
  }
});
