import "https://deno.land/x/reflect_metadata@v0.1.12-2/mod.ts";

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
      throw new Error(`Model ${model.name} has no columns defined.`);
    }

    const primaryKeyColumn = columns.find(col => col.options.primaryKey);
    if (!primaryKeyColumn) {
      throw new Error(`Model ${model.name} does not have a primary key defined.`);
    }

    const relations: RelationMetadata[] = Reflect.getMetadata("relations", model) || [];

    this.models.set(model, {
      tableName,
      columns,
      primaryKey: primaryKeyColumn.propertyKey,
      relations,
    });
  }

  static getModelMetadata(model: Function): ModelMetadata {
    const metadata = this.models.get(model);
    if (!metadata) {
      throw new Error(`Model ${model.name} is not registered.`);
    }
    return metadata;
  }

  static getAllModels(): Function[] {
    return Array.from(this.models.keys());
  }
}
