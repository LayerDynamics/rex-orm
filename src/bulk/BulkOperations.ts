import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { BulkOperationResult, BulkOptions } from "./types.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { getEntityMetadata } from "../decorators/Entity.ts";
// Import QueryParam type for database operations
import type { QueryParam } from "../interfaces/DatabaseAdapter.ts";

// Define a type for model properties as record of string keys with unknown values
type ModelRecord = Record<string, unknown>;

export class BulkOperations {
  private adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  private getTableName<T extends BaseModel>(model: T): string {
    const metadata = getEntityMetadata(model.constructor);
    return metadata?.tableName || model.constructor.name.toLowerCase() + "s";
  }

  /**
   * Converts a camelCase string to snake_case
   * @param key The string to convert
   * @returns The snake_case representation
   */
  private toSnakeCase(key: string): string {
    return key.replace(/([A-Z])/g, "_$1").toLowerCase();
  }

  /**
   * Converts an unknown value to a database-compatible QueryParam
   * @param value The value to convert
   * @returns A value that can be safely used in database queries
   */
  private toQueryParam(value: unknown): QueryParam {
    // Handle null or undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Handle Date objects by converting to ISO string
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Convert other types to strings, numbers, or booleans as appropriate
    if (
      typeof value === "string" || typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    // For other types, convert to string representation
    return String(value);
  }

  async bulkInsert<T extends BaseModel>(
    models: T[],
    options: BulkOptions = {},
  ): Promise<BulkOperationResult> {
    if (models.length === 0) return { inserted: 0, updated: 0, deleted: 0 };

    const tableName = this.getTableName(models[0]);

    // Expanded and corrected list of internal BaseModel properties to exclude
    const internalModelProps = [
      "_isNew",
      "_isDirty",
      "_originalValues",
      "validate",
      "save",
      "reload",
      "delete",
      "toJSON",
      // Additional internal properties methods to exclude
      "constructor",
      "addEventListener",
      "removeEventListener",
      "dispatchEvent",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "toString",
      "valueOf",
      "hasOwnProperty",
    ];

    // Get all model properties, excluding internal BaseModel properties
    const modelProperties = Object.keys(models[0])
      .filter((key) => {
        // Exclude internal properties, methods, and undefined values
        return !internalModelProps.includes(key) &&
          !key.startsWith("_") && // Exclude all props starting with underscore
          key !== "id" && // Often ID is auto-generated
          typeof (models[0] as ModelRecord)[key] !== "function" &&
          (models[0] as ModelRecord)[key] !== undefined;
      })
      .map((key) => {
        // Convert property keys to snake_case for database columns
        return { original: key, normalized: this.toSnakeCase(key) };
      });

    // If no valid columns remain, return early
    if (modelProperties.length === 0) {
      return { inserted: 0, updated: 0, deleted: 0 };
    }

    // Convert model values to QueryParam values
    const values = models.map((model) =>
      modelProperties.map((prop) =>
        this.toQueryParam((model as ModelRecord)[prop.original])
      )
    );

    const placeholders = values
      .map((_, idx) =>
        `(${
          modelProperties.map((__, i) =>
            `$${idx * modelProperties.length + i + 1}`
          ).join(", ")
        })`
      )
      .join(", ");

    const flatValues = values.flat() as QueryParam[];

    const query = `
      INSERT INTO ${tableName} (${
      modelProperties.map((prop) => prop.normalized).join(", ")
    })
      VALUES ${placeholders}
      ${options.ignoreDuplicates ? "ON CONFLICT DO NOTHING" : ""}
    `;

    const result = await this.adapter.execute(query, flatValues);
    return { inserted: result.rowCount, updated: 0, deleted: 0 };
  }

  async bulkUpdate<T extends BaseModel>(
    models: T[],
    key: string = "id",
  ): Promise<BulkOperationResult> {
    if (models.length === 0) return { inserted: 0, updated: 0, deleted: 0 };

    const tableName = this.getTableName(models[0]);

    // Define common base model properties to exclude
    const baseModelProps = [
      "_isNew",
      "_isDirty",
      "_originalValues",
      "validate",
      "save",
      "reload",
      "delete",
      "toJSON",
    ];

    // Filter out internal properties and methods, and ensure no duplicates
    const modelProperties = Object.keys(models[0])
      .filter((col) => {
        return col !== key &&
          !baseModelProps.includes(col) &&
          typeof (models[0] as ModelRecord)[col] !== "function";
      })
      .map((key) => {
        // Convert camelCase to snake_case for database operations
        return { original: key, normalized: this.toSnakeCase(key) };
      });

    // Deduplicate columns by normalized name
    const uniqueColumns = new Map<
      string,
      { original: string; normalized: string }
    >();
    for (const prop of modelProperties) {
      if (!uniqueColumns.has(prop.normalized)) {
        uniqueColumns.set(prop.normalized, prop);
      }
    }

    // Convert Map back to array
    const columns = Array.from(uniqueColumns.values());

    if (columns.length === 0) {
      return { inserted: 0, updated: 0, deleted: 0 };
    }

    // Instead of iterating and executing individual queries, use executeMany
    const setClause = columns.map((col, index) =>
      `${col.normalized} = $${index + 1}`
    ).join(", ");
    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${
      this.toSnakeCase(key)
    } = $${columns.length + 1};`;

    // Prepare all parameter sets with proper QueryParam types
    const paramSets = models.map((model) => {
      const params: QueryParam[] = columns.map((col) =>
        this.toQueryParam((model as ModelRecord)[col.original])
      );
      params.push(this.toQueryParam((model as ModelRecord)[key]));
      return params;
    });

    // Execute all updates in a batch
    const result = await this.adapter.executeMany(query, paramSets);
    return { inserted: 0, updated: result.rowCount, deleted: 0 };
  }

  async bulkDelete<T extends BaseModel>(
    models: T[],
    key: string = "id",
  ): Promise<BulkOperationResult> {
    if (models.length === 0) return { inserted: 0, updated: 0, deleted: 0 };

    const tableName = this.getTableName(models[0]);
    const keys = models.map((model) =>
      this.toQueryParam((model as ModelRecord)[key])
    );
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const query = `
      DELETE FROM ${tableName}
      WHERE ${this.toSnakeCase(key)} IN (${placeholders});
    `;

    const result = await this.adapter.execute(query, keys);
    return { inserted: 0, updated: 0, deleted: result.rowCount };
  }
}
