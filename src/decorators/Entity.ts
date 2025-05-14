import "reflect-metadata";
import { ModelRegistry as _ModelRegistry } from "../models/ModelRegistry.ts";

export interface EntityOptions {
  name?: string;
  tableName?: string;
}

interface EntityMetadata {
  tableName?: string;
}

// Define a more specific type for class constructors
type EntityConstructor = abstract new (...args: unknown[]) => object;

const entityMetadataMap = new Map<EntityConstructor, EntityMetadata>();

export function Entity(options: EntityMetadata = {}) {
  return function (target: EntityConstructor) {
    entityMetadataMap.set(target, options);
    Reflect.defineMetadata("tableName", options.tableName, target);
  };
}

export function getEntityMetadata(
  target: EntityConstructor,
): EntityMetadata | undefined {
  return entityMetadataMap.get(target);
}
