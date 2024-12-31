import { Column } from "./Column.ts";
import type { ColumnOptions } from "./Column.ts";

export function PrimaryKey(options: Partial<ColumnOptions> = {}) {
  const defaultOptions: ColumnOptions = {
    type: "integer",
    unique: true,
    nullable: false,
    primaryKey: true,
    ...options,
  };
  return function(target: any, propertyKey: string | symbol) {
    return Column(defaultOptions)(target, propertyKey);
  };
}
