import { Column } from "./Column.ts";

export function PrimaryKey(): PropertyDecorator {
  return Column({
    type: "integer",
    nullable: false,
    primaryKey: true
  });
}
