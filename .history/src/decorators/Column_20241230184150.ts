import { Reflect } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions) {
  return function (target: any, propertyKey: string | symbol) {
    const constructor = target.constructor;
    const existingColumns = Reflect.getMetadata("columns", constructor) || [];
    const type = Reflect.getMetadata("design:type", target, propertyKey)?.name?.toLowerCase() || options.type;
    
    existingColumns.push({
      propertyKey,
      options,
      type
    });
    
    Reflect.defineMetadata("columns", existingColumns, constructor);
  };
}
