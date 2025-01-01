// src/migrations/003_create_profiles_table.ts

import {DatabaseAdapter} from "../interfaces/DatabaseAdapter.ts";
import {Migration} from "../migration/MigrationRunner.ts";

const migration: Migration={
    id: "003_create_profiles_table",
    up: async (adapter: DatabaseAdapter) => {
        const query=`
      CREATE TABLE profiles (
        id SERIAL PRIMARY KEY,
        bio TEXT,
        user_id INTEGER UNIQUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
        await adapter.execute(query);
    },
    down: async (adapter: DatabaseAdapter) => {
        const query=`DROP TABLE IF EXISTS profiles`;
        await adapter.execute(query);
    },
};

export default migration;
