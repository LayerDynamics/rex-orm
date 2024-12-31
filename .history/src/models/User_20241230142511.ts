
import { Entity } from "../decorators/Entity.ts";
import { PrimaryKey } from "../decorators/PrimaryKey.ts";
import { Column } from "../decorators/Column.ts";
import { BaseModel } from "./BaseModel.ts";

@Entity({ tableName: "users" })
export class User extends BaseModel {
  @PrimaryKey()
  id: number;

  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: false })