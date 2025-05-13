// src/tests/cli/utils/test-utils.ts
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";

interface TestSetupResult {
  config: {
    database: string;
    databasePath: string;
  };
  paths: {
    configPath: string;
    migrationsPath: string;
    modelsPath: string;
    srcPath: string;
    interfacesPath: string;
    migrationPath: string;
  };
}

export async function setupTestEnvironment(
  testDir: string,
): Promise<TestSetupResult> {
  const paths = {
    configPath: join(testDir, "config"),
    migrationsPath: join(testDir, "migrations"),
    modelsPath: join(testDir, "models"),
    srcPath: join(testDir, "src"),
    interfacesPath: join(testDir, "src", "interfaces"),
    migrationPath: join(testDir, "src", "migration"),
  };

  // Create all directories
  for (const path of Object.values(paths)) {
    await ensureDir(path);
  }

  // Write interface files
  await Deno.writeTextFile(
    join(paths.interfacesPath, "DatabaseAdapter.ts"),
    `export interface DatabaseAdapter {
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      execute(query: string, params?: any[]): Promise<any>;
    }`,
  );

  await Deno.writeTextFile(
    join(paths.migrationPath, "MigrationRunner.ts"),
    `import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
     export interface Migration {
       id: string;
       up(adapter: DatabaseAdapter): Promise<void>;
       down(adapter: DatabaseAdapter): Promise<void>;
     }`,
  );

  // Create migration with SQLite-compatible syntax
  const migrationContent = `
    import { DatabaseAdapter } from "../src/interfaces/DatabaseAdapter.ts";
    import { Migration } from "../src/migration/MigrationRunner.ts";

    const migration: Migration = {
      id: "001_create_users_table",
      up: async (adapter: DatabaseAdapter) => {
        await adapter.execute(\`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
          );\`);
      },
      down: async (adapter: DatabaseAdapter) => {
        await adapter.execute("DROP TABLE IF EXISTS users;");
      }
    };

    export default migration;
  `.trim();

  // Write config and migration files
  await Deno.writeTextFile(
    join(paths.configPath, "config.json"),
    JSON.stringify({ database: "sqlite", databasePath: ":memory:" }, null, 2),
  );

  await Deno.writeTextFile(
    join(paths.migrationsPath, "001_create_users_table.ts"),
    migrationContent,
  );

  // Copy migration files from src to test directory
  const srcMigrationsDir = join(Deno.cwd(), "src", "migrations");
  const testMigrationsDir = join(testDir, "migrations");

  // Copy files manually instead of using copy function
  for await (const entry of Deno.readDir(srcMigrationsDir)) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const sourceFile = join(srcMigrationsDir, entry.name);
      const destFile = join(testMigrationsDir, entry.name);
      await Deno.copyFile(sourceFile, destFile);
    }
  }

  return { config: { database: "sqlite", databasePath: ":memory:" }, paths };
}
