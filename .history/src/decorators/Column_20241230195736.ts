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
    const columns = ReflectMetadata.getMetadata("columns", target.constructor) || [];
    columns.push({
      propertyKey,
      options,
      type: options.type
    });
    ReflectMetadata.defineMetadata("columns", columns, target.constructor);
  };
}
