// src/tests/models/TestUser.ts

import { Entity } from "../../decorators/Entity.ts";
import { Column } from "../../decorators/Column.ts";
import { PrimaryKey } from "../../decorators/PrimaryKey.ts";
import { BaseModel } from "../../models/BaseModel.ts";

@Entity({ tableName: "users" })
export class TestUser extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  constructor() {
    super();
    this.id = 0;
    this.name = "";
    this.email = "";
  }
}
