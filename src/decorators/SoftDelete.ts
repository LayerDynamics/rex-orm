// src/decorators/EnterpriseDecorators.ts

import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import { defineMetadata } from "../deps.ts";
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";

// Define the Constructor type needed for ModelRegistry
type Constructor<T = unknown> = { new (...args: unknown[]): T };

// Define interfaces for type safety instead of using Function
interface QueryBuilder {
  update: (tableName: string, data: Record<string, unknown>) => QueryBuilder;
  where: (column: string, operator: string, value: unknown) => QueryBuilder;
  andWhere: (column: string, operator: string, value: unknown) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  from: (tableName: string) => QueryBuilder;
  execute: (adapter: DatabaseAdapter) => Promise<{ rows: unknown[]; rowCount: number }>;
}

interface ModelWithQueryBuilder {
  createQueryBuilder: () => QueryBuilder;
}

interface ModelWithFindById {
  findById: (id: string | number, adapter: DatabaseAdapter, includeSoftDeleted?: boolean) => Promise<BaseModel | null>;
}

/**
 * 1. SOFT DELETE IMPLEMENTATION
 * Enables logical deletion rather than physical deletion
 */
export function SoftDelete(
  options: { deletedAtField?: string; deletedByField?: string } = {},
) {
  return function (constructor: typeof BaseModel) {
    const deletedAtField = options.deletedAtField || "deletedAt";
    const deletedByField = options.deletedByField || "deletedBy";

    defineMetadata("softDelete", {
      enabled: true,
      deletedAtField,
      deletedByField,
    }, constructor);

    // Override the delete method from BaseModel
    constructor.prototype.delete = async function (
      adapter: DatabaseAdapter,
      userId?: string,
    ): Promise<void> {
      // Instead of deleting, just update the deleted fields
      try {
        const updateData: Record<string, unknown> = {};
        updateData[deletedAtField] = new Date();

        if (userId && deletedByField) {
          updateData[deletedByField] = userId;
        }

        // Use query builder to update instead of delete
        if (typeof (constructor as typeof BaseModel & ModelWithQueryBuilder).createQueryBuilder === "function") {
          const qb = (constructor as typeof BaseModel & ModelWithQueryBuilder).createQueryBuilder();
          await qb.update(
            ModelRegistry.getModelMetadata(
              this.constructor as unknown as Constructor,
            ).tableName,
            updateData,
          )
            .where("id", "=", this.id)
            .execute(adapter);
        } else {
          // Fallback if createQueryBuilder doesn't exist
          await adapter.execute(
            `UPDATE ${
              ModelRegistry.getModelMetadata(
                this.constructor as unknown as Constructor,
              ).tableName
            } SET ${
              Object.entries(updateData).map(([key, value]) =>
                `${key} = ${
                  typeof value === "object" ? JSON.stringify(value) : value
                }`
              ).join(", ")
            } WHERE id = ?`,
            [this.id],
          );
        }

        // Emit delete event for realtime sync
        const constructorModel = this
          .constructor as unknown as typeof BaseModel;
        if (
          constructorModel &&
          typeof constructorModel === "function"
        ) {
          // Use accessor method if available
          if (typeof constructorModel.getRealTimeSync === "function") {
            const realTimeSync = constructorModel.getRealTimeSync();
            if (realTimeSync) {
              realTimeSync.emit({
                type: "DELETE",
                model: this.constructor.name,
                payload: this,
              });
            }
          }
        }
      } catch (error) {
        throw new Error(`Soft delete failed: ${getErrorMessage(error)}`);
      }
    };

    // Add a restore method
    // Define the type for restore method to avoid TS2339 error
    type RestoreMethod = (adapter: DatabaseAdapter) => Promise<void>;

    // Add restore method to prototype - fix the type assertion
    (constructor.prototype as unknown as Record<string, unknown>)["restore"] =
      async function restoreMethod(adapter: DatabaseAdapter): Promise<void> {
        try {
          const updateData: Record<string, unknown> = {};
          updateData[deletedAtField] = null;
          if (options.deletedByField) {
            updateData[deletedByField] = null;
          }

          if (typeof (constructor as typeof BaseModel & ModelWithQueryBuilder).createQueryBuilder === "function") {
            const qb = (constructor as typeof BaseModel & ModelWithQueryBuilder).createQueryBuilder();
            await qb.update(
              ModelRegistry.getModelMetadata(
                this.constructor as unknown as Constructor,
              ).tableName,
              updateData,
            )
              .where("id", "=", this.id)
              .execute(adapter);
          } else {
            // Fallback if createQueryBuilder doesn't exist
            await adapter.execute(
              `UPDATE ${
                ModelRegistry.getModelMetadata(
                  this.constructor as unknown as Constructor,
                ).tableName
              } SET ${
                Object.entries(updateData).map(([key]) => `${key} = NULL`).join(
                  ", ",
                )
              } WHERE id = ?`,
              [this.id],
            );
          }

          // Emit restore event
          const constructorModel = this
            .constructor as unknown as typeof BaseModel;
          if (
            constructorModel &&
            typeof constructorModel === "function"
          ) {
            // Use accessor method if available
            if (typeof constructorModel.getRealTimeSync === "function") {
              const realTimeSync = constructorModel.getRealTimeSync();
              if (realTimeSync) {
                realTimeSync.emit({
                  type: "RESTORE",
                  model: this.constructor.name,
                  payload: this,
                });
              }
            }
          }
        } catch (error) {
          throw new Error(`Restore failed: ${getErrorMessage(error)}`);
        }
      };

    // Modify finder methods to exclude soft deleted by default
    if (typeof (constructor as typeof BaseModel & ModelWithFindById).findById === "function") {
      const originalFindById = (constructor as typeof BaseModel & ModelWithFindById).findById;
      (constructor as typeof BaseModel & ModelWithFindById).findById = async function (
        id: string | number,
        adapter: DatabaseAdapter,
        includeSoftDeleted = false,
      ): Promise<BaseModel | null> {
        if (includeSoftDeleted) {
          return originalFindById.call(this, id, adapter);
        }

        if (typeof this.createQueryBuilder === "function") {
          const qb = this.createQueryBuilder();
          const result = await qb
            .select("*")
            .from(
              ModelRegistry.getModelMetadata(this as unknown as Constructor)
                .tableName,
            )
            .where("id", "=", id)
            .andWhere(`${deletedAtField}`, "IS NULL")
            .execute(adapter);

          return result.rows[0] ? new (this as typeof BaseModel)(result.rows[0]) : null;
        } else {
          // Fallback if createQueryBuilder doesn't exist
          const result = await adapter.execute(
            `SELECT * FROM ${
              ModelRegistry.getModelMetadata(this as unknown as Constructor)
                .tableName
            } 
             WHERE id = ? AND ${deletedAtField} IS NULL`,
            [id],
          );
          return result.rows && result.rows[0]
            ? new (this as typeof BaseModel)(result.rows[0])
            : null;
        }
      };
    }

    ModelRegistry.registerFeature(
      constructor as unknown as Constructor,
      "softDelete",
    );
  };
}
