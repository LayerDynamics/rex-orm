
import { DatabaseFactory } from "../src/factory/DatabaseFactory.ts";
import { DatabaseAdapter } from "../src/interfaces/DatabaseAdapter.ts";

const config = {
  database: "sqlite",
  databasePath: ":memory:",
};

const adapter: DatabaseAdapter = DatabaseFactory.createAdapter(config);

const run = async () => {
  await adapter.connect();
  await adapter.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)");
  await adapter.execute("INSERT INTO test (value) VALUES (?)", ["Hello, Rex-ORM!"]);
  const result = await adapter.execute("SELECT * FROM test");
  console.log(result.rows);
  await adapter.disconnect();
};

run();