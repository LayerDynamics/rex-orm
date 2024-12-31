import { Reflect } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  nullable?: boolean;
  unique?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const columns = Reflect.getMetadata("columns", target.constructor) || [];
    columns.push({
      propertyKey,
      options,
      type: options.type
    });
    Reflect.defineMetadata("columns", columns, target.constructor);
  };
}
