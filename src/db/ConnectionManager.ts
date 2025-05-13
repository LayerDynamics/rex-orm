// src/db/ConnectionManager.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { DatabaseFactory } from "../factory/DatabaseFactory.ts";
import { exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";
import type { TestConfig } from "../types/config.ts";

export type { TestConfig };

export class ConnectionManager {
  private adapter: DatabaseAdapter | null = null;

  constructor() {
    // no static instance
  }

  async getAdapter(config?: TestConfig): Promise<DatabaseAdapter> {
    if (this.adapter) {
      return this.adapter;
    }

    if (!config) {
      const configPath = join(Deno.cwd(), "config", "config.json");
      if (!await exists(configPath)) {
        throw new Error(
          `Configuration file not found at ${configPath}. Please run "rex-orm init" first.`,
        );
      }
      const configContent = await Deno.readTextFile(configPath);
      config = JSON.parse(configContent) as TestConfig;
    }

    // Use the updated createAdapter() method
    this.adapter = DatabaseFactory.createAdapter(config);
    // Because adapter.connect() is asynchronous now, we 'await' it
    await this.adapter.connect();

    return this.adapter;
  }

  async closeConnection(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
    }
  }

  async reset(): Promise<void> {
    await this.closeConnection();
    DatabaseFactory.reset();
  }
}
