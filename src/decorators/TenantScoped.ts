import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import { defineMetadata, getMetadata } from "../deps.ts";

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

    // Modify all query methods to include tenant filtering
    if (typeof (constructor as any).createQueryBuilder === "function") {
      const originalCreateQueryBuilder =
        (constructor as any).createQueryBuilder;
      (constructor as any).createQueryBuilder = function (): any {
        const qb = originalCreateQueryBuilder.call(this);

        // Store the original execute method
        const originalExecute = qb.execute;

        // Override execute to add tenant filtering if a tenant is set in the context
        qb.execute = async function (adapter: any): Promise<any> {
          // Get the current tenant ID from the request context or global store
          const currentTenantId = adapter.context?.tenantId ||
            (globalThis as any).currentTenantId;

          if (currentTenantId) {
            // Only add the tenant filter if not already present
            if (
              !this.queryParts.where ||
              !this.queryParts.where.some((w: any) =>
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
    constructor.prototype.save = async function (adapter: any): Promise<void> {
      // Get the current tenant ID
      const currentTenantId = adapter.context?.tenantId ||
        (globalThis as any).currentTenantId;

      if (currentTenantId) {
        // Set the tenant ID on the model if not already set
        if (!(this as any)[tenantIdField]) {
          (this as any)[tenantIdField] = currentTenantId;
        } else if ((this as any)[tenantIdField] !== currentTenantId) {
          // Prevent cross-tenant operations
          throw new Error(
            `Cannot save entity to a different tenant (${
              (this as any)[tenantIdField]
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
