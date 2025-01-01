import { Post } from "../models/Post.ts";

export interface IUser {
  id: number;
  name: string;
  email: string;
  posts: Post[];
}
