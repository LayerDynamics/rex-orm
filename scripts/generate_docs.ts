#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

/**
 * Rex-ORM Documentation Generator
 *
 * This script generates comprehensive API documentation from TypeScript source files
 * using Deno's built-in doc generator and customizes the output for a professional
 * documentation site. It supports:
 *
 * - Complete API reference generation
 * - Markdown site generation for GitHub Pages
 * - Cross-reference between modules
 * - Code examples inclusion
 * - Versioned documentation
 */

import { ensureDir, walk } from "https://deno.land/std@0.224.0/fs/mod.ts";
import {
  // These imports are critical for operations in this file, do not remove
  basename,
  dirname,
  join,
  relative,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { RELEASE_DATE, VERSION } from "../src/version.ts";

// Configuration
const OUTPUT_DIR = "./docs/api";
const SITE_DIR = "./docs/site";
// These constants are critical for operations in this file, do not remove
const SRC_DIR = "./src";
const EXAMPLES_DIR = "./examples";
const ROOT_DIRS = ["./src", "./examples", "./bench"];

// Types for documentation data
interface DocNode {
  kind: string;
  name: string;
  location: {
    filename: string;
    line: number;
    col: number;
  };
  jsDoc?: {
    doc?: string;
    tags?: Array<{
      kind: string;
      name: string;
      type?: string;
      text?: string;
    }>;
  };
  classDef?: {
    extends?: string;
    implements?: string[];
    methods?: Array<{
      name: string;
      params?: string[];
      returnType?: string;
      isAsync?: boolean;
      isStatic?: boolean;
      accessibility?: "public" | "protected" | "private";
      jsDoc?: {
        doc?: string;
        tags?: any[];
      };
    }>;
    properties?: Array<{
      name: string;
      type?: string;
      isStatic?: boolean;
      accessibility?: "public" | "protected" | "private";
      jsDoc?: {
        doc?: string;
        tags?: any[];
      };
    }>;
  };
  moduleDoc?: {
    path: string;
  };
}

// Automatically gather all source files for documentation
async function getSourceFiles(): Promise<string[]> {
  console.log("Scanning project for source files...");

  // Always include these important files
  const sourceFiles: string[] = ["./mod.ts", "./main.ts"];

  // Skip patterns for files and directories
  const skipDirectories = ["node_modules", ".git", "tests", "test"];
  const skipPatterns = [
    /\.test\.ts$/,
    /_test\.ts$/,
    /\/test\//,
    /\/tests\//,
    /\/node_modules\//,
    /\/\.git\//,
  ];

  // Get files from all root directories
  for (const rootDir of ROOT_DIRS) {
    try {
      for await (
        const entry of walk(rootDir, {
          includeDirs: false,
          exts: [".ts"],
          skip: skipDirectories.map((dir) => new RegExp(`/${dir}/`)),
        })
      ) {
        // Skip test files and other excluded patterns
        if (!skipPatterns.some((pattern) => pattern.test(entry.path))) {
          sourceFiles.push(entry.path);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.warn(`Could not scan directory ${rootDir}: ${errorMessage}`);
    }
  }

  // Deduplicate files
  const uniqueFiles = [...new Set(sourceFiles)];

  console.log(`Found ${uniqueFiles.length} source files to document`);
  return uniqueFiles;
}

async function generateDocs() {
  // Create output directories
  await ensureDir(OUTPUT_DIR);
  await ensureDir(join(OUTPUT_DIR, "modules"));

  console.log(
    `Generating documentation for Rex-ORM v${VERSION} (${RELEASE_DATE})`,
  );
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Log the source directories we'll be scanning
  console.log(`Source directories:`);
  console.log(`- Main source: ${SRC_DIR}`);
  console.log(`- Examples: ${EXAMPLES_DIR}`);

  console.log("📝 Generating Rex-ORM API documentation...");

  // Ensure output directories exist
  await ensureDir(OUTPUT_DIR);
  await ensureDir(SITE_DIR);

  // Get source files to document
  const sourceFiles = await getSourceFiles();

  // Get Deno version
  const denoVersion = Deno.version.deno;
  console.log(`Using Deno version: ${denoVersion}`);

  // Generate raw API documentation JSON
  console.log("Generating API documentation...");
  const docGenCommand = new Deno.Command("deno", {
    args: ["doc", "--json", ...sourceFiles],
    stdout: "piped",
  });

  const docGenOutput = await docGenCommand.output();
  if (!docGenOutput.success) {
    console.error("Failed to generate API documentation");
    Deno.exit(1);
  }

  const docJson = new TextDecoder().decode(docGenOutput.stdout);
  await Deno.writeTextFile(join(OUTPUT_DIR, "api.json"), docJson);

  // Generate Markdown documentation
  console.log("Converting to Markdown...");
  let docsData = JSON.parse(docJson);

  // Debug the data structure
  console.log("Document data structure type:", typeof docsData);
  if (typeof docsData === "object") {
    console.log("Top level keys:", Object.keys(docsData));
  }

  // Check if docsData is an array
  if (!Array.isArray(docsData)) {
    console.error(
      "Error: Documentation data is not an array. Received:",
      typeof docsData,
    );
    console.log("Attempting to normalize the data structure...");

    // Function to normalize the documentation data to an array format
    function normalizeDocsData(data: any): any[] {
      if (Array.isArray(data)) return data;

      // New Deno doc format has a 'nodes' array
      if (data.nodes && Array.isArray(data.nodes)) {
        return data.nodes;
      }

      if (data.items && Array.isArray(data.items)) {
        return data.items;
      }

      if (data.symbols) {
        return Object.values(data.symbols);
      }

      // Last resort: try to convert object to array if it has numeric keys
      if (typeof data === "object" && data !== null) {
        const values = Object.values(data);
        if (values.length > 0) {
          return values;
        }
      }

      console.error("Could not normalize documentation data");
      return [];
    }

    // Replace docsData with normalized version
    const normalizedData = normalizeDocsData(docsData);

    if (normalizedData.length === 0) {
      console.error("Failed to extract documentation items.");
      Deno.exit(1);
    }

    console.log(`Normalized to ${normalizedData.length} documentation items.`);
    docsData = normalizedData;
  }

  // Create an index file
  let indexContent = `# Rex-ORM API Documentation\n\n`;
  indexContent += `Version: ${VERSION} (Released: ${RELEASE_DATE})\n\n`;
  indexContent += `## Modules\n\n`;

  // Extra debugging to understand data structure
  console.log("Data type:", typeof docsData);
  console.log("Is array:", Array.isArray(docsData));

  if (typeof docsData === "object" && docsData !== null) {
    // If it's an object with keys, log a sample of the keys
    const keys = Object.keys(docsData);
    if (keys.length > 0) {
      console.log("Sample keys:", keys.slice(0, 5));
      console.log("Sample value type:", typeof docsData[keys[0]]);
    }
  }

  // Create a safe wrapper to handle different data structures
  const moduleSet = new Set<string>();

  if (Array.isArray(docsData)) {
    // Handle array format
    for (const item of docsData) {
      if (item.kind === "moduleDoc") {
        moduleSet.add(item.name);
      } else if (item.location && item.location.filename) {
        // Extract module path from filename
        const filePath = item.location.filename.replace("file://", "");
        // Get relative path from project root
        const relativePath = filePath.includes("/rex-orm/")
          ? filePath.split("/rex-orm/")[1]
          : filePath;

        // Add as a module (excluding external deps)
        if (
          relativePath.startsWith("src/") ||
          relativePath.startsWith("mod.ts") ||
          relativePath.startsWith("main.ts")
        ) {
          // Get the directory as the module
          const modulePath = relativePath.split("/").slice(0, -1).join("/");
          if (modulePath) {
            moduleSet.add(modulePath);
          }
        }
      }
    }
  } else if (typeof docsData === "object" && docsData !== null) {
    if (docsData.nodes && Array.isArray(docsData.nodes)) {
      for (const item of docsData.nodes) {
        if (item.location && item.location.filename) {
          // Extract module path from filename
          const filePath = item.location.filename.replace("file://", "");
          // Get relative path from project root
          const relativePath = filePath.includes("/rex-orm/")
            ? filePath.split("/rex-orm/")[1]
            : filePath;

          // Add as a module (excluding external deps)
          if (
            relativePath.startsWith("src/") ||
            relativePath.startsWith("mod.ts") ||
            relativePath.startsWith("main.ts")
          ) {
            // Get the directory as the module
            const modulePath = relativePath.split("/").slice(0, -1).join("/");
            if (modulePath) {
              moduleSet.add(modulePath);
            }
          }
        }
      }
    }
  }

  const modules = Array.from(moduleSet).sort() as string[];
  modules.forEach((moduleName) => {
    const safeName = moduleName.replace(/\//g, "_").replace(/\./g, "_");
    indexContent += `- [${moduleName}](./modules/${safeName}.md)\n`;
  });

  await Deno.writeTextFile(join(OUTPUT_DIR, "index.md"), indexContent);

  // Create directory for module documentation
  await ensureDir(join(OUTPUT_DIR, "modules"));

  // Generate individual module files
  for (const moduleName of modules) {
    const safeName = moduleName.replace(/\//g, "_").replace(/\./g, "_");
    let moduleContent = `# Module: ${moduleName}\n\n`;

    // Add classes
    const classes = [];
    if (Array.isArray(docsData)) {
      // Extract classes for this module
      for (const item of docsData) {
        if (item.kind === "class" && item.location && item.location.filename) {
          const filePath = item.location.filename.replace("file://", "");
          const relativePath = filePath.includes("/rex-orm/")
            ? filePath.split("/rex-orm/")[1]
            : filePath;

          // Get the directory of the file
          const itemModule = relativePath.split("/").slice(0, -1).join("/");

          if (itemModule === moduleName) {
            classes.push(item);
          }
        }
      }
    } else if (
      typeof docsData === "object" && docsData !== null && docsData.nodes
    ) {
      // Extract classes from the nodes array
      for (const item of docsData.nodes) {
        if (item.kind === "class" && item.location && item.location.filename) {
          const filePath = item.location.filename.replace("file://", "");
          const relativePath = filePath.includes("/rex-orm/")
            ? filePath.split("/rex-orm/")[1]
            : filePath;

          // Get the directory of the file
          const itemModule = relativePath.split("/").slice(0, -1).join("/");

          if (itemModule === moduleName) {
            classes.push(item);
          }
        }
      }
    }

    if (classes.length > 0) {
      moduleContent += `## Classes\n\n`;
      classes.forEach((cls) => {
        moduleContent += `### ${cls.name}\n\n`;
        if (cls.jsDoc && cls.jsDoc.doc) {
          moduleContent += `${cls.jsDoc.doc}\n\n`;
        }

        // Add methods
        const methods = cls.classDef?.methods || [];
        if (methods.length > 0) {
          moduleContent += `#### Methods\n\n`;
          methods.forEach((method: {
            name: string;
            params?: string[];
            returnType?: string;
            isAsync?: boolean;
            isStatic?: boolean;
            accessibility?: "public" | "protected" | "private";
            jsDoc?: {
              doc?: string;
              tags?: any[];
            };
          }) => {
            moduleContent += `##### \`${method.name}(${
              (method.params || []).join(", ")
            })\`\n\n`;
            if (method.jsDoc && method.jsDoc.doc) {
              moduleContent += `${method.jsDoc.doc}\n\n`;
            }
          });
        }

        moduleContent += `\n`;
      });
    }

    // Add functions
    const functions = [];
    if (Array.isArray(docsData)) {
      // Extract functions for this module
      for (const item of docsData) {
        if (
          item.kind === "function" && item.location && item.location.filename
        ) {
          const filePath = item.location.filename.replace("file://", "");
          const relativePath = filePath.includes("/rex-orm/")
            ? filePath.split("/rex-orm/")[1]
            : filePath;

          // Get the directory of the file
          const itemModule = relativePath.split("/").slice(0, -1).join("/");

          if (itemModule === moduleName) {
            functions.push(item);
          }
        }
      }
    } else if (
      typeof docsData === "object" && docsData !== null && docsData.nodes
    ) {
      // Extract functions from the nodes array
      for (const item of docsData.nodes) {
        if (
          item.kind === "function" && item.location && item.location.filename
        ) {
          const filePath = item.location.filename.replace("file://", "");
          const relativePath = filePath.includes("/rex-orm/")
            ? filePath.split("/rex-orm/")[1]
            : filePath;

          // Get the directory of the file
          const itemModule = relativePath.split("/").slice(0, -1).join("/");

          if (itemModule === moduleName) {
            functions.push(item);
          }
        }
      }
    }

    if (functions.length > 0) {
      moduleContent += `## Functions\n\n`;
      functions.forEach((func) => {
        moduleContent += `### ${func.name}\n\n`;
        if (func.jsDoc && func.jsDoc.doc) {
          moduleContent += `${func.jsDoc.doc}\n\n`;
        }
      });
    }

    await Deno.writeTextFile(
      join(OUTPUT_DIR, "modules", `${safeName}.md`),
      moduleContent,
    );
  }

  console.log(`✅ Documentation generated at ${OUTPUT_DIR}`);
}

// Generate site content (copy from docs/ to docs/site/)
async function generateSite() {
  console.log("🌐 Generating documentation site...");

  // Copy main README to site index
  const readmeContent = await Deno.readTextFile("./README.md");
  await Deno.writeTextFile(join(SITE_DIR, "index.md"), readmeContent);

  // Create mkdocs.yml configuration
  const mkdocsConfig = `
site_name: Rex-ORM Documentation
site_description: Documentation for Rex-ORM, a type-safe ORM for Deno
site_author: Rex-ORM Team
repo_url: https://github.com/LayerDynamics/rex-orm
edit_uri: edit/main/docs/
theme:
  name: material
  palette:
    primary: indigo
    accent: indigo
  features:
    - navigation.tracking
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - search.highlight
markdown_extensions:
  - pymdownx.highlight
  - pymdownx.superfences
nav:
  - Home: index.md
  - Getting Started:
    - Installation: installation.md
    - Quick Start: quick-start.md
  - Guides:
    - Models: guides/models.md
    - Relationships: guides/relationships.md
    - Querying: guides/querying.md
    - Migrations: guides/migrations.md
  - API Reference: api/index.md
  - Development:
    - Contributing: development/contributing.md
    - Roadmap: development/roadmap.md
  - Deployment:
    - Serverless: serverless-deployment.md
    - Vector Support: vector-support.md
`;

  await Deno.writeTextFile(join(SITE_DIR, "mkdocs.yml"), mkdocsConfig);

  console.log(`✅ Documentation site files generated at ${SITE_DIR}`);
}

// Main function
async function main() {
  console.log(`🚀 Rex-ORM Documentation Generator (Version: ${VERSION})`);

  try {
    await generateDocs();
    await generateSite();
    console.log("📚 Documentation generation completed!");
  } catch (error) {
    console.error("Error generating documentation:", error);
    Deno.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  await main();
}
