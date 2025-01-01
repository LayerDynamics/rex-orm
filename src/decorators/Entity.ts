import { defineMetadata, hasMetadata } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

export interface EntityOptions {
  name?: string;
  tableName?: string;
}

export function Entity(options: EntityOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    // Initialize columns array if not exists
    if (!hasMetadata("columns", target)) {
      defineMetadata("columns", [], target);
    }
    defineMetadata("tableName", options.tableName, target);
    ModelRegistry.registerModel(target);
    return target;
  };
}
