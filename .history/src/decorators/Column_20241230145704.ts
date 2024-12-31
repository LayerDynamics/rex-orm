import "https://deno.land/x/reflect_metadata@0.1.13/mod.ts";

interface ColumnOptions {
  type: string;
  length?: number;
  unique?: boolean;
  nullable?: boolean;
}

export function Column(options: ColumnOptions) {
  return function (target: object, propertyKey: PropertyKey) {
    const columns = Reflect.getMetadata("columns", target.constructor) || [];
    columns.push({ propertyKey, options });
    Reflect.defineMetadata("columns", columns, target.constructor);
  };
}
