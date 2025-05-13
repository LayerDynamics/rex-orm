/**
 * Configuration interface for Rex-ORM.
 * This interface defines the structure of configuration options used
 * for various components of the ORM.
 */
export interface Config {
  /**
   * The type of database to connect to (e.g., "postgres", "sqlite")
   */
  database: string;
  
  /**
   * Database username for authentication (if required)
   */
  user?: string;
  
  /**
   * Database password for authentication (if required)
   */
  password?: string;
  
  /**
   * Database host address (if required)
   */
  host?: string;
  
  /**
   * Database port number (if required)
   */
  port?: number;
  
  /**
   * The name of the database to connect to 
   */
  databaseName?: string;
  
  /**
   * Path to SQLite database file (for SQLite adapter)
   */
  databasePath?: string;
  
  /**
   * Connection pool size (number of connections to maintain)
   */
  poolSize?: number;
  
  /**
   * Idle timeout in milliseconds for connections in the pool
   */
  idleTimeout?: number;
  
  /**
   * Additional configuration options that can be used by adapters
   * or other components
   */
  [key: string]: any;
}