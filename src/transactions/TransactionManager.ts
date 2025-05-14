import { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { Transaction, TransactionManagerOptions } from "./types.ts";
import { v4 as _v4 } from "https://deno.land/std@0.178.0/uuid/mod.ts";

export class TransactionManager {
  private adapter: DatabaseAdapter;
  private options: TransactionManagerOptions;

  constructor(
    adapter: DatabaseAdapter,
    options: TransactionManagerOptions = {},
  ) {
    this.adapter = adapter;
    this.options = options;
  }

  async beginTransaction(): Promise<Transaction> {
    const transactionId = crypto.randomUUID();
    await this.adapter.execute("BEGIN TRANSACTION;");
    return {
      id: transactionId,
      begin: async () => {
        await this.adapter.execute("BEGIN TRANSACTION;");
      },
      commit: async () => {
        await this.adapter.execute("COMMIT;");
      },
      rollback: async () => {
        await this.adapter.execute("ROLLBACK;");
      },
    };
  }

  async executeInTransaction<T>(
    fn: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    const transaction = await this.beginTransaction();
    try {
      const result = await fn(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
