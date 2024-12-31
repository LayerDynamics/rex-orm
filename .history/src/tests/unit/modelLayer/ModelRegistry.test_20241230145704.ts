import { Entity } from "../../../decorators/Entity.ts";
import { Column } from "../../../decorators/Column.ts";
import { PrimaryKey } from "../../../decorators/PrimaryKey.ts";
import "https://deno.land/x/reflect_metadata@0.1.13/mod.ts";

@Entity({ tableName: "registry_test_users" })
class RegistryTestUser {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 100 })
  username!: string;
}

// ... test implementations as provided in the prompt ...
