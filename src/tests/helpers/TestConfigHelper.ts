// src/tests/helpers/TestConfigHelper.ts

import { ensureDir } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";

export class TestConfigHelper {
  private static testConfigPath = "./test_config";

  static async setupTestConfig(testDir: string = "") {
    const configDir = testDir
      ? join(testDir, "config")
      : join(this.testConfigPath, "config");
    await ensureDir(configDir);

    const configContent = {
      database: "sqlite",
      databasePath: ":memory:", // Use in-memory SQLite for tests
      poolSize: 5,
      idleTimeout: 30000,
    };

    const configPath = join(configDir, "config.json");
    await Deno.writeTextFile(
      configPath,
      JSON.stringify(configContent, null, 2),
    );

    // Create other necessary directories
    const dirs = [
      join(testDir || this.testConfigPath, "models"),
      join(testDir || this.testConfigPath, "migrations"),
      join(testDir || this.testConfigPath, "data"),
    ];

    for (const dir of dirs) {
      await ensureDir(dir);
    }

    return {
      configPath,
      configContent,
    };
  }

  static async cleanupTestConfig(testDir: string = "") {
    const dirToClean = testDir || this.testConfigPath;
    try {
      await Deno.remove(dirToClean, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }
}
