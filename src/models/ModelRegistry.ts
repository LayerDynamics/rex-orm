import "reflect-metadata";
import { ColumnOptions } from "../decorators/Column.ts";
import { getEntityMetadata } from "../decorators/Entity.ts";

type Constructor<T = unknown> = { new (...args: unknown[]): T };

// Update type definitions to be generic
type ValidatorFunction<T = unknown> = (value: T) => boolean | string;
type ValidationMap = { [key: string]: ValidatorFunction<unknown>[] };

export interface ColumnMetadata {
  propertyKey: string;
  options: ColumnOptions;
  type?: string;
}

interface RelationMetadata {
  type: string;
  targetName: string;
  inverse: (object: unknown) => unknown;
  joinTable?: string;
  propertyKey: string;
}

interface ModelMetadata {
  tableName: string;
  columns: ColumnMetadata[];
  primaryKey: string;
  relations: RelationMetadata[];
  validations: ValidationMap;
  features?: Set<string>; // Added for enterprise features
}

export class ModelRegistry {
  private static models: Map<Constructor, ModelMetadata> = new Map();
  private static pendingRelations: Map<string, RelationMetadata[]> = new Map();
  private static pendingValidations: Map<
    string,
    Array<{
      propertyKey: string;
      validator: ValidatorFunction<unknown>;
    }>
  > = new Map();
  private static registeredModels: Map<string, Constructor> = new Map();
  private static fieldFeatures: Map<Constructor, Map<string, Set<string>>> =
    new Map();

  static registerModel(model: Constructor) {
    const entityMetadata = getEntityMetadata(model);
    const tableName = entityMetadata?.tableName;
    if (!tableName) {
      throw new Error(
        `Model ${model.name} is missing @Entity decorator with tableName.`,
      );
    }
    const columns: ColumnMetadata[] = Reflect.getMetadata("columns", model) ||
      [];
    if (columns.length === 0) {
      throw new Error(`Model ${model.name} has no columns defined.`);
    }

    const primaryKeyColumn = columns.find((col) => col.options.primaryKey);
    if (!primaryKeyColumn) {
      throw new Error(
        `Model ${model.name} does not have a primary key defined.`,
      );
    }

    const relations: RelationMetadata[] =
      Reflect.getMetadata("relations", model.prototype) || [];
    const validations: ValidationMap = {};

    const modelMetadata = {
      tableName,
      columns,
      primaryKey: primaryKeyColumn.propertyKey,
      relations,
      validations,
    };

    this.models.set(model, modelMetadata);

    // Process any pending relations for this model
    const pending = this.pendingRelations.get(model.name);
    if (pending) {
      pending.forEach((relation) => {
        modelMetadata.relations.push(relation);
      });
      this.pendingRelations.delete(model.name);
    }

    // Process any pending validations for this model
    const pendingValidations = this.pendingValidations.get(model.name);
    if (pendingValidations) {
      pendingValidations.forEach(({ propertyKey, validator }) => {
        if (!modelMetadata.validations[propertyKey]) {
          modelMetadata.validations[propertyKey] = [];
        }
        modelMetadata.validations[propertyKey].push(validator);
      });
      this.pendingValidations.delete(model.name);
    }
  }

  static registerRelation(model: Constructor, relation: RelationMetadata) {
    const metadata = this.models.get(model);
    if (!metadata) {
      // Store relation as pending if model not yet registered
      if (!this.pendingRelations.has(model.name)) {
        this.pendingRelations.set(model.name, []);
      }
      this.pendingRelations.get(model.name)!.push(relation);
      return;
    }
    metadata.relations.push(relation);
  }

  static registerValidation<T>(
    model: Constructor,
    propertyKey: string,
    validator: ValidatorFunction<T>,
  ) {
    const metadata = this.models.get(model);
    if (!metadata) {
      // Store validation as pending if model not yet registered
      const modelName = model.name;
      if (!this.pendingValidations.has(modelName)) {
        this.pendingValidations.set(modelName, []);
      }
      this.pendingValidations.get(modelName)!.push({
        propertyKey,
        validator: validator as ValidatorFunction<unknown>,
      });
      return;
    }
    if (!metadata.validations[propertyKey]) {
      metadata.validations[propertyKey] = [];
    }
    metadata.validations[propertyKey].push(
      validator as ValidatorFunction<unknown>,
    );
  }

