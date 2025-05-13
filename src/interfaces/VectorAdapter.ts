import { DatabaseAdapter } from "./DatabaseAdapter.ts";
import { VectorCapabilities } from "../vector/interfaces/VectorCapabilities.ts";

/**
 * Interface for database adapters with vector capabilities
 * Extends the base DatabaseAdapter with vector-specific functionality
 */
export interface VectorAdapter extends DatabaseAdapter {
  /**
   * Check if the database has vector support
   */
  hasVectorSupport(): Promise<boolean>;

  /**
   * Get the vector capabilities of this database
   */
  getVectorCapabilities(): Promise<VectorCapabilities>;

  /**
   * Create a vector from an array
   * @param vector Vector data as array of numbers
   */
  createVector(vector: number[]): Promise<unknown>;

  /**
   * Create a vector index on a column
   * @param table Table name
   * @param column Column name
   * @param options Index options
   */
  createVectorIndex(
    table: string,
    column: string,
    options?: {
      indexType?: string;
      metric?: string;
      dimensions?: number;
      efConstruction?: number;
      m?: number;
    },
  ): Promise<void>;
}
