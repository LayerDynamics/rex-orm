import { DatabaseAdapter, QueryResult } from "../../interfaces/DatabaseAdapter.ts";

export class MockDatabaseAdapter implements DatabaseAdapter {
  executedQueries: { query: string; params: any[] }[] = [];
  protected appliedMigrations: Set<string> = new Set();
  connected = false;
  private lastQuery = "";
  private lastParams: any[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async execute(query: string, params: any[] = []): Promise<QueryResult> {
    this.executedQueries.push({ query, params });
    this.lastQuery = query;
    this.lastParams = params || [];
    
    // Normalize query by removing whitespace for consistent comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    
    const result: QueryResult = {
      rows: [],
      rowCount: 1,
      debug: {
        query: this.lastQuery,
        params: this.lastParams
      }
    };

    if (normalizedQuery.startsWith("SELECT COUNT(*)")) {
      result.rows = [{ count: this.appliedMigrations.has(params[0]) ? 1 : 0 }];
    }
    
    if (normalizedQuery.startsWith("INSERT INTO")) {
      if (params && params.length > 0) {
        this.appliedMigrations.add(params[0]);
      }
    }
    
    if (normalizedQuery.startsWith("DELETE FROM")) {
      if (params && params.length > 0) {
        this.appliedMigrations.delete(params[0]);
      }
    }
    
    return result;
  }

  // Add helper methods
  isApplied(migrationId: string): boolean {
    return this.appliedMigrations.has(migrationId);
  }

  // Add other required methods...
  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
  async findById(model: any, id: any): Promise<any> {
    return { id, name: "Test User" };
  }
  async findAll(model: any): Promise<any[]> {
    return [{ id: 1, name: "Test User" }];
  }
}
