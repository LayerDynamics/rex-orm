import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";

type Constructor<T = unknown> = { new (...args: unknown[]): T };

interface ManyToManyOptions {
  target: () => Constructor;
  inverse: (object: unknown) => unknown;
  joinTable?: string;
}

export function ManyToMany(options: ManyToManyOptions) {
  return function (target: object, propertyKey: string) {
    if (!Reflect.hasMetadata("relations", target.constructor)) {
      Reflect.defineMetadata("relations", [], target.constructor);
    }
    const relations = Reflect.getMetadata(
      "relations",
      target.constructor,
    ) as unknown[];
    const metadata = {
      type: "ManyToMany",
      target: options.target(),
      targetName: options.target().name,
      inverse: options.inverse,
      joinTable: options.joinTable,
      propertyKey,
    };
    relations.push(metadata);
    Reflect.defineMetadata("relations", relations, target.constructor);
    ModelRegistry.registerRelation(target.constructor, metadata);
  };
}
