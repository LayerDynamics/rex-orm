import { Reflect } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions) {
  return function (target: object, propertyKey: PropertyKey) {
    const columns = Reflect.getMetadata("columns", target.constructor) || [];
    columns.push({ propertyKey, options });
    Reflect.defineMetadata("columns", columns, target.constructor);
  };
}
