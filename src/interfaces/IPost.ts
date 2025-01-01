import { User } from "../models/User.ts";

export interface IPost {
  id: number;
  title: string;
  content: string;
  userId: number;
  user: User;
}
