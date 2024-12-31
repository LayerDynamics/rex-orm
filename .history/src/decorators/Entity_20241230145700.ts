import "https://deno.land/x/reflect_metadata@0.1.13/mod.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

interface EntityOptions {
  tableName: string;
}

export function Entity(options: EntityOptions) {
  return function <T extends { new(...args: unknown[]): object }>(constructor: T) {
    Reflect.defineMetadata("tableName", options.tableName, constructor);
    ModelRegistry.registerModel(constructor);
  };
}
