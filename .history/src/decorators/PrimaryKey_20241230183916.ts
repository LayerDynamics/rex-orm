import { Column } from "./Column.ts";

export function PrimaryKey() {
  return Column({
    type: "integer",
    primaryKey: true,
    nullable: false
  });
}
