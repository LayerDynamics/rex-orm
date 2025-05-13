import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";

export interface EntityOptions {
  name?: string;
  tableName?: string;
}

interface EntityMetadata {
  tableName?: string;
}

const entityMetadataMap = new Map<Function, EntityMetadata>();

export function Entity(options: EntityMetadata = {}) {
  return function (target: Function) {
    entityMetadataMap.set(target, options);
    Reflect.defineMetadata("tableName", options.tableName, target);
  };
}

export function getEntityMetadata(
  target: Function,
): EntityMetadata | undefined {
  return entityMetadataMap.get(target);
}
