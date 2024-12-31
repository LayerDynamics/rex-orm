export interface BaseDBConfig {
  database: "postgres" | "sqlite";
  poolSize?: number;