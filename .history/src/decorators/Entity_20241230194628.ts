import { ReflectMetadata } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

export interface EntityOptions {
  tableName: string;
}

export function Entity(options: EntityOptions) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    // Initialize columns array if not exists
    if (!ReflectMetadata.hasMetadata("columns", target)) {
      ReflectMetadata.defineMetadata("columns", [], target);
    }
    ReflectMetadata.defineMetadata("tableName", options.tableName, target);
    ModelRegistry.registerModel(target);
    return target;
  };
}
