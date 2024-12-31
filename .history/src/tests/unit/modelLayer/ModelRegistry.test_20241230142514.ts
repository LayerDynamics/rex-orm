import { assertEquals, assertThrows } from "../../../deps.ts";
import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";
import { ModelRegistry } from "../../../models/ModelRegistry.ts";

@Entity({ tableName: "registry_test_users" })
class RegistryTestUser {
  @PrimaryKey()
  id: number;

  @Column({ type: "varchar", length: 100 })
  username: string;
}

// ... test implementations as provided in the prompt ...
