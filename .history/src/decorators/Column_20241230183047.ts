import { Reflect } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions) {
  return function(target: any, propertyKey: string | symbol) {
    const existingColumns = Reflect.getMetadata("columns", target.constructor) || [];
    existingColumns.push({
      propertyKey,
      options,
      type: options.type
    });
    Reflect.defineMetadata("columns", existingColumns, target.constructor);
  };
}
