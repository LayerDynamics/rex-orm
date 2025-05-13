import { defineMetadata, getMetadata } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

type Constructor<T = unknown> = { new (...args: unknown[]): T };

interface OneToManyOptions {
  target: () => string;
  inverse: (object: unknown) => unknown;
}

// Change the signature to accept just options object
export function OneToMany(options: OneToManyOptions): PropertyDecorator;
export function OneToMany(
  targetClass: () => unknown,
  propertyName: string,
  options: OneToManyOptions,
): PropertyDecorator;
export function OneToMany(
  optionsOrTargetClass: OneToManyOptions|(() => unknown),
  propertyName?: string,
  options?: OneToManyOptions,
): PropertyDecorator {
  return function(target: object, _propertyKey: string|symbol) {
    if(!getMetadata("relations", target.constructor)) {
      defineMetadata("relations", [], target.constructor);
    }

    const relations = getMetadata(
      "relations",
      target.constructor,
    ) as Array<unknown>;

    let metadata: {
      type: string;
      targetName: string;
      inverse: (object: unknown) => unknown;
      propertyKey: string | symbol;
    };

    if(typeof optionsOrTargetClass === "function" && propertyName && options) {
      // Old style: OneToMany(targetClass, propertyName, options)
      metadata = {
        type: "OneToMany",
        targetName: options.target(),
        inverse: options.inverse,
        propertyKey: _propertyKey,
      };
    } else {
      // New style: OneToMany(options)
      const opts = optionsOrTargetClass as OneToManyOptions;
      metadata = {
        type: "OneToMany",
        targetName: opts.target(),
        inverse: opts.inverse,
        propertyKey: _propertyKey,
      };
    }

    relations.push(metadata);
    defineMetadata("relations", relations, target.constructor);
    ModelRegistry.registerRelation(target.constructor as Constructor<unknown>, metadata);
  };
}