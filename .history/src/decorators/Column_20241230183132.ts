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
    let columns = Reflect.getMetadata("columns", target.constructor) || [];
    columns = [...columns, { propertyKey, options }];
    Reflect.defineMetadata("columns", columns, target.constructor);
  };
}
