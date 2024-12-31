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
    const constructor = target.constructor;
    const existingColumns = Reflect.getMetadata("columns", constructor) || [];
    const type = Reflect.getMetadata("design:type", target, propertyKey)?.name?.toLowerCase() || options.type;
    
    existingColumns.push({
      propertyKey,
      options,
      type
    });
    
    Reflect.defineMetadata("columns", constructor, existingColumns);
  };
}
