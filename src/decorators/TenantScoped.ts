import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { defineMetadata } from "../deps.ts";
import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";

// Define the Constructor type needed for ModelRegistry
type Constructor<T = unknown> = { new (...args: unknown[]): T };

/**
 * 2. MULTI-TENANCY IMPLEMENTATION
 * Enforces tenant isolation at the ORM level
 */
export function TenantScoped(options: { tenantIdField?: string } = {}) {
  return function (constructor: typeof BaseModel) {
    const tenantIdField = options.tenantIdField || "tenantId";

    defineMetadata("tenantScoped", {
      enabled: true,
      tenantIdField,
    }, constructor);

    // Define a more specific interface for the QueryBuilder based on what we use
    interface QueryBuilder {
      queryParts: {
        where?: Array<{
          column: string;
          operator: string;
          value: unknown;
        }>;
      };
      andWhere: (column: string, operator: string, value: unknown) => QueryBuilder;
      execute: (adapter: DatabaseAdapter) => Promise<unknown>;
    }

    // Modify all query methods to include tenant filtering
    if (typeof (constructor as typeof BaseModel & { createQueryBuilder: () => QueryBuilder }).createQueryBuilder === "function") {
      const originalCreateQueryBuilder =
        (constructor as typeof BaseModel & { createQueryBuilder: () => QueryBuilder }).createQueryBuilder;
      (constructor as typeof BaseModel & { createQueryBuilder: () => QueryBuilder }).createQueryBuilder = function (): QueryBuilder {
        const qb = originalCreateQueryBuilder.call(this);

        // Store the original execute method
        const originalExecute = qb.execute;

        // Override execute to add tenant filtering if a tenant is set in the context
        qb.execute = function (adapter: DatabaseAdapter): Promise<unknown> {
          // Get the current tenant ID from the request context or global store
          const currentTenantId = adapter.context?.tenantId ||
            (globalThis as { currentTenantId?: string }).currentTenantId;

          if (currentTenantId) {
            // Only add the tenant filter if not already present
            if (
              !this.queryParts.where ||
              !this.queryParts.where.some((w) =>
                w.column === tenantIdField
              )
            ) {
              this.andWhere(tenantIdField, "=", currentTenantId);
            }
          }

          // Call the original execute method
          return originalExecute.call(this, adapter);
        };

        return qb;
      };
    } else {
      console.warn(
        `Could not apply tenant scoping to ${constructor.name}: createQueryBuilder not found`,
      );
    }

    // Override save to ensure tenant ID is set
    const originalSave = constructor.prototype.save;
    constructor.prototype.save = async function (adapter: DatabaseAdapter): Promise<void> {
      // Get the current tenant ID
      const currentTenantId = adapter.context?.tenantId ||
        (globalThis as { currentTenantId?: string }).currentTenantId;

      if (currentTenantId) {
        // Set the tenant ID on the model if not already set
        if (!(this as BaseModel & Record<string, unknown>)[tenantIdField]) {
          (this as BaseModel & Record<string, unknown>)[tenantIdField] = currentTenantId;
        } else if ((this as BaseModel & Record<string, unknown>)[tenantIdField] !== currentTenantId) {
          // Prevent cross-tenant operations
          throw new Error(
            `Cannot save entity to a different tenant (${
              (this as BaseModel & Record<string, unknown>)[tenantIdField]
            }) than the current context (${currentTenantId})`,
          );
        }
      }

      // Call the original save method
      await originalSave.call(this, adapter);
    };

    ModelRegistry.registerFeature(
      constructor as unknown as Constructor,
      "tenantScoped",
    );
  };
}
