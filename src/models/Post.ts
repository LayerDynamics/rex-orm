import { Entity } from "../decorators/Entity.ts";
import { PrimaryKey } from "../decorators/PrimaryKey.ts";
import { Column } from "../decorators/Column.ts";
import { ManyToOne } from "../decorators/ManyToOne.ts";
import { ValidateMultiple } from "../decorators/ValidateMultiple.ts";
import { Validate } from "../decorators/Validate.ts";
import { BaseModel } from "./BaseModel.ts";
import { User } from "./User.ts";
import type { IPost } from "../interfaces/IPost.ts";

@Entity({ tableName: "posts" })
export class Post extends BaseModel implements IPost {
  @PrimaryKey()
  override id: number = 0;

  @Column({ type: "varchar", length: 255, nullable: false })
  @ValidateMultiple({
    validators: [
      (value: string) => value.length >= 5 || "Title must be at least 5 characters long.",
      (value: string) => value.length <= 255 || "Title cannot exceed 255 characters.",
    ],
  })
  title!: string;

  @Column({ type: "text", nullable: false })
  @Validate({ validator: (value: string) => value.trim().length > 0 || "Content cannot be empty." })
  content!: string;

  @Column({ type: "integer", nullable: false })
  userId!: number;

  @ManyToOne({
    target: () => "User",
    inverse: (user: User) => user.posts
  })
  user!: User;
}