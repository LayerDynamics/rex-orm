import { PostgresClient } from "../deps.ts";
import { DatabaseAdapter, QueryResult } from "../interfaces/DatabaseAdapter.ts";

export class PostgresAdapter implements DatabaseAdapter {
  private client: PostgresClient;
  private connected: boolean = false;

  constructor(private config: any) {
    this.client = new PostgresClient({
      user: this.config.user,
      password: this.config.password,
      database: this.config.databaseName,
      hostname: this.config.host,
      port: this.config.port,
      tls: this.config.tls || false,
    });
  }