import { Reflect } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

export interface EntityOptions {
  tableName: string;
}

export function Entity(options: EntityOptions): ClassDecorator {
  return (target: Function) => {
    // Initialize columns array if not exists
    if (!Reflect.hasMetadata("columns", target)) {
      Reflect.defineMetadata("columns", [], target);
    }
    Reflect.defineMetadata("tableName", options.tableName, target);
    ModelRegistry.registerModel(target as { new(...args: unknown[]): unknown });
    return target;
  };
}
