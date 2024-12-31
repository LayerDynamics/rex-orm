import { assertEquals, assertThrows } from "../../../deps.ts";
import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";
import type { ColumnMetadata } from "../../../models/ModelRegistry.ts";
import "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";

// Example Models for Testing
@Entity({ tableName: "test_users" })
class TestUser {
  @PrimaryKey({})
  id!: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 150, unique: true, nullable: false })
  email!: string;
}

Deno.test("Decorators set correct metadata", () => {
  const metadata = Reflect.getMetadata("columns", TestUser);
  const columns = metadata as ColumnMetadata[];

  const idColumn = columns.find((c: ColumnMetadata) => c.propertyKey === "id");
  assertEquals(idColumn?.options.type, "integer");
  assertEquals(idColumn?.options.primaryKey, true);

  const nameColumn = columns.find((c: ColumnMetadata) => c.propertyKey === "name");
  assertEquals(nameColumn?.options.type, "varchar");
  assertEquals(nameColumn?.options.length, 100);
  assertEquals(nameColumn?.options.nullable, false);

  const emailColumn = columns.find((c: ColumnMetadata) => c.propertyKey === "email");
  assertEquals(emailColumn?.options.type, "varchar");
  assertEquals(emailColumn?.options.length, 150);
  assertEquals(emailColumn?.options.unique, true);
});

Deno.test("ModelRegistry should throw error for unregistered model", () => {
	class UnregisteredModel {}
	
	assertThrows(() => {
		ModelRegistry.getModelMetadata(UnregisteredModel);
	}, Error, "Model UnregisteredModel is not registered.");
});

Deno.test("Column decorator sets correct metadata", () => {
  const metadata = Reflect.getMetadata("columns", TestUser) as ColumnMetadata[];
  
  const idColumn = metadata.find((c: ColumnMetadata) => c.propertyKey === "id");
  assertEquals(idColumn?.options.type, "integer");
  
  const nameColumn = metadata.find((c: ColumnMetadata) => c.propertyKey === "name");
  assertEquals(nameColumn?.options.type, "varchar");
  
  const emailColumn = metadata.find((c: ColumnMetadata) => c.propertyKey === "email");
  assertEquals(emailColumn?.options.type, "varchar");
});
