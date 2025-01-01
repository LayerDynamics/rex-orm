export interface QueryResult {
  rows: any[];
  rowCount: number;
  debug?: {
    query: string;
    params: any[];
  };
}

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(query: string, params?: any[]): Promise<QueryResult>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  findById(model: any, id: any): Promise<any>;
  findAll(model: any): Promise<any[]>;
}
