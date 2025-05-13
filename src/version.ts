// Rex-ORM Version Information
// This file is automatically updated by release scripts

/**
 * The current version of Rex-ORM
 */
export const VERSION = "0.1.1";

/**
 * Release date of the current version
 */
export const RELEASE_DATE = "2025-05-13";

/**
 * Version metadata and compatibility information
 */
export const VERSION_INFO = {
  deno: {
    minVersion: "1.34.0",
    compatible: true,
  },
  databases: {
    postgresql: "12+",
    sqlite: "3.38+",
  },
  unstableFeatures: [
    "kv-cache", // Uses Deno's unstable KV API
  ],
};

/**
 * Check if the current version is compatible with the specified Deno version
 * @param denoVersion The Deno version to check against
 * @returns True if compatible, false otherwise
 */
export function isCompatibleWithDeno(denoVersion: string): boolean {
  const minVerParts = VERSION_INFO.deno.minVersion.split(".").map(Number);
  const currentVerParts = denoVersion.split(".").map(Number);

  for (let i = 0; i < minVerParts.length; i++) {
    if (currentVerParts[i] > minVerParts[i]) return true;
    if (currentVerParts[i] < minVerParts[i]) return false;
  }

  return true;
}
