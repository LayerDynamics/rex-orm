import "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";

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
