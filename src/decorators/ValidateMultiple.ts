import { Validate } from "./Validate.ts";

type ValidationFunction = (value: unknown) => boolean | string;

interface ValidateMultipleOptions {
  validators: ValidationFunction[];
}

export function ValidateMultiple(options: ValidateMultipleOptions) {
  return function (target: object, propertyKey: string) {
    options.validators.forEach((validator) => {
      Validate({ validator })(target, propertyKey);
    });
  };
}
