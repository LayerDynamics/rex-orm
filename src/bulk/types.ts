export interface BulkOperationResult {
  inserted: number;
  updated: number;
  deleted: number;
}

export interface BulkOptions {
  ignoreDuplicates?: boolean;
}
