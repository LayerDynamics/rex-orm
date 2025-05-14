// src/tests/unit/cli/utils/fileUtils.test.ts

import { assertEquals, assertExists as _assertExists } from "../../../deps.ts";
import {
  createDirectory,
  toPascalCase,
  writeFileIfNotExists,
} from "../../../cli/utils/fileUtils.ts";
import { exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join as _join } from "https://deno.land/std@0.203.0/path/mod.ts";

Deno.test("createDirectory creates a new directory if it does not exist", async () => {
  const testDir = "./test_create_directory";

  // Ensure the directory does not exist before test
  if (await exists(testDir)) {
    await Deno.remove(testDir, { recursive: true });
  }

  // Invoke createDirectory
  await createDirectory(testDir);

  // Verify directory creation
  assertEquals(await exists(testDir), true);

  // Cleanup
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("createDirectory does not overwrite existing directories", async () => {
  const testDir = "./test_create_directory_existing";

  // Create the directory beforehand
  await Deno.mkdir(testDir, { recursive: true });

  // Invoke createDirectory
  await createDirectory(testDir);

  // Verify directory still exists
  assertEquals(await exists(testDir), true);

  // Cleanup
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("writeFileIfNotExists creates a new file if it does not exist", async () => {
  const testFile = "./test_write_file.txt";
  const content = "Hello, Rex-ORM!";

  // Ensure the file does not exist before test
  if (await exists(testFile)) {
    await Deno.remove(testFile);
  }

  // Invoke writeFileIfNotExists
  await writeFileIfNotExists(testFile, content);

  // Verify file creation
  assertEquals(await exists(testFile), true);

  const fileContent = await Deno.readTextFile(testFile);
  assertEquals(fileContent, content);

  // Cleanup
  await Deno.remove(testFile);
});

Deno.test("writeFileIfNotExists does not overwrite existing files", async () => {
  const testFile = "./test_write_file_existing.txt";
  const initialContent = "Initial Content";
  const newContent = "New Content";

  // Create the file with initial content
  await Deno.writeTextFile(testFile, initialContent);

  // Invoke writeFileIfNotExists with new content
  await writeFileIfNotExists(testFile, newContent);

  // Verify that the file content has not changed
  const fileContent = await Deno.readTextFile(testFile);
  assertEquals(fileContent, initialContent);

  // Cleanup
  await Deno.remove(testFile);
});

Deno.test("toPascalCase converts strings to PascalCase correctly", () => {
  const cases = [
    { input: "user_model", expected: "UserModel" },
    { input: "post", expected: "Post" },
    { input: "test_case_example", expected: "TestCaseExample" },
    { input: "anotherExample", expected: "AnotherExample" },
    { input: "snake_case_test", expected: "SnakeCaseTest" },
  ];

  cases.forEach(({ input, expected }) => {
    const result = toPascalCase(input);
    assertEquals(result, expected);
  });
});
