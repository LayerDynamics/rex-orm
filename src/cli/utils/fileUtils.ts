// src/cli/utils/fileUtils.ts

import { ensureDir, exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";

export async function createDirectory(path: string): Promise<void> {
  if (!(await exists(path))) {
    await ensureDir(path);
    console.log(`Created directory: ${path}`);
  } else {
    console.log(`Directory already exists: ${path}`);
  }
}

export async function writeFileIfNotExists(
  filePath: string,
  content: string,
): Promise<void> {
  if (await exists(filePath)) {
    console.log(`File already exists at ${filePath}`);
  } else {
    await Deno.writeTextFile(filePath, content);
    console.log(`Created file: ${filePath}`);
  }
}

export async function createConfigFile(
  filePath: string,
  content: object = {},
): Promise<void> {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  await createDirectory(dir);

  if (await exists(filePath)) {
    console.log(`Configuration file already exists at ${filePath}`);
  } else {
    const defaultContent = {
      database: "sqlite",
      databasePath: ":memory:",
      // Add other default configurations as needed
      ...content,
    };
    await writeFileIfNotExists(
      filePath,
      JSON.stringify(defaultContent, null, 2),
    );
    console.log(`Created configuration file at ${filePath}`);
  }
}

export function toPascalCase(text: string): string {
  return text
    .replace(/(^\w|_\w)/g, (match) => match.replace("_", "").toUpperCase());
}
