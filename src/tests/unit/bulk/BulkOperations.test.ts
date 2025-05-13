// src/tests/unit/bulk/BulkOperations.test.ts

import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { BulkOperations } from "../../../bulk/BulkOperations.ts";
import { MockDatabaseAdapter } from "../../mocks/MockDatabaseAdapter.ts";
import { BaseModel } from "../../../models/BaseModel.ts";
import { Column, Entity, PrimaryKey } from "../../../decorators/index.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";

// Example Bulk Operation Model
@Entity({ tableName: "bulk_users" })
class BulkUser {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  firstName!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  lastName!: string;

  @Column({ type: "varchar", length: 150, unique: true, nullable: false })
  email!: string;
}

// Register the model before tests
ModelRegistry.registerModel(BulkUser);

@Entity({ tableName: "test_users" })
class TestUser extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;
}

Deno.test("BulkOperations handles bulkInsert correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const bulkOps = new BulkOperations(adapter);

  const users = [
    Object.assign(new TestUser(), {
      name: "Alice",
      email: "alice@example.com",
    }),
    Object.assign(new TestUser(), { name: "Bob", email: "bob@example.com" }),
  ];

  const result = await bulkOps.bulkInsert(users, { ignoreDuplicates: true });

  assertEquals(result.inserted, 1); // The mock adapter returns 1 by default
  assertEquals(result.updated, 0);
  assertEquals(result.deleted, 0);

  // Verify the correct query was executed
  assertEquals(adapter.executedQueries.length, 1);

  // Instead of checking the exact query, let's check that it contains
  // the correct table name, column names, and VALUES pattern
  const query = adapter.executedQueries[0].query.replace(/\s+/g, " ").trim();
  assertEquals(query.includes("INSERT INTO test_users"), true);
  assertEquals(query.includes("name, email"), true);
  assertEquals(query.includes("VALUES"), true);
  assertEquals(query.includes("ON CONFLICT DO NOTHING"), true);

  // Make sure it does NOT include internal properties
  assertEquals(query.includes("_isNew"), false);
  assertEquals(query.includes("_isDirty"), false);
  assertEquals(query.includes("_originalValues"), false);
});

Deno.test("BulkOperations handles bulkUpdate correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const bulkOps = new BulkOperations(adapter);

  const users = [
    Object.assign(new TestUser(), {
      id: 1,
      name: "Alice Updated",
      email: "alice_new@example.com",
    }),
    Object.assign(new TestUser(), {
      id: 2,
      name: "Bob Updated",
      email: "bob_new@example.com",
    }),
  ];

  const result = await bulkOps.bulkUpdate(users);

  assertEquals(result.updated, 2);
  assertEquals(result.inserted, 0);
  assertEquals(result.deleted, 0);
});

Deno.test("BulkOperations handles bulkDelete correctly", async () => {
  const adapter = new MockDatabaseAdapter();
  const bulkOps = new BulkOperations(adapter);

  const users = [
    Object.assign(new TestUser(), { id: 1 }),
    Object.assign(new TestUser(), { id: 2 }),
  ];

  const result = await bulkOps.bulkDelete(users);

  assertEquals(result.deleted, 1); // Change from rowsAffected to deleted
  assertEquals(result.inserted, 0);
  assertEquals(result.updated, 0);

  assertEquals(adapter.executedQueries.length, 1);
  const expectedSQL = `
    DELETE FROM test_users
    WHERE id IN ($1, $2);`.trim();
  assertEquals(
    adapter.executedQueries[0].query.replace(/\s+/g, " ").trim(),
    expectedSQL.replace(/\s+/g, " ").trim(),
  );
});
