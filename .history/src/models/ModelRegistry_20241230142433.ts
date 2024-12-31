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

  static registerModel(model: Function) {
    const tableName = Reflect.getMetadata("tableName", model);
    if (!tableName) {
      throw new Error(`Model ${model.name} is missing @Entity decorator with tableName.`);
    }
    const columns: ColumnMetadata[] = Reflect.getMetadata("columns", model) || [];
    if (columns.length === 0) {