
import { assertEquals, assertThrows } from "../../../deps.ts";
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