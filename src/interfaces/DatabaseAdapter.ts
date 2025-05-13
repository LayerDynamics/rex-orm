// src/interfaces/DatabaseAdapter.ts
export type DatabaseRecord = Record<string, unknown>;
export type QueryParam = string | number | boolean | null | undefined | Date;

export interface QueryResult {
  rows: DatabaseRecord[];
  rowCount: number;
  debug?: {
    query: string;
    params: QueryParam[];
  };
}

export interface ConnectionOptions {
  debug?: boolean;
  maxConnections?: number;
}

export interface DatabaseAdapterContext {
  userId?: string;
  user?: unknown; // Using unknown instead of any for better type safety
  tenantId?: string;
  [key: string]: unknown; // Using unknown instead of any for better type safety
}

export interface VectorCapabilities {
  supportedIndexTypes: string[];
  supportedMetrics: string[];
  maxDimensions?: number;
}

export interface DatabaseAdapter<T extends DatabaseRecord = DatabaseRecord> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(query: string, params?: QueryParam[]): Promise<QueryResult>;
  // Add method for executing multiple sets of the same query with different parameters
  executeMany(query: string, paramSets: QueryParam[][]): Promise<QueryResult>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  transaction<R>(callback: () => Promise<R>): Promise<R>; // Add transaction method
  findById(model: T, id: string | number): Promise<T | null>;
  findAll(model: T): Promise<T[]>;
  queryCount: number;
  connected: boolean;

  // Vector-specific methods
  getType(): string;
  query(sql: string, params?: QueryParam[]): Promise<QueryResult>;
  getVectorCapabilities(): Promise<VectorCapabilities>;
}

export interface EnhancedDatabaseAdapter<
  T extends DatabaseRecord = DatabaseRecord,
> extends DatabaseAdapter<T> {
  context?: DatabaseAdapterContext;
  setContext(context: DatabaseAdapterContext): void;
}
