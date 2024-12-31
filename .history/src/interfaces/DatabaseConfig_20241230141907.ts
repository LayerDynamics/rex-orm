export interface BaseDBConfig {
  database: "postgres" | "sqlite";
  poolSize?: number;
  idleTimeout?: number;
}

export interface PostgresConfig extends BaseDBConfig {
  database: "postgres";
  user: string;
  password: string;
  host: string;
  port: number;
  databaseName: string;
  tls?: boolean;
}

export interface SQLiteConfig extends BaseDBConfig {
  database: "sqlite";
  databasePath: string;
}

export type DatabaseConfig = PostgresConfig | SQLiteConfig;
