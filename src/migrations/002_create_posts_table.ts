// src/migrations/002_create_posts_table.ts
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { Migration } from "../migration/MigrationRunner.ts";

const migration: Migration = {
  id: "002_create_posts_table",
  up: async (adapter: DatabaseAdapter) => {
    const query = `
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await adapter.execute(query);
  },
  down: async (adapter: DatabaseAdapter) => {
    const query = `DROP TABLE IF EXISTS posts`;
    await adapter.execute(query);
  },
};

export default migration;
