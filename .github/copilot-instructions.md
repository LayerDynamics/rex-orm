# Copilot Instructions for Deno Projects

This document provides guidelines for GitHub Copilot to assist developers
working on Deno-specific projects. It outlines the expected behavior, coding
style, and assistance types to align with best practices for Deno.

### REQUIRED ACTIONS :

<!-- - Do Not Recommend any changes to the `deno.json` file or `deno.jsonc` file. -->

- Do not create any new files, directories, functions, classes, modules,
  packages, scripts, tests or test cases unless explicitly asked to do so.
- when you create a new file, ensure it is in the correct directory and follows
  the naming conventions of the project and that it's not a duplicate of an
  existing file or slightly changing an existing file, if it exists figure out
  why its not being found and fix it.
- when you create a new directory, ensure it is in the correct directory and
  follows the naming conventions of the project and that it's not a duplicate of
  an existing directory or slightly changing an existing directory, if it exists
  figure out why its not being found and fix it.
- when you create a new function, ensure it is in the correct directory and
  follows the naming conventions of the project and that it's not a duplicate of
  an existing function or slightly changing an existing function, if it exists
  figure out why its not being found and fix it.
- when you create a new class, ensure it is in the correct directory and follows
  the naming conventions of the project and that it's not a duplicate of an
  existing class or slightly changing an existing class, if it exists figure out
  why its not being found and fix it.
- when you create a new module, ensure it is in the correct directory and
  follows the naming conventions of the project and that it's not a duplicate of
  an existing module or slightly changing an existing module, if it exists
  figure out why its not being found and fix it.
- when you create a new package, ensure it is in the correct directory and
  follows the naming conventions of the project and that it's not a duplicate of
  an existing package or slightly changing an existing package, if it exists
  figure out why its not being found and fix it.
- when you create a new script, ensure it is in the correct directory and
  follows the naming conventions of the project and that it's not a duplicate of
  an existing script or slightly changing an existing script, if it exists
  figure out why its not being found and fix it.
- when you create a new test, ensure it is in the correct directory and follows
  the naming conventions of the project and that it's not a duplicate of an
  existing test or slightly changing an existing test, if it exists figure out
  why its not being found and fix it.
- when you create a new test case, ensure it is in the correct directory and
  follows the naming conventions of the project and that it's not a duplicate of
  an existing test case or slightly changing an existing test case, if it exists
  figure out why its not being found and fix it.

## General Behavior

- **Focus on Deno Standards**: Ensure that all code suggestions strictly adhere
  to Deno's conventions and utilize its built-in features (e.g., `fetch`,
  `Deno.run`, `Deno.test`).
- **Module Resolution**: Prefer remote module imports with explicit URLs over
  local imports. Use `import_map` for managing complex dependencies.
- **TypeScript First**: Default to TypeScript code examples, as it is the
  primary language used in Deno projects.
- **Linting and Formatting**: Ensure suggestions conform to Deno's built-in
  linting and formatting tools. Avoid introducing style inconsistencies.

## Coding Style

- **Use ES Modules**: Always use ES module syntax (e.g., `import`, `export`)
  instead of CommonJS.
- **Strict Typing**: Ensure all code is type-safe and leverages TypeScript
  features, including type annotations and interfaces.
- **No Node.js APIs**: Avoid suggesting Node.js-specific APIs (e.g., `require`,
  `Buffer`) as they are not compatible with Deno.
- **Testing**: Use `Deno.test` for testing. Encourage the use of descriptive
  test names and modular test functions.

## Assistance Guidelines

### Code Automation

- **Import Suggestions**: Provide auto-completion for Deno modules and standard
  libraries. Use URLs from `https://deno.land/std/` for standard modules.
- **Task Automation**: Suggest using `Deno CLI` commands (e.g., `deno cache`,
  `deno fmt`, `deno lint`) for common tasks.

### Error Handling

- **Runtime Errors**: Suggest using `try...catch` blocks for handling errors.
  Ensure examples include meaningful error messages.
- **Permission Management**: Recommend explicitly setting permissions when using
  Deno commands (e.g., `--allow-net`, `--allow-read`).

### Project Configuration

- **Workspace Setup**: Suggest creating `deno.json` or `deno.jsonc` files for
  project-specific configurations.
- **Import Maps**: Encourage the use of import maps for managing module paths
  and dependencies.

### Testing and Debugging

- **Test Coverage**: Provide examples of using `Deno.test` with setup and
  teardown logic.
