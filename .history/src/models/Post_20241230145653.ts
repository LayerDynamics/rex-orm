import { Entity } from "../decorators/Entity.ts";
import { PrimaryKey } from "../decorators/PrimaryKey.ts";
import { Column } from "../decorators/Column.ts";
import { BaseModel } from "./BaseModel.ts";

@Entity({ tableName: "posts" })
export class Post extends BaseModel {
  @PrimaryKey()
  id!: number;
  id: number;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "text", nullable: false })
  content: string;

  @Column({ type: "integer", nullable: false })
  userId: number; // Foreign key to users table

  // Relationships will be added in future sprints
}