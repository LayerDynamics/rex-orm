import "https://deno.land/x/reflect_metadata@0.1.13/mod.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
}

export function Column(options: ColumnOptions) {
  return function (target: any, propertyKey: string) {
    if (!Reflect.hasMetadata("columns", target.constructor)) {
      Reflect.defineMetadata("columns", [], target.constructor);
    }
    const columns = Reflect.getMetadata("columns", target.constructor) as any[];
    columns.push({ propertyKey, options });
    Reflect.defineMetadata("columns", columns, target.constructor);
  };
}
