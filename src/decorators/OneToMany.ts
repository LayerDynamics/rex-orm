import "reflect-metadata";
import { defineMetadata, getMetadata } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

type Constructor<T = any> = { new (...args: any[]): T };

interface OneToManyOptions {
  target: () => string;
  inverse: (object: any) => any;
}

export function OneToMany(p0: () => typeof Post, p1: string, options: OneToManyOptions) {
  return function (target: any, propertyKey: string) {
    if (!Reflect.hasMetadata("relations", target.constructor)) {
      Reflect.defineMetadata("relations", [], target.constructor);
    }
    const relations = Reflect.getMetadata(
      "relations",
      target.constructor,
    ) as any[];
    const metadata = {
      type: "OneToMany",
      targetName: options.target(),
      inverse: options.inverse,
      propertyKey,
    };
    relations.push(metadata);
    Reflect.defineMetadata("relations", relations, target.constructor);
    ModelRegistry.registerRelation(target.constructor, metadata);
  };
}
