import { assertEquals, assertThrows } from "../../../deps.ts";
import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";
import { ModelRegistry, ColumnMetadata } from "../../../models/ModelRegistry.ts";
import "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";

// Example Models for Testing
@Entity({ tableName: "test_users" })
class TestUser {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 150, unique: true, nullable: false })
  email!: string;
}

Deno.test("Decorators correctly register model and columns", () => {
	ModelRegistry.registerModel(TestUser);
	
	const metadata = ModelRegistry.getModelMetadata(TestUser);
	
	assertEquals(metadata.tableName, "test_users");
	assertEquals(metadata.columns.length, 3);
	
	const idColumn = metadata.columns.find(col => col.propertyKey === "id");
	assertEquals(idColumn?.type, "number");
	assertEquals(idColumn?.options.primaryKey, true);
	
	const nameColumn = metadata.columns.find(col => col.propertyKey === "name");
	assertEquals(nameColumn?.type, "varchar");
	assertEquals(nameColumn?.options.length, 100);
	assertEquals(nameColumn?.options.nullable, false);
	
	const emailColumn = metadata.columns.find(col => col.propertyKey === "email");
	assertEquals(emailColumn?.type, "varchar");
	assertEquals(emailColumn?.options.length, 150);
	assertEquals(emailColumn?.options.unique, true);
	assertEquals(emailColumn?.options.nullable, false);
});

Deno.test("ModelRegistry should throw error for unregistered model", () => {
	class UnregisteredModel {}
	
	assertThrows(() => {
		ModelRegistry.getModelMetadata(UnregisteredModel);
	}, Error, "Model UnregisteredModel is not registered.");
});

Deno.test("Column decorator sets correct metadata", () => {
  // ...existing code...
  const idColumn = columns.find(c => c.propertyKey === "id") as ColumnMetadata;
  assertEquals(idColumn?.options.type, "number");
  // ...existing code...
});
