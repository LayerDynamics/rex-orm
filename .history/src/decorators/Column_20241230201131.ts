import { defineMetadata, getMetadata } from "../deps.ts";

export interface ColumnOptions {
  type: string;
  length?: number;
  nullable?: boolean;
  unique?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const columns = getMetadata("columns", target.constructor) || [];
    columns.push({
      propertyKey,
      options,
      type: options.type
    });
    defineMetadata("columns", columns, target.constructor);
  };
}
