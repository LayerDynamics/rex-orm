import { defineMetadata, getMetadata } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

type Constructor<T = any> = { new(...args: any[]): T };

interface ManyToOneOptions {
  target: () => string;
  inverse: (object: any) => any;
}

export function ManyToOne(options: ManyToOneOptions) {
  return function (target: any, propertyKey: string) {
    if (!getMetadata("relations", target.constructor)) {
      defineMetadata("relations", [], target.constructor);
    }
    const relations = getMetadata("relations", target.constructor) as any[];
    const metadata = {
      type: "ManyToOne",
      targetName: options.target(),
      inverse: options.inverse,
      propertyKey,
    };
    relations.push(metadata);
    defineMetadata("relations", relations, target.constructor);
    ModelRegistry.registerRelation(target.constructor, metadata);
  };
}
