import { Reflect } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    const existingColumns = Reflect.getMetadata("columns", target.constructor) || [];
    existingColumns.push({
      propertyKey,
      options,
    });
    Reflect.defineMetadata("columns", existingColumns, target.constructor);
  };
}
