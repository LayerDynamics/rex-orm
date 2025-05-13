// src/cli/cli.ts
import "reflect-metadata";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { initCommand } from "./commands/init.ts";
import { generateModelCommand } from "./commands/generateModel.ts";
import { migrateCommand } from "./commands/migrate.ts";
import { rollbackCommand } from "./commands/rollback.ts";
import { seedCommand } from "./commands/seed.ts";

/**
 * Create the CLI and add subcommands properly.
 * We do not call `.addCommand(...)` because that method doesn't exist
 * in Cliffy v1.0.0-rc.4. Instead we use `.command("name", commandObj)`.
 */

const cli = new Command()
  .name("rex-orm")
  .description("Rex-ORM Command-Line Interface")
  .version("1.0.0");

// Attach each subcommand.
// The first param is the subcommand name (string),
// the second param is your imported Command object.
cli.command("init", initCommand);
cli.command("generateModel", generateModelCommand);
cli.command("migrate", migrateCommand);
cli.command("rollback", rollbackCommand);
cli.command("seed", seedCommand);

// Finally parse the arguments
await cli.parse(Deno.args);
