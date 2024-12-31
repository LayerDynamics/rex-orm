import "https://deno.land/x/reflect_metadata/mod.ts";

interface ColumnMetadata {
  propertyKey: string;
  options: any;
}

interface RelationMetadata {
  type: string;
  target: Function;
  inverse: (object: any) => any;
}

interface ModelMetadata {
  tableName: string;
  columns: ColumnMetadata[];
  primaryKey: string;
  relations: RelationMetadata[];
}

export class ModelRegistry {
  private static models: Map<Function, ModelMetadata> = new Map();
