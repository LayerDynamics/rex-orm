import { QueryBuilder } from "../../query/QueryBuilder.ts";

/**
 * Interface for a query modifier
 * This allows plugging in custom vector operations into the QueryBuilder
 */
export interface QueryModifier {
  /**
   * Apply modifications to a query builder
   * @param queryBuilder The query builder to modify
   */
  apply(queryBuilder: QueryBuilder): void;
}