  static getModelMetadata(model: Constructor): ModelMetadata {
    const metadata = this.models.get(model);
    if (!metadata) {
      throw new Error(`Model ${model.name} is not registered.`);
    }
    return metadata;
  }

  static getAllModels(): Constructor[] {
    return Array.from(this.models.keys());
  }

  static resolveTarget(targetName: string): Constructor {
    for (const [constructor] of this.models.entries()) {
      if (constructor.name === targetName) {
        return constructor;
      }
    }
    throw new Error(`Could not resolve target class: ${targetName}`);
  }

  static registerModels(...models: Constructor[]) {
    for (const model of models) {
      this.registerModel(model);
    }
  }

  static clear(): void {
    this.models.clear();
    this.pendingRelations.clear();
    this.pendingValidations.clear();
    this.registeredModels.clear();
    this.fieldFeatures.clear();
  }

  static getRegisteredModels(): Map<string, Constructor> {
    return this.registeredModels;
  }

  static hasModel(modelName: string): boolean {
    // Check if any registered model has this name
    for (const [constructor] of this.models.entries()) {
      if (constructor.name === modelName) {
        return true;
      }
    }
    // Also check in the registeredModels map
    return this.registeredModels.has(modelName);
  }

  /**
   * Registers a model-level feature
   * @param model The model constructor
   * @param feature The feature name
   */
  static registerFeature(model: Constructor, feature: string): void {
    const metadata = this.models.get(model);
    if (!metadata) {
      // If model isn't registered yet, we'll register it when the model is registered
      // Just log a warning for now
      console.warn(
        `Attempting to register feature ${feature} for unregistered model ${model.name}`,
      );
      return;
    }

    if (!metadata.features) {
      metadata.features = new Set<string>();
    }

    metadata.features.add(feature);
  }

  /**
   * Registers a field-level feature
   * @param model The model constructor
   * @param propertyKey The field name
   * @param feature The feature name
   */
  static registerFieldFeature(
    model: Constructor,
    propertyKey: string,
    feature: string,
  ): void {
    if (!this.fieldFeatures.has(model)) {
      this.fieldFeatures.set(model, new Map<string, Set<string>>());
    }

    const modelFeatures = this.fieldFeatures.get(model)!;

    if (!modelFeatures.has(propertyKey)) {
      modelFeatures.set(propertyKey, new Set<string>());
    }

    modelFeatures.get(propertyKey)!.add(feature);
  }

  /**
   * Checks if a model has a specific feature
   * @param model The model constructor
   * @param feature The feature name
   * @returns Boolean indicating if the feature is enabled
   */
  static hasFeature(model: Constructor, feature: string): boolean {
    const metadata = this.models.get(model);
    return metadata?.features?.has(feature) || false;
  }

  /**
   * Checks if a field has a specific feature
   * @param model The model constructor
   * @param propertyKey The field name
   * @param feature The feature name
   * @returns Boolean indicating if the feature is enabled
   */
  static hasFieldFeature(
    model: Constructor,
    propertyKey: string,
    feature: string,
  ): boolean {
    const modelFeatures = this.fieldFeatures.get(model);
    if (!modelFeatures) return false;

    const fieldFeatures = modelFeatures.get(propertyKey);
    return fieldFeatures?.has(feature) || false;
  }

  /**
   * Gets all features enabled for a model
   * @param model The model constructor
   * @returns Set of feature names
   */
  static getFeatures(model: Constructor): Set<string> {
    const metadata = this.models.get(model);
    return metadata?.features || new Set<string>();
  }

  /**
   * Gets all features enabled for a specific field
   * @param model The model constructor
   * @param propertyKey The field name
   * @returns Set of feature names
   */
  static getFieldFeatures(
    model: Constructor,
    propertyKey: string,
  ): Set<string> {
    const modelFeatures = this.fieldFeatures.get(model);
    if (!modelFeatures) return new Set<string>();

    return modelFeatures.get(propertyKey) || new Set<string>();
  }
}
