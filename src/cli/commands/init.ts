// src/cli/commands/init.ts

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.203.0/fs/mod.ts";

interface InitOptions {
  dir: string;
}

export const initCommand = new Command()
  .name("init")
  .description("Initialize a new Rex-ORM project")
  .option("-d, --dir <dir>", "Directory to initialize the project in", {
    default: ".",
  })
  .action(async ({ dir }: InitOptions) => { // Changed to destructure options
    const projectDir = dir;

    try {
      // Check if directory exists
      const dirExists = await exists(projectDir);
      if (!dirExists) {
        console.error(`Directory "${projectDir}" does not exist.`);
        throw new Error(`Directory "${projectDir}" does not exist.`);
      }

      // Create necessary subdirectories
      const dirsToCreate = [
        `${projectDir}/models`,
        `${projectDir}/migrations`,
        `${projectDir}/config`,
        `${projectDir}/tests/unit`,
      ];

      for (const dir of dirsToCreate) {
        await ensureDir(dir);
        console.log(`Created directory: ${dir}`);
      }

      // Create a default configuration file
      const configPath = `${projectDir}/config/config.json`;
      if (await exists(configPath)) {
        console.log(`Configuration file already exists at ${configPath}`);
      } else {
        const defaultConfig = {
          database: "sqlite",
          databasePath: "./data/rex_orm_db.sqlite",
        };
        await Deno.writeTextFile(
          configPath,
          JSON.stringify(defaultConfig, null, 2),
        );
        console.log(`Created default configuration at ${configPath}`);
      }

      // Create a data directory
      const dataDir = `${projectDir}/data`;
      await ensureDir(dataDir);
      console.log(`Created data directory: ${dataDir}`);

      console.log("Rex-ORM project initialized successfully!");
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  });