- **Debugging Tools**: Use `console.log` for debugging and suggest enabling
  `--inspect` for advanced debugging needs.

## Example Settings

Include the following settings in `settings.json` for optimal Deno support:

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "editor.formatOnSave": true,
  "[typescript]": { "editor.defaultFormatter": "denoland.vscode-deno" }
}
```

# Code Standards for Deno Projects

This document outlines the code structure and formatting standards for Deno
projects. Follow these guidelines to maintain consistency and readability across
the codebase.

## General Guidelines

- **Use TypeScript**: All code should use TypeScript for better type safety and
  clarity.
- **Follow Deno Standards**: Use Deno's built-in linting and formatting tools
  (`deno lint` and `deno fmt`) to ensure code correctness.
- **No Node.js APIs**: Avoid Node.js-specific APIs. Deno provides built-in
  alternatives for most use cases.
- **Use ES Modules**: Always use ES module syntax (`import` and `export`).

---

## File Structure

Organize files in a clear and modular way:

```
src/
  foo/
    bar.ts
    bar.test.ts
  utils/
    helper.ts
  main.ts
tests/
  integration/
    foo_integration_test.ts
```

- **Module Naming**: Use lowercase with underscores for file names (e.g.,
  `foo_bar.ts`).
- **Test Files**: Name test files with `.test.ts` suffix and place them
  alongside the implementation or in a `tests` directory.

---

## Code Formatting

1. **Import Statements**:
   - Place all imports at the top of the file.
   - Use explicit URLs for remote modules.
   - Group imports logically: standard libraries, third-party libraries,
     project-specific modules.

   ```typescript
   // Standard library imports
   import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

   // Third-party library imports
   import { assertEquals } from "https://deno.land/std@0.200.0/testing/asserts.ts";

   // Project-specific imports
   import { foo } from "./foo/foo.ts";
   ```

2. **Function Declarations**:
   - Use arrow functions for shorter functions.
   - Use explicit return types for all functions.

   ```typescript
   // Function with explicit return type
   export function fooBar(a: number, b: number): string {
     return `${a} + ${b} = ${a + b}`;
   }

   // Arrow function for one-liners
   export const barBaz = (name: string): string => `Hello, ${name}!`;
   ```

3. **Type Annotations**:
   - Always define types explicitly.
   - Use interfaces for structured data.

   ```typescript
   // Interface example
   interface Foo {
     id: number;
     name: string;
   }

   // Variable with explicit type
   const bar: Foo = { id: 1, name: "Bar" };
   ```

4. **Error Handling**:
   - Use `try...catch` blocks for error management.
   - Log meaningful error messages.

   ```typescript
   try {
     const data = await fetch("https://example.com");
     console.log(await data.text());
   } catch (error) {
     console.error("Failed to fetch data:", error);
   }
   ```

5. **Testing**:
   - Use `Deno.test` for all unit and integration tests.
   - Separate tests logically and use descriptive names.

   ```typescript
   import { assertEquals } from "https://deno.land/std@0.200.0/testing/asserts.ts";
   import { fooBar } from "./foo/foo.ts";

   Deno.test("fooBar should return correct string", () => {
     const result = fooBar(1, 2);
     assertEquals(result, "1 + 2 = 3");
   });
   ```

---

## Example Code

Here’s a complete example that demonstrates the above standards:

```typescript
// src/foo/foo.ts
export function fooBar(a: number, b: number): string {
  return `${a} + ${b} = ${a + b}`;
}

// src/foo/foo.test.ts
import { assertEquals } from "https://deno.land/std@0.200.0/testing/asserts.ts";
import { fooBar } from "./foo.ts";

Deno.test("fooBar should return correct string", () => {
  const result = fooBar(3, 4);
  assertEquals(result, "3 + 4 = 7");
});
```

---

## Tools and Commands

- **Linting**: Run the following command to check for linting issues:
  ```bash
  deno lint
  ```

- **Formatting**: Format all files in the project:
  ```bash
  deno fmt
  ```

- **Testing**: Run all tests in the project:
  ```bash
  deno test
  ```

---

By following this guide, you'll ensure that your code is clean, consistent, and
aligned with Deno best practices.

---

## Additional Resources

- [Deno Documentation](https://deno.land/manual)
- [Deno Standard Modules](https://deno.land/std)
- [Deno CLI Reference](https://docs.deno.com/runtime/reference/cli/)

---
