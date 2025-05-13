import { Validate } from "./Validate.ts";

type ValidationFunction = (value: any) => boolean | string;

interface ValidateMultipleOptions {
  validators: ValidationFunction[];
}

export function ValidateMultiple(options: ValidateMultipleOptions) {
  return function (target: any, propertyKey: string) {
    options.validators.forEach((validator) => {
      Validate({ validator })(target, propertyKey);
    });
  };
}
