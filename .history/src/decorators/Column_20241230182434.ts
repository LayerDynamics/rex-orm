import { Reflect } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions): PropertyDecorator {
  return function(target: Object, propertyKey: string | symbol): void {
    const columns = Reflect.getMetadata("columns", target.constructor) || [];
    columns.push({
      propertyKey,
      options,
      type: options.type
    });
    Reflect.defineMetadata("columns", columns, target.constructor);
  };