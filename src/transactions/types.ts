// ...existing code...
export interface Transaction {
  id: string;
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface TransactionManagerOptions {
  isolationLevel?: string; // e.g., "READ COMMITTED" or "SERIALIZABLE"
}
// ...existing code...
