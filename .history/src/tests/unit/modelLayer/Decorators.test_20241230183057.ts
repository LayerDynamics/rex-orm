import { assertEquals } from "../../../deps.ts";
import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";
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

Deno.test("Column decorator metadata", () => {
  const metadata = Reflect.getMetadata("columns", TestUser);
  assertEquals(metadata.length, 3);
  
  const idColumn = metadata[0];
  assertEquals(idColumn.options.type, "integer");
  assertEquals(idColumn.options.primaryKey, true);
  
  const nameColumn = metadata[1];
  assertEquals(nameColumn.options.type, "varchar");
  assertEquals(nameColumn.options.length, 100);
});

Deno.test("ModelRegistry should throw error for unregistered model", () => {
	class UnregisteredModel {}
	
	assertThrows(() => {
		ModelRegistry.getModelMetadata(UnregisteredModel);
	}, Error, "Model UnregisteredModel is not registered.");
});
