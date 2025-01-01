import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { Migration } from "../migration/MigrationRunner.ts";

const migration: Migration = {
  id: "001_create_users_table",
  up: async (adapter: DatabaseAdapter) => {
    const query = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL
      )
    `;
    await adapter.execute(query);
  },
  down: async (adapter: DatabaseAdapter) => {
    const query = `DROP TABLE IF EXISTS users`;
    await adapter.execute(query);
  },
};

export default migration;
