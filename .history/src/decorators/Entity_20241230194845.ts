import { Reflect } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

export interface EntityOptions {
  tableName: string;
}

export function Entity(options: EntityOptions) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    // Initialize columns array if not exists
    if (!Reflect.hasMetadata("columns", target)) {
      Reflect.defineMetadata("columns", [], target);
    }
    Reflect.defineMetadata("tableName", options.tableName, target);
    ModelRegistry.registerModel(target);
    return target;
  };
}
