import { Column, Entity, OneToMany, PrimaryKey } from "../decorators/index.ts";
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
    inverse: (object: unknown) => (object as Post).user,
  })
  posts!: Post[];

  // Relationships will be added in future sprints
}
