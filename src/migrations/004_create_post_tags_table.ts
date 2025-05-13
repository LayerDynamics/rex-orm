// src/migrations/004_create_post_tags_table.ts

import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { Migration } from "../migration/MigrationRunner.ts";

const migration: Migration = {
  id: "004_create_post_tags_table",
  up: async (adapter: DatabaseAdapter) => {
    const query = `
      CREATE TABLE post_tags (
        post_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (post_id, tag_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `;
    await adapter.execute(query);
  },
  down: async (adapter: DatabaseAdapter) => {
    const query = `DROP TABLE IF EXISTS post_tags`;
    await adapter.execute(query);
  },
};

export default migration;
