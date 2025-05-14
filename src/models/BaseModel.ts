import { ModelRegistry } from "./ModelRegistry.ts";
import { RealTimeSync as _RealTimeSync } from "../realtime/index.ts";
import {
  DatabaseAdapter,
  DatabaseRecord as _DatabaseRecord,
  QueryParam,
} from "../interfaces/DatabaseAdapter.ts";
import { TransactionManager } from "../transactions/TransactionManager.ts";
import { ModelEvent, ModelEventType } from "./types.ts";

// Properly define the interface for real-time sync
interface ModelRealTimeSync {
  emit(data: ModelEvent): void;
  // ...other methods...
}

export abstract class BaseModel {
  // Update the type reference
  protected static realTimeSync: ModelRealTimeSync | null = null;
  protected _isNew = true;
  protected _isDirty = false;
  protected _originalValues: Record<string, unknown> = {};
  abstract id: number; // Change to abstract property

  constructor() {
    ModelRegistry.registerModel(
      this.constructor as { new (...args: unknown[]): BaseModel },
    );
    this.trackChanges();
  }

  // Type that allows string indexing
  [key: string]: unknown;

  private trackChanges() {
    const handler: ProxyHandler<BaseModel> = {
      set: (target: BaseModel, prop: string | symbol, value: unknown) => {
        if (target[prop as string] !== value) {
          // Use Object.prototype.hasOwnProperty to fix no-prototype-builtins
          if (
            !Object.prototype.hasOwnProperty.call(this._originalValues, prop)
          ) {
            this._originalValues[prop as string] = target[prop as string];
          }
          this._isDirty = true;
        }
        target[prop as string] = value;
        return true;
      },
    };
    return new Proxy(this, handler);
  }

  // Update method signature
  static initializeRealTimeSync(sync: ModelRealTimeSync): void {
    this.realTimeSync = sync;
  }

  // Add method to safely access protected realTimeSync property
  static getRealTimeSync(): ModelRealTimeSync | null {
    return this.realTimeSync;
  }

  validate(): void {
    const metadata = ModelRegistry.getModelMetadata(
      this.constructor as { new (...args: unknown[]): BaseModel },
    );
    const validations = metadata.validations;
    for (const [property, validators] of Object.entries(validations)) {
      const value = (this as Record<string, unknown>)[property];
      for (const validator of validators) {
        const result = validator(value);
        if (result === false) {
          throw new Error(`Validation failed for property '${property}'.`);
        } else if (typeof result === "string") {
          throw new Error(
            `Validation failed for property '${property}': ${result}`,
          );
        }
      }
    }
  }

  protected isNew(): boolean {
    return !this.id;
  }

  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {};
    const metadata = ModelRegistry.getModelMetadata(
      this.constructor as { new (...args: unknown[]): BaseModel },
    );
    for (const column of metadata.columns) {
      json[column.propertyKey] =
        (this as Record<string, unknown>)[column.propertyKey];
    }
    return json;
  }

  async save(adapter: DatabaseAdapter): Promise<void> {
    this.validate();
    const txManager = new TransactionManager(adapter);
    const isNewRecord = this._isNew; // Store initial state before transaction

    await txManager.executeInTransaction(async () => {
      if (this._isNew) {
        await this.insert(adapter);
        this._isNew = false;
      } else if (this._isDirty) {
        await this.update(adapter);
      }
      this._isDirty = false;
      this._originalValues = {};
    });

    if (BaseModel.realTimeSync) {
      const eventType: ModelEventType = isNewRecord ? "CREATE" : "UPDATE";
      BaseModel.realTimeSync.emit({
        type: eventType,
        model: this.constructor.name,
        payload: this,
      });
    }
  }

  private async insert(adapter: DatabaseAdapter): Promise<void> {
    const metadata = ModelRegistry.getModelMetadata(
      this.constructor as { new (...args: unknown[]): BaseModel },
    );
    const columns = metadata.columns.filter((col) => !col.options.primaryKey);
    const values = columns.map((col) =>
      (this as BaseModel)[col.propertyKey]
    ) as QueryParam[];

    // Get column mappings if they exist for this model
    const modelClass = this.constructor as unknown as {
      columnMappings?: Record<string, string>;
    };
    const columnMappings = modelClass.columnMappings || {};

    // Map property keys to database column names if there's a mapping
    const dbColumns = columns.map((col) =>
      columnMappings[col.propertyKey] || col.propertyKey
    );

    const placeholders = dbColumns.map((_, i) => `$${i + 1}`).join(", ");

    const query = `
      INSERT INTO ${metadata.tableName} (${dbColumns.join(", ")})
      VALUES (${placeholders})
      RETURNING ${metadata.primaryKey}
    `;

    const result = await adapter.execute(query, values);
    if (result.rows.length > 0) {
      (this as Record<string, unknown>)[metadata.primaryKey] =
        result.rows[0][metadata.primaryKey];
    }
  }

  private async update(adapter: DatabaseAdapter): Promise<void> {
    const metadata = ModelRegistry.getModelMetadata(
      this.constructor as { new (...args: unknown[]): BaseModel },
    );
    const columns = metadata.columns.filter((col) => !col.options.primaryKey);
    const setClause = columns
      .map((col, i) => `${col.propertyKey} = $${i + 1}`)
      .join(", ");
    const values = columns.map((col) =>
      (this as BaseModel)[col.propertyKey]
    ) as QueryParam[];

    values.push((this as BaseModel)[metadata.primaryKey] as QueryParam);
    const query = `
      UPDATE ${metadata.tableName}
      SET ${setClause}
      WHERE ${metadata.primaryKey} = $${columns.length + 1}
    `;

    await adapter.execute(query, values);
  }

  async delete(adapter: DatabaseAdapter): Promise<void> {
    if (!("id" in this)) {
      throw new Error("Cannot delete a model without an ID");
    }

    const txManager = new TransactionManager(adapter);
    await txManager.executeInTransaction(async () => {
      await adapter.execute(
        `DELETE FROM ${this.constructor.name.toLowerCase()}s WHERE id = $1`,
        [(this as BaseModel).id as QueryParam],
      );
    });

    if (BaseModel.realTimeSync) {
      BaseModel.realTimeSync.emit({
        type: "DELETE",
        model: this.constructor.name,
        payload: this,
      });
    }
  }
}
