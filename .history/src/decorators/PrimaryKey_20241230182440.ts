import type { ColumnOptions } from "./Column.ts";
import { Column } from "./Column.ts";

export function PrimaryKey(options: Partial<ColumnOptions> = {}): PropertyDecorator {
  const defaultOptions: ColumnOptions = {
    type: "integer",
    unique: true,
    nullable: false,
    primaryKey: true,
    ...options
  };
  return Column(defaultOptions);
}
