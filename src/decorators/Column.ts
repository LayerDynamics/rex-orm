import "reflect-metadata";

export interface ColumnOptions {
  type?: string;
  name?: string;
  length?: number;
  nullable?: boolean;
  unique?: boolean;
  primaryKey?: boolean;
}

export function Column(options: ColumnOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const columns = Reflect.getMetadata("columns", target.constructor) || [];

    // Infer the type from the property if not explicitly provided
    const propertyType = Reflect.getMetadata(
      "design:type",
      target,
      propertyKey,
    );
    const type = options.type || getTypeFromMetadata(propertyType);

    columns.push({
      propertyKey,
      options,
      type,
      name: options.name || String(propertyKey),
    });

    Reflect.defineMetadata("columns", columns, target.constructor);
  };
}

// Helper function to convert TypeScript types to database column types
function getTypeFromMetadata(type: unknown): string {
  if (!type) return "TEXT";

  const typeName = (type as { name?: string }).name?.toLowerCase();
  switch (typeName) {
    case "number":
      return "NUMERIC";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "TIMESTAMP";
    case "string":
    default:
      return "TEXT";
  }
}
