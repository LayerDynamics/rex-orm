import { Entity } from "../decorators/Entity.ts";
import { PrimaryKey } from "../decorators/PrimaryKey.ts";
import { Column } from "../decorators/Column.ts";
import { OneToMany } from "../decorators/OneToMany.ts";
import { BaseModel } from "./BaseModel.ts";
import { Post } from "./Post.ts";
import type { IUser } from "../interfaces/IUser.ts";

@Entity({ tableName: "users" })
export class User extends BaseModel implements IUser {
  @PrimaryKey()
  override id: number = 0;

  @Column({ type: "varchar", length: 255, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: false })
  email!: string;

  @OneToMany({
    target: () => "Post",
    inverse: (post: Post) => post.user
  })
  posts!: Post[];

  // Relationships will be added in future sprints
}