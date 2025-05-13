// src/decorators/EnterpriseDecorators.ts

import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import { defineMetadata, getMetadata } from "../deps.ts";

// Define the Constructor type needed for ModelRegistry
type Constructor<T = unknown> = { new (...args: unknown[]): T };

/**
 * 7. VERSIONING IMPLEMENTATION
 * Maintains version history for entities
 */
export function Versioned(options: {
  maxVersions?: number;
  versionTable?: string;
} = {}) {
  return function (constructor: typeof BaseModel) {
    const maxVersions = options.maxVersions || 10;
    let versionTable = options.versionTable;

    // If versionTable isn't provided, we'll try to derive it from the entity metadata
    if (!versionTable) {
      try {
        // Try to get the table name from entity metadata
        const metadata = ModelRegistry.getModelMetadata(
          constructor as unknown as Constructor,
        );
        versionTable = `${metadata.tableName}_versions`;
      } catch (e) {
        // If model isn't registered yet, use the class name to derive table name
        versionTable = `${constructor.name.toLowerCase()}_versions`;
      }
    }

    defineMetadata("versioned", {
      enabled: true,
      maxVersions,
      versionTable,
    }, constructor);

    // Override save to create versions
    const originalSave = constructor.prototype.save;
    constructor.prototype.save = async function (adapter: any): Promise<void> {
      // Only create a version for updates, not inserts
      if (!this.isNew()) {
        // Create a snapshot of the current state before changes
        const currentVersion = {
          entity_id: this.id,
          version_number: 1, // Will be incremented
          entity_data: JSON.stringify(this.toJSON()),
          created_at: new Date(),
          created_by: adapter.context?.userId || null,
        };

        if (typeof (constructor as any).createQueryBuilder === "function") {
          // Get the latest version number
          const qb = (constructor as any).createQueryBuilder();
          const result = await qb
            .select(["MAX(version_number) as max_version"])
            .from(versionTable)
            .where("entity_id", "=", this.id)
            .execute(adapter);

          if (result.rows[0] && result.rows[0].max_version) {
            currentVersion.version_number = result.rows[0].max_version + 1;
          }

          // Insert the version
          await qb.insert(versionTable, currentVersion).execute(adapter);

          // Trim old versions if needed
          if (maxVersions > 0) {
            await qb.delete(versionTable)
              .where("entity_id", "=", this.id)
              .andWhere(
                "version_number",
                "<=",
                currentVersion.version_number - maxVersions,
              )
              .execute(adapter);
          }
        } else {
          // Fallback if createQueryBuilder doesn't exist
          try {
            // Get the latest version number
            const result = await adapter.execute(
              `SELECT MAX(version_number) as max_version FROM ${versionTable} WHERE entity_id = ?`,
              [this.id],
            );

            if (result.rows[0] && result.rows[0].max_version) {
              currentVersion.version_number = result.rows[0].max_version + 1;
            }

            // Insert the version
            await adapter.execute(
              `INSERT INTO ${versionTable} (entity_id, version_number, entity_data, created_at, created_by) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                currentVersion.entity_id,
                currentVersion.version_number,
                currentVersion.entity_data,
                currentVersion.created_at,
                currentVersion.created_by,
              ],
            );

            // Trim old versions if needed
            if (maxVersions > 0) {
              await adapter.execute(
                `DELETE FROM ${versionTable} 
                 WHERE entity_id = ? AND version_number <= ?`,
                [this.id, currentVersion.version_number - maxVersions],
              );
            }
          } catch (error) {
            console.error(`Error creating version: ${getErrorMessage(error)}`);
          }
        }
      }

      // Call original save
      await originalSave.call(this, adapter);
    };

    // Add method to retrieve version history
    (constructor.prototype as unknown as Record<string, unknown>)[
      "getVersions"
    ] = async function getVersionsMethod(
      adapter: any,
      limit?: number,
    ): Promise<any[]> {
      if (typeof (constructor as any).createQueryBuilder === "function") {
        const qb = (constructor as any).createQueryBuilder();
        qb.select(["*"])
          .from(versionTable)
          .where("entity_id", "=", this.id)
          .orderBy("version_number", "DESC");

        if (limit) {
          qb.limit(limit);
        }

        const result = await qb.execute(adapter);
        return result.rows;
      } else {
        // Fallback if createQueryBuilder doesn't exist
        try {
          let query = `SELECT * FROM ${versionTable} 
                        WHERE entity_id = ? 
                        ORDER BY version_number DESC`;

          const params = [this.id];

          if (limit) {
            query += " LIMIT ?";
            params.push(limit);
          }

          const result = await adapter.execute(query, params);
          return result.rows || [];
        } catch (error) {
          console.error(`Error getting versions: ${getErrorMessage(error)}`);
          return [];
        }
      }
    };

    // Add method to restore a specific version
    (constructor.prototype as unknown as Record<string, unknown>)[
      "restoreVersion"
    ] = async function restoreVersionMethod(
      adapter: any,
      versionNumber: number,
    ): Promise<void> {
      let versionData;

      if (typeof (constructor as any).createQueryBuilder === "function") {
        const qb = (constructor as any).createQueryBuilder();
        const result = await qb
          .select(["*"])
          .from(versionTable)
          .where("entity_id", "=", this.id)
          .andWhere("version_number", "=", versionNumber)
          .execute(adapter);

        if (result.rows.length === 0) {
          throw new Error(
            `Version ${versionNumber} not found for entity ${this.constructor.name} with ID ${this.id}`,
          );
        }

        versionData = JSON.parse(result.rows[0].entity_data);
      } else {
        // Fallback if createQueryBuilder doesn't exist
        try {
          const result = await adapter.execute(
            `SELECT * FROM ${versionTable} 
               WHERE entity_id = ? AND version_number = ?`,
            [this.id, versionNumber],
          );

          if (!result.rows || result.rows.length === 0) {
            throw new Error(
              `Version ${versionNumber} not found for entity ${this.constructor.name} with ID ${this.id}`,
            );
          }

          versionData = JSON.parse(result.rows[0].entity_data);
        } catch (error) {
          throw new Error(`Error restoring version: ${getErrorMessage(error)}`);
        }
      }

      // Copy version data to this instance
      Object.assign(this, versionData);

      // Save the restored version
      await originalSave.call(this, adapter);
    };

    ModelRegistry.registerFeature(
      constructor as unknown as Constructor,
      "versioned",
    );
  };
}
