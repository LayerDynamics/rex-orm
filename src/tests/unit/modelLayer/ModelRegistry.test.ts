import { assertEquals, assertThrows } from "../../../deps.ts";
import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";
import "../../../deps.ts";

@Entity({ tableName: "registry_test_users" })
class RegistryTestUser {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 100 })
  username!: string;
}

Deno.test("ModelRegistry handles validation registration", () => {
  ModelRegistry.clear();
  const validator = (value: string) => value.length > 0;
  
  // Register validation before model
  ModelRegistry.registerValidation(RegistryTestUser, "username", validator);
  
  // Register model
  ModelRegistry.registerModel(RegistryTestUser);
  
  const metadata = ModelRegistry.getModelMetadata(RegistryTestUser);
  assertEquals(metadata.validations["username"].length, 1);
  assertEquals(metadata.validations["username"][0], validator);
});
