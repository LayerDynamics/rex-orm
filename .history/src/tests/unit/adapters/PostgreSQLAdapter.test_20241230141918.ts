import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { PostgresAdapter } from "../../../adapters/PostgreSQLAdapter.ts";
import type { PostgresConfig } from "../../../interfaces/DatabaseConfig.ts";

const testConfig: PostgresConfig = {
  database: "postgres",
  user: "test_user",
  password: "test_pass",
  host: "localhost",
  port: 5432,