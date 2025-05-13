// src/decorators/EnterpriseDecorators.ts

import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { defineMetadata, getMetadata } from "../deps.ts";

// Define interfaces for policy data
interface RetentionPolicy {
  retentionMs: number;
  retentionField: string;
}

// Define type for constructor
type Constructor<T = unknown> = { new (...args: unknown[]): T };

/**
 * 5. DATA RETENTION IMPLEMENTATION
 * Enforces data retention policies
 */
export function DataRetention(options: {
  days?: number;
  months?: number;
  years?: number;
  retentionField?: string;
} = {}) {
  return function (target: object, propertyKey: string) {
    // Calculate retention period in milliseconds
    const daysMs = (options.days || 0) * 24 * 60 * 60 * 1000;
    const monthsMs = (options.months || 0) * 30 * 24 * 60 * 60 * 1000;
    const yearsMs = (options.years || 0) * 365 * 24 * 60 * 60 * 1000;
    const totalMs = daysMs + monthsMs + yearsMs;

    const retentionField = options.retentionField || "createdAt";

    // Register this field as having a retention policy
    if (!getMetadata("dataRetention", target.constructor)) {
      defineMetadata("dataRetention", {}, target.constructor);
    }

    const retentionPolicies = getMetadata(
      "dataRetention",
      target.constructor,
    ) as Record<string, RetentionPolicy>;
    retentionPolicies[propertyKey] = {
      retentionMs: totalMs,
      retentionField,
    };
    defineMetadata("dataRetention", retentionPolicies, target.constructor);

    // Add static method to purge expired data if it doesn't exist yet
    // First convert to unknown then to our expected shape to avoid direct casting
    const constructorAny = target.constructor as unknown;

    // Check if the method already exists
    if (typeof (constructorAny as any).purgeExpiredData !== "function") {
      (constructorAny as any).purgeExpiredData = async function (
        adapter: unknown,
      ) {
        const retentionPolicies = getMetadata("dataRetention", this) as Record<
          string,
          RetentionPolicy
        >;

        if (!retentionPolicies) {
          return; // No retention policies to apply
        }

        try {
          const metadata = ModelRegistry.getModelMetadata(
            this as unknown as Constructor,
          );
          const tableName = metadata.tableName;

          for (const [field, policy] of Object.entries(retentionPolicies)) {
            const { retentionMs, retentionField } = policy;

            // Calculate cutoff date
            const cutoffDate = new Date(Date.now() - retentionMs);

            // Use createQueryBuilder if it exists
            if (typeof this.createQueryBuilder === "function") {
              const qb = this.createQueryBuilder() as {
                update: (table: string, data: Record<string, unknown>) => {
                  where: (field: string, op: string, value: unknown) => {
                    andWhere: (field: string, op: string, value: unknown) => {
                      execute: (adapter: unknown) => Promise<unknown>;
                    };
                  };
                };
              };

              // Option 1: Null out the field
              const updateData: Record<string, unknown> = {};
              updateData[field] = null;

              await qb.update(tableName, updateData)
                .where(retentionField, "<", cutoffDate)
                .andWhere(field, "IS NOT", null)
                .execute(adapter);
            } else {
              // Fallback if createQueryBuilder doesn't exist
              console.warn(
                `Could not purge expired data for ${this.name}: createQueryBuilder not found`,
              );
            }
          }
        } catch (error) {
          console.error(`Error purging expired data: ${error}`);
        }
      };
    }

    // Register the field feature
    ModelRegistry.registerFieldFeature(
      target.constructor as unknown as Constructor,
      propertyKey,
      "dataRetention",
    );
  };
}
