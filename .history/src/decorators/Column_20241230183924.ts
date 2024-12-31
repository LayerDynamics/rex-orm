import { Reflect } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    const existingColumns = Reflect.getMetadata("columns", target.constructor) || [];
    const type = Reflect.getMetadata("design:type", target, propertyKey)?.name?.toLowerCase() || "any";
    existingColumns.push({ 
      propertyKey, 
      options,
      type 
    });
    Reflect.defineMetadata("columns", existingColumns, target.constructor);
  };
}
