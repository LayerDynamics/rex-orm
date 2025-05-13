// src/decorators/EnterpriseDecorators.ts

import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { getErrorMessage } from "../utils/error_utils.ts";
import { defineMetadata, getMetadata } from "../deps.ts";

// Define the Constructor type needed for ModelRegistry
type Constructor<T = unknown> = { new (...args: unknown[]): T };

/**
 * 6. ROW-LEVEL SECURITY IMPLEMENTATION
 * Enforces access control at the row level
 */
export function RowLevelSecurity(policyFn: (user: any) => string) {
  return function (constructor: typeof BaseModel) {
    defineMetadata("rowLevelSecurity", {
      enabled: true,
      policyFn,
    }, constructor);

    // Check if createQueryBuilder exists on the constructor
    if (typeof (constructor as any).createQueryBuilder === "function") {
      // Override query builder to add security predicates
      const originalCreateQueryBuilder =
        (constructor as any).createQueryBuilder;
      (constructor as any).createQueryBuilder = function (): any {
        const qb = originalCreateQueryBuilder.call(this);

        // Store the original execute method
        const originalExecute = qb.execute;

        // Override execute to add security predicates
        qb.execute = async function (adapter: any): Promise<any> {
          // Get the current user from the context
          const currentUser = adapter.context?.user;

          if (currentUser) {
            // Get the security policy function
            const { policyFn } = getMetadata("rowLevelSecurity", constructor);

            // Generate the security predicate
            const securityPredicate = policyFn(currentUser);

            // Add the security predicate as a raw WHERE condition
            if (securityPredicate) {
              qb.rawSql(`(${securityPredicate})`);
            }
          }

          // Call the original execute method
          return originalExecute.call(this, adapter);
        };

        return qb;
      };
    } else {
      console.warn(
        `Could not apply row-level security to ${constructor.name}: createQueryBuilder not found`,
      );
    }

    // Register the feature with proper type assertion
    ModelRegistry.registerFeature(
      constructor as unknown as Constructor,
      "rowLevelSecurity",
    );
  };
}
