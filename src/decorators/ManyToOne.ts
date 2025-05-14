import { defineMetadata, getMetadata } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

type Constructor<T = unknown> = { new (...args: unknown[]): T };

interface ManyToOneOptions {
  target: () => string;
  inverse: (object: unknown) => unknown;
}

// Fix the signature to accept options object instead of separate parameters
export function ManyToOne(options: ManyToOneOptions): PropertyDecorator;
export function ManyToOne(
  targetClass: () => unknown,
  propertyName: string,
  options: ManyToOneOptions,
): PropertyDecorator;
export function ManyToOne(
  optionsOrTargetClass: ManyToOneOptions | (() => unknown),
  propertyName?: string,
  options?: ManyToOneOptions,
): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    if (!getMetadata("relations", target.constructor)) {
      defineMetadata("relations", [], target.constructor);
    }

    const relations = getMetadata("relations", target.constructor) as Array<Record<string, unknown>>;
    let metadata;

    // Handle both forms of invocation
    if (typeof optionsOrTargetClass === "function" && propertyName && options) {
      // Old style: ManyToOne(targetClass, propertyName, options)
      metadata = {
        type: "ManyToOne",
        targetName: options.target(),
        inverse: options.inverse,
        propertyKey,
      };
    } else {
      // New style: ManyToOne(options)
      const opts = optionsOrTargetClass as ManyToOneOptions;
      metadata = {
        type: "ManyToOne",
        targetName: opts.target(),
        inverse: opts.inverse,
        propertyKey,
      };
    }

    relations.push(metadata);
    defineMetadata("relations", relations, target.constructor);
    ModelRegistry.registerRelation(target.constructor as unknown as Constructor, metadata);
  };
}
