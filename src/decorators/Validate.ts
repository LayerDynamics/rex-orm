import { defineMetadata, getMetadata } from "../deps.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";

type ValidationFunction = (value: any) => boolean | string;

interface ValidateOptions {
  validator: ValidationFunction;
  message?: string;
}

export function Validate(options: ValidateOptions) {
  return function (target: any, propertyKey: string) {
    if (!getMetadata("validations", target.constructor)) {
      defineMetadata("validations", {}, target.constructor);
    }
    const validations = getMetadata("validations", target.constructor) as {
      [key: string]: ValidationFunction[];
    };
    if (!validations[propertyKey]) {
      validations[propertyKey] = [];
    }
    validations[propertyKey].push(options.validator);
    defineMetadata("validations", validations, target.constructor);
    ModelRegistry.registerValidation(
      target.constructor,
      propertyKey,
      options.validator,
    );
  };
}
