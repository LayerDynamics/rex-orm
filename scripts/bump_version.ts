#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Rex-ORM Version Manager
 *
 * This script updates version information across the project, including:
 * - src/version.ts
 * - deno.json (if needed)
 * - README.md
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env scripts/bump_version.ts [patch|minor|major]
 */

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

// Import current version
import { VERSION } from "../src/version.ts";

// Versioning types
type VersionType = "patch" | "minor" | "major";

// Function to get formatted date
function getFormattedDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Function to parse version
function parseVersion(
  version: string,
): { major: number; minor: number; patch: number } {
  const parts = version.split(".").map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

// Function to bump version
function bumpVersion(version: string, type: VersionType): string {
  const { major, minor, patch } = parseVersion(version);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }
}

// Function to update version.ts
async function updateVersionFile(
  newVersion: string,
  releaseDate: string,
): Promise<void> {
  const versionFilePath = join(Deno.cwd(), "src", "version.ts");
  const content = await Deno.readTextFile(versionFilePath);

  const updatedContent = content
    .replace(
      /export const VERSION = "([^"]+)";/,
      `export const VERSION = "${newVersion}";`,
    )
    .replace(
      /export const RELEASE_DATE = "([^"]+)";/,
      `export const RELEASE_DATE = "${releaseDate}";`,
    );

  await Deno.writeTextFile(versionFilePath, updatedContent);
  console.log(`✅ Updated version.ts to ${newVersion} (${releaseDate})`);
}

// Function to update README.md
async function updateReadme(newVersion: string): Promise<void> {
  const readmePath = join(Deno.cwd(), "README.md");
  let content = await Deno.readTextFile(readmePath);

  // Update version mentions in README
  if (content.includes(VERSION)) {
    content = content.replaceAll(VERSION, newVersion);
    await Deno.writeTextFile(readmePath, content);
    console.log(`✅ Updated README.md version references`);
  } else {
    console.log(`ℹ️ No version references found in README.md`);
  }
}

// Main function
async function main(): Promise<void> {
  // Get version bump type from args
  const versionType: VersionType = (Deno.args[0] as VersionType) || "patch";
  if (!["patch", "minor", "major"].includes(versionType)) {
    console.error("Invalid version type. Use: patch, minor, or major");
    Deno.exit(1);
  }

  // Get current version
  console.log(`Current version: ${VERSION}`);

  // Calculate new version
  const newVersion = bumpVersion(VERSION, versionType);
  const releaseDate = getFormattedDate();

  console.log(`Bumping ${versionType} version to: ${newVersion}`);
  console.log(`Release date: ${releaseDate}`);

  // Confirm with user
  console.log("\nReady to update files with the new version information.");
  console.log("Press Ctrl+C to cancel, or Enter to continue...");
  
  // Create a buffer for reading input
  const buffer = new Uint8Array(1);
  await Deno.stdin.read(buffer);
  await new TextDecoder().decode(buffer);

  try {
    // Update version.ts
    await updateVersionFile(newVersion, releaseDate);

    // Update README.md
    await updateReadme(newVersion);

    console.log(`\n🚀 Version successfully bumped to ${newVersion}`);
    console.log(`\nRemember to commit these changes with:`);
    console.log(`git commit -am "chore: bump version to ${newVersion}"`);
  } catch (error) {
    console.error(
      `Error updating version: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    Deno.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  await main();
}
