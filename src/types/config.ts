export interface TestConfig {
  [key: string]: unknown; // This makes the interface accept any string keys
  database: string; // Required properties
  databasePath: string; // Required properties
}
