import "https://deno.land/x/reflect_metadata/mod.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

interface EntityOptions {
  tableName: string;
}

export function Entity(options: EntityOptions) {
  return function (constructor: Function) {
    Reflect.defineMetadata("tableName", options.tableName, constructor);
    ModelRegistry.registerModel(constructor);
  };
}