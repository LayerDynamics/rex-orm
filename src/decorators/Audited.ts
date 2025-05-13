// src/decorators/EnterpriseDecorators.ts

import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import { defineMetadata, getMetadata } from "../deps.ts";

// Import Constructor type from ModelRegistry or define it here
type Constructor<T = unknown> = { new (...args: unknown[]): T };

/**
 * 3. AUDIT LOGGING IMPLEMENTATION
 * Tracks all changes to entity fields
 */
export function Audited(options: {
  trackChanges?: boolean;
  excludeFields?: string[];
  auditTable?: string;
} = {}) {
  return function (constructor: typeof BaseModel) {
    const trackChanges = options.trackChanges ?? true;
    const excludeFields = options.excludeFields || [];
    let auditTable = options.auditTable;

    // If auditTable isn't provided, we'll try to derive it from the entity metadata
    if (!auditTable) {
      try {
        // Try to get the table name from entity metadata
        // Use type assertion to work with the abstract class
        const metadata = ModelRegistry.getModelMetadata(
          constructor as unknown as Constructor,
        );
        auditTable = `${metadata.tableName}_audit`;
      } catch (e) {
        // If model isn't registered yet, use the class name to derive table name
        auditTable = `${constructor.name.toLowerCase()}_audit`;
      }
    }

    defineMetadata("audited", {
      enabled: true,
      trackChanges,
      excludeFields,
      auditTable,
    }, constructor);

    // Override save method to create audit records
    const originalSave = constructor.prototype.save;
    constructor.prototype.save = async function (adapter: any): Promise<void> {
      // Create a public getter for accessing protected properties
      const getOriginalValues = () => (this as any)._originalValues;
      const setOriginalValues = (values: Record<string, any>) =>
        (this as any)._originalValues = values;
      const checkIsNew = () =>
        (this as any).id === undefined || (this as any).id === null ||
        (this as any).id === 0;

      if (!getOriginalValues()) {
        setOriginalValues({});
      }

      // Track if it's an update or insert
      const isNew = checkIsNew();
      const action = isNew ? "INSERT" : "UPDATE";

      // Create an audit record with changes
      const changes: Record<string, { old: any; new: any }> = {};
      if (!isNew) {
        // For updates, calculate what changed
        const metadata = ModelRegistry.getModelMetadata(
          this.constructor as unknown as Constructor,
        );
        for (const column of metadata.columns) {
          const field = column.propertyKey;

          // Skip excluded fields
          if (excludeFields.includes(field)) continue;

          // If field changed, record the change
          if (
            getOriginalValues()[field] !== undefined &&
            getOriginalValues()[field] !== (this as any)[field]
          ) {
            changes[field] = {
              old: getOriginalValues()[field],
              new: (this as any)[field],
            };
          }
        }
      } else {
        // For inserts, record all field values
        const metadata = ModelRegistry.getModelMetadata(
          this.constructor as unknown as Constructor,
        );
        for (const column of metadata.columns) {
          const field = column.propertyKey;

          // Skip excluded fields
          if (excludeFields.includes(field)) continue;

          if ((this as any)[field] !== undefined) {
            changes[field] = {
              old: null,
              new: (this as any)[field],
            };
          }
        }
      }

      // Call original save
      await originalSave.call(this, adapter);

      // Create audit record
      if (Object.keys(changes).length > 0 || action === "INSERT") {
        const auditData = {
          entity_id: this.id,
          entity_type: this.constructor.name,
          action,
          changes: JSON.stringify(changes),
          changed_by: adapter.context?.userId || null,
          timestamp: new Date(),
        };

        // Insert audit record
        // Call QueryBuilder from BaseModel or add static method check
        if (typeof (constructor as any).createQueryBuilder === "function") {
          const qb = (constructor as any).createQueryBuilder();
          await qb.insert(auditTable, auditData).execute(adapter);
        } else {
          // Fallback implementation if createQueryBuilder doesn't exist
          await adapter.execute(
            `INSERT INTO ${auditTable} (entity_id, entity_type, action, changes, changed_by, timestamp) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              auditData.entity_id,
              auditData.entity_type,
              auditData.action,
              auditData.changes,
              auditData.changed_by,
              auditData.timestamp,
            ],
          );
        }
      }

      // Reset original values after save
      setOriginalValues({});
    };

    // Override delete to audit deletions
    const originalDelete = constructor.prototype.delete;
    constructor.prototype.delete = async function (
      adapter: any,
    ): Promise<void> {
      // Create an audit record for deletion
      const auditData = {
        entity_id: this.id,
        entity_type: this.constructor.name,
        action: "DELETE",
        changes: JSON.stringify({}),
        changed_by: adapter.context?.userId || null,
        timestamp: new Date(),
      };

      // Insert audit record
      if (typeof (constructor as any).createQueryBuilder === "function") {
        const qb = (constructor as any).createQueryBuilder();
        await qb.insert(auditTable, auditData).execute(adapter);
      } else {
        // Fallback implementation if createQueryBuilder doesn't exist
        await adapter.execute(
          `INSERT INTO ${auditTable} (entity_id, entity_type, action, changes, changed_by, timestamp) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            auditData.entity_id,
            auditData.entity_type,
            auditData.action,
            auditData.changes,
            auditData.changed_by,
            auditData.timestamp,
          ],
        );
      }

      // Call original delete
      await originalDelete.call(this, adapter);
    };

    ModelRegistry.registerFeature(
      constructor as unknown as Constructor,
      "audited",
    );
  };
}
