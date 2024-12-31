import { Column, ColumnOptions } from "./Column.ts";

export function PrimaryKey(options?: Partial<ColumnOptions>) {
  const defaultOptions: ColumnOptions = {
    type: "integer",
    unique: true,
    nullable: false,