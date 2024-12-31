import { Column } from "./Column.ts";
import type { ColumnOptions } from "./Column.ts";

export function PrimaryKey(options: Partial<ColumnOptions> = {}) {
  const defaultOptions: ColumnOptions = {
    type: "integer",
    unique: true,
    nullable: false,
    ...options,
  };
  return Column({ ...defaultOptions, primaryKey: true });
}
