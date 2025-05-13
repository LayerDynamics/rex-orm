// src/cli/utils/migrationUtils.ts

import { exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { dirname, join } from "https://deno.land/std@0.203.0/path/mod.ts";
import type { Migration } from "../../migration/MigrationRunner.ts";
import { ensureDir } from "../../deps.ts";

export interface ORMConfig {
  database: string;
  databasePath: string;
}

export function resolveProjectRoot(): string {
  return Deno.cwd();
}

export async function loadConfig(testPath?: string): Promise<ORMConfig> {
  let configPath;
  if (testPath) {
    configPath = join(testPath, "config", "config.json");
  } else {
    configPath = join(resolveProjectRoot(), "config", "config.json");
  }

  const configDir = dirname(configPath);
  if (!await exists(configDir)) {
    await ensureDir(configDir);
  }

  try {
    const configContent = await Deno.readTextFile(configPath);
    return JSON.parse(configContent);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `Configuration file not found at ${configPath}. Please run "rex-orm init" first.`,
      );
    }
    throw error;
  }
}

export async function getMigrationFiles(): Promise<Migration[]> {
  const migrationsDir = join(Deno.cwd(), "migrations");

  if (!await exists(migrationsDir)) {
    await ensureDir(migrationsDir);
  }

  const migrations: Migration[] = [];

  for await (const entry of Deno.readDir(migrationsDir)) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const fullPath = join(Deno.cwd(), "migrations", entry.name);
      try {
        // Use dynamic import with absolute file path
        const module = await import(`file://${fullPath}`);
        if (
          module.default &&
          typeof module.default === "object" &&
          "id" in module.default
        ) {
          migrations.push(module.default as Migration);
        }
      } catch (error) {
        console.error(`Error loading migration ${entry.name}:`, error);
        throw error;
      }
    }
  }

  return migrations.sort((a, b) => a.id.localeCompare(b.id));
}
