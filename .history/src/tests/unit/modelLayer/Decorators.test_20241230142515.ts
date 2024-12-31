import { assertEquals, assertThrows } from "../../../deps.ts";
import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";

// Example Models for Testing
@Entity({ tableName: "test_users" })
class TestUser {
  @PrimaryKey()
  id: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 150, unique: true, nullable: false })
  email: string;
}

Deno.test("Decorators correctly register model and columns", () => {