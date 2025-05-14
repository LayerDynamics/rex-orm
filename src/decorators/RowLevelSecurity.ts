// src/decorators/EnterpriseDecorators.ts

import "reflect-metadata";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { defineMetadata, getMetadata } from "../deps.ts";
import { DatabaseAdapter, QueryResult } from "../interfaces/DatabaseAdapter.ts";

// Define the Constructor type needed for ModelRegistry
type Constructor<T = unknown> = { new (...args: unknown[]): T };

// Define a type for the QueryBuilder
interface QueryBuilder {
  execute: (adapter: DatabaseAdapter) => Promise<QueryResult>;
  rawSql: (sql: string) => void;
  [key: string]: unknown;
}

/**
 * 6. ROW-LEVEL SECURITY IMPLEMENTATION
 * Enforces access control at the row level
 */
export function RowLevelSecurity(policyFn: (user: unknown) => string) {
  return function (constructor: typeof BaseModel) {
    defineMetadata("rowLevelSecurity", {
      enabled: true,
      policyFn,
    }, constructor);

    // Check if createQueryBuilder exists on the constructor
    if (typeof (constructor as unknown as { createQueryBuilder?: () => unknown }).createQueryBuilder === "function") {
      // Override query builder to add security predicates
      const originalCreateQueryBuilder =
        (constructor as unknown as { createQueryBuilder: () => QueryBuilder }).createQueryBuilder;
      (constructor as unknown as { createQueryBuilder: () => QueryBuilder }).createQueryBuilder = function (): QueryBuilder {
        const qb = originalCreateQueryBuilder.call(this);

        // Store the original execute method
        const originalExecute = qb.execute;

        // Override execute to add security predicates
        qb.execute = function (adapter: DatabaseAdapter): Promise<QueryResult> {
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
