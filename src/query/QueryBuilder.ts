import {
  DatabaseAdapter,
  QueryParam,
  QueryResult,
} from "../interfaces/DatabaseAdapter.ts";

// Enhanced operator types for more expressive queries
type ConditionOperator =
  | "="
  | ">"
  | "<"
  | ">="
  | "<="
  | "<>"
  | "!="
  | "LIKE"
  | "NOT LIKE"
  | "ILIKE"
  | "IN"
  | "NOT IN"
  | "BETWEEN"
  | "NOT BETWEEN"
  | "IS NULL"
  | "IS NOT NULL"
  | "EXISTS"
  | "NOT EXISTS";

// Advanced join types
type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL" | "CROSS";

// Aggregate functions for analytics
type AggregateOperationType = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

// Cast the parameters to match the expected types when necessary
// To properly handle arrays of values as parameters while staying compatible with the database adapter
export type ExtendedQueryParam = QueryParam | QueryParam[];

interface WhereCondition {
  column: string;
  operator: ConditionOperator;
  value: ExtendedQueryParam;
  logicalOperator?: "AND" | "OR";
}

interface JoinClause {
  type: JoinType;
  table: string;
  on: {
    leftColumn: string;
    operator: "=" | "<>" | ">" | "<" | ">=" | "<=";
    rightColumn: string;
  };
}

interface OrderByClause {
  column: string;
  direction: "ASC" | "DESC";
  nulls?: "FIRST" | "LAST";
}

interface GroupByClause {
  columns: string[];
}

interface HavingCondition {
  column: string;
  operator: ConditionOperator;
  value: ExtendedQueryParam;
  logicalOperator?: "AND" | "OR";
}

// Enhanced vector operation types for AI/ML
interface VectorOperation {
  column: string;
  operation:
    | "KNN"
    | "DISTANCE"
    | "SIMILARITY"
    | "VECTOR_MATCH"
    | "EMBEDDING_SEARCH"
    | "CUSTOM";
  vector: number[] | string;
  options?: {
    metric?: string;
    k?: number;
    threshold?: number;
    efSearch?: number;
    customSyntax?: string;
    additionalParams?: Record<string, unknown>;
    returnRankingScore?: boolean;
  };
}

// Vector DB configuration interface
interface VectorDBConfig {
  // SQL template for KNN search
  knnSyntax: string;

  // SQL template for distance calculation
  distanceSyntax: string;

  // SQL template for similarity calculation
  similaritySyntax: string;

  // SQL template for vector matching
  vectorMatchSyntax: string;

  // SQL template for embedding search
  embeddingSearchSyntax: string;

  // Vector formatting function to convert array to DB-specific format
  formatVector: (vector: number[] | string) => string;

  // Default options
  defaultMetric: string;
  defaultK: number;
  defaultThreshold: number;
  defaultEfSearch?: number;

  // Where to place vector operations in query
  placement: "WHERE" | "ORDER_BY" | "SELECT" | "CUSTOM";

  // Custom formatter for complex database-specific syntax
  customFormatter?: (_op: VectorOperation, paramIndex: number) => {
    clause: string;
    params: QueryParam[];
    nextParamIndex: number;
  };
}

// Metadata for AI reasoning
interface QueryMetadata {
  purpose?: string;
  description?: string;
  entityMapping?: Record<string, string>;
  tags?: string[];
  aiHints?: Record<string, unknown>;
  // Properties for bulk insert operation
  bulkInsertRows?: number;
  bulkInsertColumns?: number;
}

export interface MockQueryResult {
  query: string;
  params: QueryParam[];
}

/**
 * Interface for window function operations
 */
interface WindowFunction {
  column: string;
  function: string;
  partitionBy: string[];
  orderBy: { column: string; direction?: "ASC" | "DESC" }[];
  alias: string;
}

/**
 * Interface for aggregate functions
 */
interface AggregateFunction {
  type: string;
  expression: string;
  alias: string;
}

/**
 * Interface for JSON operations
 */
interface JsonOperation {
  column: string;
  path: string;
  alias: string;
}

/**
 * Interface for full-text search
 */
interface TextSearch {
  columns: string[];
  query: string;
  language: string;
  config?: string;
}

/**
 * Interface for recursive CTEs
 */
interface RecursiveCte {
  name: string;
  baseQuery: QueryBuilder;
  recursiveQuery: QueryBuilder;
}

/**
 * Interface for case expressions
 */
interface CaseExpression {
  column: string;
  cases: Array<{ when: string | Record<string, QueryParam>; then: QueryParam }>;
  defaultValue: QueryParam;
  alias: string;
}

/**
 * Interface for raw SQL
 */
interface RawSql {
  sql: string;
  params: QueryParam[];
  paramIndex: number;
}

/**
 * Interface for hybrid ranking parameters
 */
interface HybridRanking {
  weights: Record<string, number>;
}

export class QueryBuilder {
  private queryParts: {
    type?: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
    table?: string;
    columns?: string[];
    values?: QueryParam[];
    set?: Record<string, QueryParam>;
    where?: WhereCondition[];
    joins?: JoinClause[];
    orderBy?: OrderByClause[];
    groupBy?: GroupByClause;
    having?: HavingCondition[];
    limit?: number;
    offset?: number;
    cte?: Map<string, QueryBuilder>;
    union?: QueryBuilder[];
    distinct?: boolean;
    vectorOperations?: VectorOperation[];
    returning?: string[];
    subqueries?: Map<string, QueryBuilder>;
    metadata?: QueryMetadata;
    rawSql?: RawSql[];
    windows?: WindowFunction[];
    aggregates?: AggregateFunction[];
    jsonOperations?: JsonOperation[];
    textSearch?: TextSearch[];
    recursiveCte?: RecursiveCte[];
    caseExpressions?: CaseExpression[];
    hybridRanking?: HybridRanking;
    activeVectorDBConfig?: string;
  } = {};

  private params: QueryParam[] = [];
  private paramCounter = 1;

  // Track the query generation for caching
  private queryHash?: string;
  private cachedResult?: QueryResult;

  // In the QueryBuilder class, add this static property for vector database configurations

  private static vectorDBConfigs: Record<string, VectorDBConfig> = {
    // PostgreSQL with pgvector extension
    "pgvector": {
      knnSyntax:
        "{column} <-> {vector}::vector ORDER BY {column} <-> {vector}::vector LIMIT {k}",
      distanceSyntax: "{column} <-> {vector}::vector AS distance",
      similaritySyntax: "1 - ({column} <=> {vector}::vector) AS similarity",
      vectorMatchSyntax: "{column} <-> {vector}::vector < {threshold}",
      embeddingSearchSyntax: "{column} <=> {vector}::vector AS score",
      formatVector: (vector) => {
        if (typeof vector === "string") return vector;
        return `'[${vector.join(",")}]'`;
      },
      defaultMetric: "cosine",
      defaultK: 10,
      defaultThreshold: 0.3,
      placement: "ORDER_BY",
    },

    // SQLite with sqlite-vss extension
    "sqlite-vss": {
      knnSyntax: "vss_search({column}, {vector}, {k}, '{metric}') AS distance",
      distanceSyntax:
        "vss_distance({column}, {vector}, '{metric}') AS distance",
      similaritySyntax:
        "vss_similarity({column}, {vector}, '{metric}') AS similarity",
      vectorMatchSyntax:
        "vss_distance({column}, {vector}, '{metric}') < {threshold}",
      embeddingSearchSyntax:
        "vss_search({column}, {vector}, {k}, '{metric}') AS score",
      formatVector: (vector) => {
        if (typeof vector === "string") return vector;
        return `'${JSON.stringify(vector)}'`;
      },
      defaultMetric: "cosine",
      defaultK: 10,
      defaultThreshold: 0.3,
      placement: "WHERE",
    },

    // Default configuration - generic SQL-compatible syntax
    "default": {
      knnSyntax: "SIMILARITY({column}, {vector}) DESC LIMIT {k}",
      distanceSyntax: "DISTANCE({column}, {vector}) AS distance",
      similaritySyntax: "SIMILARITY({column}, {vector}) AS similarity",
      vectorMatchSyntax: "SIMILARITY({column}, {vector}) > {threshold}",
      embeddingSearchSyntax: "SIMILARITY({column}, {vector}) AS score",
      formatVector: (vector) => {
        if (typeof vector === "string") return vector;
        return `'[${vector.join(",")}]'`;
      },
      defaultMetric: "cosine",
      defaultK: 10,
      defaultThreshold: 0.3,
      placement: "WHERE",
    },
  };

  // Active vector DB configuration
  private static activeVectorDBConfig = "default";

  /**
   * Set the active vector database configuration
   * @param dbType The vector database type (e.g., "pgvector", "sqlite-vss")
   */
  static setVectorDBConfig(dbType: string): void {
    if (!QueryBuilder.vectorDBConfigs[dbType]) {
      console.warn(
        `Vector database configuration for "${dbType}" not found. Using default.`,
      );
      QueryBuilder.activeVectorDBConfig = "default";
    } else {
      QueryBuilder.activeVectorDBConfig = dbType;
    }
  }

  /**
   * Register a custom vector database configuration
   * @param name The configuration name
   * @param config The vector database configuration
   */
  static registerVectorDBConfig(name: string, config: VectorDBConfig): void {
    QueryBuilder.vectorDBConfigs[name] = config;
  }

  /**
   * Get the current vector database configuration
   * @returns The active configuration name
   */
  static getActiveVectorDBConfig(): string {
    return QueryBuilder.activeVectorDBConfig;
  }

  /**
   * Initialize a new QueryBuilder with optional metadata for AI/ML integration
   */
  constructor(metadata?: QueryMetadata) {
    if (metadata) {
      this.queryParts.metadata = metadata;
    }
  }

  /**
   * Select columns from a table
   * @param columns Array of column names or * for all columns
   * @param distinct Whether to select distinct values only
   */
  select(columns: string[] | "*", distinct = false): this {
    this.queryParts.type = "SELECT";
    this.queryParts.columns = Array.isArray(columns) ? columns : [columns];
    this.queryParts.distinct = distinct;
    return this;
  }

  /**
   * Select distinct values from columns
   * @param columns Array of column names
   */
  selectDistinct(columns: string[] | "*"): this {
    return this.select(columns, true);
  }

  /**
   * Insert data into a table
   * @param table Table name
   * @param data Record containing column-value pairs
   */
  insert(table: string, data: Record<string, QueryParam>): this {
    this.queryParts.type = "INSERT";
    this.queryParts.table = table;
    this.queryParts.columns = Object.keys(data);
    this.queryParts.values = Object.values(data);
    return this;
  }

  /**
   * Bulk insert data into a table
   * @param table Table name
   * @param columns Array of column names
   * @param values Array of value arrays
   */
  bulkInsert(
    table: string,
    columns: string[],
    values: QueryParam[][],
  ): this {
    this.queryParts.type = "INSERT";
    this.queryParts.table = table;
    this.queryParts.columns = columns;

    // Store the flattened values for parameterized query
    this.queryParts.values = values.flat();

    // Store the original row structure for proper SQL generation
    if (!this.queryParts.metadata) {
      this.queryParts.metadata = {};
    }
    this.queryParts.metadata.bulkInsertRows = values.length;
    this.queryParts.metadata.bulkInsertColumns = columns.length;

    return this;
  }

  /**
   * Update data in a table
   * @param table Table name
   * @param data Record containing column-value pairs to update
   */
  update(table: string, data: Record<string, QueryParam>): this {
    this.queryParts.type = "UPDATE";
    this.queryParts.table = table;
    this.queryParts.set = data;
    return this;
  }

  /**
   * Delete records from a table
   * @param table Table name
   */
  delete(table: string): this {
    this.queryParts.type = "DELETE";
    this.queryParts.table = table;
    return this;
  }

  /**
   * Specify the table to query from
   * @param table Table name or subquery
   * @param alias Optional alias for the table
   */
  from(table: string | QueryBuilder, alias?: string): this {
    if (typeof table === "string") {
      this.queryParts.table = alias ? `${table} AS ${alias}` : table;
    } else {
      // Handle subquery in FROM clause
      const subquery = table;
      if (!this.queryParts.subqueries) {
        this.queryParts.subqueries = new Map();
      }

      const subqueryName = alias ||
        `subquery_${this.queryParts.subqueries.size + 1}`;
      this.queryParts.subqueries.set(subqueryName, subquery);
      this.queryParts.table = `(${subqueryName}) AS ${alias || subqueryName}`;
    }
    return this;
  }

  /**
   * Add a WHERE condition to the query
   */
  where(
    column: string,
    operator: ConditionOperator,
    value: QueryParam,
    logicalOperator?: "AND" | "OR",
  ): this;
  where(conditions: Record<string, QueryParam>): this;
  where(
    columnOrConditions: string | Record<string, QueryParam>,
    operator?: ConditionOperator,
    value?: QueryParam,
    logicalOperator?: "AND" | "OR",
  ): this {
    if (!this.queryParts.where) {
      this.queryParts.where = [];
    }

    if (
      typeof columnOrConditions === "string" && operator && value !== undefined
    ) {
      // Single condition
      this.queryParts.where.push({
        column: columnOrConditions,
        operator,
        value,
        logicalOperator,
      });
    } else if (typeof columnOrConditions === "object") {
      // Multiple conditions as object
      const newConditions = Object.entries(columnOrConditions).map((
        [col, val],
      ) => ({
        column: col,
        operator: "=" as ConditionOperator,
        value: val,
      }));
      this.queryParts.where.push(...newConditions);
    }
    return this;
  }

  /**
   * Add an OR WHERE condition
   */
  orWhere(
    column: string,
    operator: ConditionOperator,
    value: QueryParam,
  ): this {
    return this.where(column, operator, value, "OR");
  }

  /**
   * Add a WHERE IN condition
   */
  whereIn(column: string, values: QueryParam[]): this {
    if (!this.queryParts.where) {
      this.queryParts.where = [];
    }

    // Convert the array for compatibility with the interface
    const valuesArray = values as ExtendedQueryParam;

    this.queryParts.where.push({
      column,
      operator: "IN",
      value: valuesArray,
    });

    return this;
  }

  /**
   * Add a WHERE NOT IN condition
   */
  whereNotIn(column: string, values: QueryParam[]): this {
    if (!this.queryParts.where) {
      this.queryParts.where = [];
    }

    // Convert the array for compatibility with the interface
    const valuesArray = values as ExtendedQueryParam;

    this.queryParts.where.push({
      column,
      operator: "NOT IN",
      value: valuesArray,
    });

    return this;
  }

  /**
   * Add a WHERE BETWEEN condition
   */
  whereBetween(column: string, min: QueryParam, max: QueryParam): this {
    if (!this.queryParts.where) {
      this.queryParts.where = [];
    }

    // Convert the array for compatibility with the interface
    const valueArray = [min, max] as ExtendedQueryParam;

    this.queryParts.where.push({
      column,
      operator: "BETWEEN",
      value: valueArray,
    });

    return this;
  }

  /**
   * Add a WHERE NULL condition
   */
  whereNull(column: string): this {
    if (!this.queryParts.where) {
      this.queryParts.where = [];
    }

    this.queryParts.where.push({
      column,
      operator: "IS NULL",
      value: null,
    });

    return this;
  }

  /**
   * Add a WHERE NOT NULL condition
   */
  whereNotNull(column: string): this {
    if (!this.queryParts.where) {
      this.queryParts.where = [];
    }

    this.queryParts.where.push({
      column,
      operator: "IS NOT NULL",
      value: null,
    });

    return this;
  }

  /**
   * Add a JOIN clause to the query
   */
  join(
    table: string,
    onCondition: string,
    operator?: "=" | "<>" | ">" | "<" | ">=" | "<=",
    rightColumn?: string,
    type: JoinType = "INNER",
  ): this {
    if (!this.queryParts.joins) {
      this.queryParts.joins = [];
    }

    // Handle both simplified "table.column = other_table.column" syntax
    // and the more explicit column/operator/column syntax
    if (operator && rightColumn) {
      // Traditional syntax with separate parameters
      this.queryParts.joins.push({
        type,
        table,
        on: {
          leftColumn: onCondition,
          operator,
          rightColumn,
        },
      });
    } else {
      // Simplified syntax with a single condition string like "users.id = posts.user_id"
      const conditionParts = onCondition.split(/\s*(=|<>|>|<|>=|<=)\s*/);
      if (conditionParts.length !== 3) {
        throw new Error(
          `Invalid join condition format: ${onCondition}. Expected format: "leftColumn operator rightColumn"`,
        );
      }

      this.queryParts.joins.push({
        type,
        table,
        on: {
          leftColumn: conditionParts[0].trim(),
          operator: conditionParts[1].trim() as
            | "="
            | "<>"
            | ">"
            | "<"
            | ">="
            | "<=",
          rightColumn: conditionParts[2].trim(),
        },
      });
    }

    return this;
  }

  /**
   * Add an INNER JOIN clause
   */
  innerJoin(
    table: string,
    leftColumn: string,
    operator: "=" | "<>" | ">" | "<" | ">=" | "<=",
    rightColumn: string,
  ): this {
    return this.join(table, leftColumn, operator, rightColumn, "INNER");
  }

  /**
   * Add a LEFT JOIN clause
   */
  leftJoin(
    table: string,
    leftColumn: string,
    operator: "=" | "<>" | ">" | "<" | ">=" | "<=",
    rightColumn: string,
  ): this {
    return this.join(table, leftColumn, operator, rightColumn, "LEFT");
  }

  /**
   * Add a RIGHT JOIN clause
   */
  rightJoin(
    table: string,
    leftColumn: string,
    operator: "=" | "<>" | ">" | "<" | ">=" | "<=",
    rightColumn: string,
  ): this {
    return this.join(table, leftColumn, operator, rightColumn, "RIGHT");
  }

  /**
   * Add a FULL JOIN clause
   */
  fullJoin(
    table: string,
    leftColumn: string,
    operator: "=" | "<>" | ">" | "<" | ">=" | "<=",
    rightColumn: string,
  ): this {
    return this.join(table, leftColumn, operator, rightColumn, "FULL");
  }

  /**
   * Add a GROUP BY clause
   */
  groupBy(...columns: (string | string[])[]): this {
    if (!this.queryParts.groupBy) {
      this.queryParts.groupBy = { columns: [] };
    }

    // Handle both string and string[] arguments
    columns.forEach((col: string | string[]) => {
      if (Array.isArray(col)) {
        this.queryParts.groupBy!.columns.push(...col);
      } else {
        this.queryParts.groupBy!.columns.push(col);
      }
    });

    return this;
  }

  /**
   * Add a HAVING clause
   */
  having(
    column: string,
    operator: ConditionOperator,
    value: QueryParam | QueryParam[],
    logicalOperator?: "AND" | "OR",
  ): this {
    if (!this.queryParts.having) {
      this.queryParts.having = [];
    }

    this.queryParts.having.push({
      column,
      operator,
      value,
      logicalOperator,
    });

    return this;
  }

  /**
   * Add ordering to the query
   */
  orderBy(
    column: string,
    direction: "ASC" | "DESC" = "ASC",
    nulls?: "FIRST" | "LAST",
  ): this {
    if (!this.queryParts.orderBy) {
      this.queryParts.orderBy = [];
    }

    this.queryParts.orderBy.push({
      column,
      direction,
      nulls,
    });

    return this;
  }

  /**
   * Add a LIMIT clause
   */
  limit(count: number): this {
    this.queryParts.limit = count;
    return this;
  }

  /**
   * Add an OFFSET clause
   */
  offset(count: number): this {
    this.queryParts.offset = count;
    return this;
  }

  /**
   * Add pagination
   */
  paginate(page: number, perPage: number): this {
    const offset = (page - 1) * perPage;
    return this.limit(perPage).offset(offset);
  }

  /**
   * Add a WITH clause (Common Table Expression)
   */
  with(name: string, query: QueryBuilder): this {
    if (!this.queryParts.cte) {
      this.queryParts.cte = new Map();
    }

    this.queryParts.cte.set(name, query);
    return this;
  }

  /**
   * Add a UNION clause
   */
  union(query: QueryBuilder): this {
    if (!this.queryParts.union) {
      this.queryParts.union = [];
    }

    this.queryParts.union.push(query);
    return this;
  }

  /**
   * Add a RETURNING clause for INSERT, UPDATE, DELETE
   */
  returning(columns: string[]): this {
    this.queryParts.returning = columns;
    return this;
  }

  /**
   * Add vector operations for AI/ML queries
   */
  vectorOperation(
    column: string,
    operation:
      | "KNN"
      | "DISTANCE"
      | "SIMILARITY"
      | "VECTOR_MATCH"
      | "EMBEDDING_SEARCH"
      | "CUSTOM",
    vector: number[] | string,
    options?: {
      metric?: string;
      k?: number;
      threshold?: number;
      efSearch?: number;
      customSyntax?: string;
      additionalParams?: Record<string, unknown>;
      returnRankingScore?: boolean;
    },
  ): this {
    if (!this.queryParts.vectorOperations) {
      this.queryParts.vectorOperations = [];
    }

    this.queryParts.vectorOperations.push({
      column,
      operation,
      vector,
      options,
    });

    return this;
  }

  /**
   * Add K-Nearest Neighbors search for vector similarity
   * @param column Column containing vector data
   * @param vector Query vector (embedding)
   * @param k Number of nearest neighbors to return
   * @param metric Distance metric to use
   */
  knnSearch(
    column: string,
    vector: number[] | string,
    k?: number,
    metric?: string,
  ): this {
    const config =
      QueryBuilder.vectorDBConfigs[QueryBuilder.activeVectorDBConfig];
    return this.vectorOperation(column, "KNN", vector, {
      k: k ?? config.defaultK,
      metric: metric ?? config.defaultMetric,
    });
  }

  /**
   * Calculate vector similarity between query vector and database vectors
   * @param column Column containing vector data
   * @param vector Query vector (embedding)
   * @param metric Distance metric to use
   */
  similaritySearch(
    column: string,
    vector: number[] | string,
    metric?: string,
  ): this {
    const config =
      QueryBuilder.vectorDBConfigs[QueryBuilder.activeVectorDBConfig];
    return this.vectorOperation(column, "SIMILARITY", vector, {
      metric: metric ?? config.defaultMetric,
      returnRankingScore: true,
    });
  }

  /**
   * Calculate vector distance between query vector and database vectors
   * @param column Column containing vector data
   * @param vector Query vector (embedding)
   * @param metric Distance metric to use
   */
  distanceSearch(
    column: string,
    vector: number[] | string,
    metric?: string,
  ): this {
    const config =
      QueryBuilder.vectorDBConfigs[QueryBuilder.activeVectorDBConfig];
    return this.vectorOperation(column, "DISTANCE", vector, {
      metric: metric ?? config.defaultMetric,
      returnRankingScore: true,
    });
  }

  /**
   * Match records where vector similarity exceeds threshold
   * @param column Column containing vector data
   * @param vector Query vector (embedding)
   * @param threshold Similarity threshold (0-1)
   * @param metric Distance metric to use
   */
  vectorMatch(
    column: string,
    vector: number[] | string,
    threshold?: number,
    metric?: string,
  ): this {
    const config =
      QueryBuilder.vectorDBConfigs[QueryBuilder.activeVectorDBConfig];
    return this.vectorOperation(column, "VECTOR_MATCH", vector, {
      threshold: threshold ?? config.defaultThreshold,
      metric: metric ?? config.defaultMetric,
    });
  }

  /**
   * Custom vector operation with raw syntax
   * @param column Column containing vector data
   * @param vector Query vector (embedding)
   * @param customSyntax Custom SQL syntax template
   * @param additionalParams Additional parameters
   */
  customVectorOperation(
    column: string,
    vector: number[] | string,
    customSyntax: string,
    additionalParams?: Record<string, unknown>,
  ): this {
    return this.vectorOperation(column, "CUSTOM", vector, {
      customSyntax,
      additionalParams,
    });
  }

  /**
   * Add a raw SQL clause to the query
   * This allows for database-specific functionality not covered by other methods
   * @param sql Raw SQL string to include in the query
   * @param params Optional parameters to bind to the raw SQL
   */
  rawSql(sql: string, params: QueryParam[] = []): this {
    // Store the raw SQL and params for later inclusion in the query build
    if (!this.queryParts.rawSql) {
      this.queryParts.rawSql = [];
    }

    this.queryParts.rawSql.push({
      sql,
      params,
      paramIndex: this.paramCounter,
    });

    // Update the parameter counter
    this.paramCounter += params.length;

    return this;
  }

  /**
   * Add a window function to the query
   * @param column Column or expression to apply the window function to
   * @param windowFunction Window function (e.g., ROW_NUMBER, RANK, DENSE_RANK)
   * @param partitionBy Columns to partition by
   * @param orderBy Column(s) to order by within the partition
   * @param alias Alias for the window function result
   */
  window(
    column: string,
    windowFunction: string,
    partitionBy?: string | string[],
    orderBy?: { column: string; direction?: "ASC" | "DESC" }[],
    alias?: string,
  ): this {
    // Ensure type is SELECT for window functions
    this.queryParts.type = "SELECT";

    if (!this.queryParts.windows) {
      this.queryParts.windows = [];
    }

    const partitionColumns = partitionBy
      ? (Array.isArray(partitionBy) ? partitionBy : [partitionBy])
      : [];

    this.queryParts.windows.push({
      column,
      function: windowFunction,
      partitionBy: partitionColumns,
      orderBy: orderBy || [],
      alias: alias || `${windowFunction.toLowerCase()}_result`,
    });

    return this;
  }

  /**
   * Add a common aggregate query for counting records
   * @param column Column to count (defaults to *)
   * @param distinct Whether to count distinct values only
   * @param alias Alias for the count column
   */
  count(
    column: string = "*",
    distinct: boolean = false,
    alias: string = "count",
  ): this {
    // Set type to SELECT for aggregate functions
    this.queryParts.type = "SELECT";

    if (!this.queryParts.aggregates) {
      this.queryParts.aggregates = [];
    }

    const distinctText = distinct ? "DISTINCT " : "";
    this.queryParts.aggregates.push({
      type: "COUNT",
      expression: `COUNT(${distinctText}${column})`,
      alias,
    });

    return this;
  }

  /**
   * Add a sum aggregate function
   * @param column Column to sum
   * @param alias Alias for the result
   */
  sum(column: string, alias: string = "sum"): this {
    // Set type to SELECT for aggregate functions
    this.queryParts.type = "SELECT";

    if (!this.queryParts.aggregates) {
      this.queryParts.aggregates = [];
    }

    this.queryParts.aggregates.push({
      type: "SUM",
      expression: `SUM(${column})`,
      alias,
    });

    return this;
  }

  /**
   * Add an average aggregate function
   * @param column Column to average
   * @param alias Alias for the result
   */
  avg(column: string, alias: string = "avg"): this {
    // Set type to SELECT for aggregate functions
    this.queryParts.type = "SELECT";

    if (!this.queryParts.aggregates) {
      this.queryParts.aggregates = [];
    }

    this.queryParts.aggregates.push({
      type: "AVG",
      expression: `AVG(${column})`,
      alias,
    });

    return this;
  }

  /**
   * Add a min aggregate function
   * @param column Column to find minimum value of
   * @param alias Alias for the result
   */
  min(column: string, alias: string = "min"): this {
    // Set type to SELECT for aggregate functions
    this.queryParts.type = "SELECT";

    if (!this.queryParts.aggregates) {
      this.queryParts.aggregates = [];
    }

    this.queryParts.aggregates.push({
      type: "MIN",
      expression: `MIN(${column})`,
      alias,
    });

    return this;
  }

  /**
   * Add a max aggregate function
   * @param column Column to find maximum value of
   * @param alias Alias for the result
   */
  max(column: string, alias: string = "max"): this {
    // Set type to SELECT for aggregate functions
    this.queryParts.type = "SELECT";

    if (!this.queryParts.aggregates) {
      this.queryParts.aggregates = [];
    }

    this.queryParts.aggregates.push({
      type: "MAX",
      expression: `MAX(${column})`,
      alias,
    });

    return this;
  }

  /**
   * Add a JSON path extraction operation (PostgreSQL specific)
   * @param column JSON/JSONB column to extract from
   * @param path JSON path expression
   * @param alias Alias for the extracted value
   */
  jsonPath(column: string, path: string, alias: string): this {
    if (!this.queryParts.jsonOperations) {
      this.queryParts.jsonOperations = [];
    }

    this.queryParts.jsonOperations.push({
      column,
      path,
      alias,
    });

    return this;
  }

  /**
   * Add full-text search capability
   * @param columns Columns to search in
   * @param query Search query text
   * @param language Language for text search (default: english)
   * @param config Text search configuration (PostgreSQL specific)
   */
  textSearch(
    columns: string[],
    query: string,
    language: string = "english",
    config?: string,
  ): this {
    if (!this.queryParts.textSearch) {
      this.queryParts.textSearch = [];
    }

    this.queryParts.textSearch.push({
      columns,
      query,
      language,
      config,
    });

    return this;
  }

  /**
   * Add recursive CTE for hierarchical data
   * @param name Name for the CTE
   * @param baseQuery Base query for the recursive CTE (non-recursive term)
   * @param recursiveQuery Recursive query that references the CTE name
   */
  withRecursive(
    name: string,
    baseQuery: QueryBuilder,
    recursiveQuery: QueryBuilder,
  ): this {
    if (!this.queryParts.recursiveCte) {
      this.queryParts.recursiveCte = [];
    }

    this.queryParts.recursiveCte.push({
      name,
      baseQuery,
      recursiveQuery,
    });

    return this;
  }

  /**
   * Add time-based range filtering for temporal data
   * @param column Date/timestamp column to filter on
   * @param range Time range specification (e.g., 'today', 'last_week')
   */
  timeRange(column: string, range: string): this {
    const today = new Date();
    // Convert dates to ISO strings which are compatible with the QueryParam type
    let startDate: string;
    let endDate: string;

    // Calculate dates based on the specified range
    switch (range.toLowerCase()) {
      case "today": {
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        startDate = start.toISOString();

        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
        break;
      }
      case "yesterday": {
        const start = new Date(today);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        startDate = start.toISOString();

        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
        break;
      }
      case "this_week": {
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        startDate = start.toISOString();

        const end = new Date(today);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
        break;
      }
      case "last_week": {
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        startDate = start.toISOString();

        const end = new Date(today);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
        break;
      }
      case "this_month": {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = start.toISOString();

        const end = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        endDate = end.toISOString();
        break;
      }
      case "last_month": {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate = start.toISOString();

        const end = new Date(
          today.getFullYear(),
          today.getMonth(),
          0,
          23,
          59,
          59,
          999,
        );
        endDate = end.toISOString();
        break;
      }
      default:
        throw new Error(`Unsupported time range: ${range}`);
    }

    // Apply the date range as a between condition with ISO string dates
    return this.whereBetween(column, startDate, endDate);
  }

  /**
   * Add a conditional expression (CASE WHEN) to the query
   * @param column Base column for the expression
   * @param cases Array of condition-value pairs
   * @param defaultValue Default value if no conditions match
   * @param alias Alias for the result
   */
  case(
    column: string,
    cases: Array<
      { when: string | Record<string, QueryParam>; then: QueryParam }
    >,
    defaultValue: QueryParam,
    alias: string,
  ): this {
    if (!this.queryParts.caseExpressions) {
      this.queryParts.caseExpressions = [];
    }

    this.queryParts.caseExpressions.push({
      column,
      cases,
      defaultValue,
      alias,
    });

    return this;
  }

  /**
   * Add support for vector comparison with cosine similarity for AI/ML
   * @param column Column containing embeddings/vectors
   * @param vector Query vector to compare against
   * @param similarity Minimum similarity threshold (0-1)
   */
  cosineSimilarity(
    column: string,
    vector: number[],
    similarity: number = 0.5,
  ): this {
    // This delegates to the more generic vectorMatch with cosine metric
    return this.vectorMatch(column, vector, similarity, "cosine");
  }

  /**
   * Add a geospatial search for location-based queries
   * @param latColumn Latitude column
   * @param lngColumn Longitude column
   * @param lat Query point latitude
   * @param lng Query point longitude
   * @param radius Search radius in kilometers
   */
  geoRadius(
    latColumn: string,
    lngColumn: string,
    lat: number,
    lng: number,
    radius: number,
  ): this {
    // Using Haversine formula for distance calculation
    const haversineFormula = `
      6371 * acos(
        cos(radians(${lat})) *
        cos(radians(${latColumn})) *
        cos(radians(${lngColumn}) - radians(${lng})) +
        sin(radians(${lat})) *
        sin(radians(${latColumn}))
      )
    `;

    // Create a raw SQL condition using the Haversine formula
    return this.rawSql(`(${haversineFormula}) <= $${this.paramCounter}`, [
      radius,
    ]);
  }

  /**
   * Add parameters to modify ordering for vector similarity search
   * @param weights Weights to adjust importance of different factors (e.g., recency vs. relevance)
   */
  hybridRanking(weights: Record<string, number>): this {
    if (!this.queryParts.hybridRanking) {
      this.queryParts.hybridRanking = { weights: {} };
    }

    this.queryParts.hybridRanking.weights = {
      ...this.queryParts.hybridRanking.weights,
      ...weights,
    };

    return this;
  }

  /**
   * Create a database transaction for multiple operations
   * @param adapter Database adapter to use for the transaction
   */
  async transaction<T>(
    callback: (builder: QueryBuilder) => Promise<T>,
    adapter: DatabaseAdapter,
  ): Promise<T> {
    try {
      await adapter.beginTransaction();
      const result = await callback(this);
      await adapter.commit();
      return result;
    } catch (error) {
      await adapter.rollback();
      throw error;
    }
  }

  /**
   * Update the vector database configuration for the current query
   * This allows switching vector DB config for a specific query without changing the global setting
   */
  useVectorDB(configName: string): this {
    if (!QueryBuilder.vectorDBConfigs[configName]) {
      console.warn(
        `Vector database configuration "${configName}" not found. Using current configuration.`,
      );
      return this;
    }

    this.queryParts.activeVectorDBConfig = configName;
    return this;
  }

  /**
   * Add an AND WHERE condition
   */
  andWhere(
    column: string,
    operator: ConditionOperator,
    value: QueryParam,
  ): this {
    return this.where(column, operator, value, "AND");
  }

  // ... existing code for building the various query parts ...

  private buildSelect(): { query: string; params: QueryParam[] } {
    // Use the base implementation to get initial query components
    const baseResult = this.buildBaseSelect();
    let query = baseResult.query;
    const params: QueryParam[] = [...baseResult.params];
    let paramIndex = params.length + 1;

    // Process window functions
    if (this.queryParts.windows && this.queryParts.windows.length > 0) {
      const windowClauses: string[] = [];

      for (const win of this.queryParts.windows) {
        let partitionClause = "";
        if (win.partitionBy.length > 0) {
          partitionClause = `PARTITION BY ${win.partitionBy.join(", ")}`;
        }

        let orderClause = "";
        if (win.orderBy.length > 0) {
          const orderParts = win.orderBy.map((order) =>
            `${order.column} ${order.direction || "ASC"}`
          );
          orderClause = `ORDER BY ${orderParts.join(", ")}`;
        }

        const overClause = [partitionClause, orderClause]
          .filter(Boolean)
          .join(" ");

        windowClauses.push(
          `${win.function} OVER (${overClause}) AS ${win.alias}`,
        );
      }

      // Add window functions to SELECT clause
      if (windowClauses.length > 0) {
        // If we're selecting *, add table prefix to avoid conflicts
        if (query.includes("SELECT *")) {
          query = query.replace(
            "SELECT *",
            `SELECT *, ${windowClauses.join(", ")}`,
          );
        } else {
          // Extract the columns part from the SELECT clause
          const columnsMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
          if (columnsMatch && columnsMatch[1]) {
            const columns = columnsMatch[1];
            query = query.replace(
              `SELECT ${columns}`,
              `SELECT ${columns}, ${windowClauses.join(", ")}`,
            );
          }
        }
      }
    }

    // Process aggregates if they exist and we're not already using them
    if (this.queryParts.aggregates && this.queryParts.aggregates.length > 0) {
      // Only add aggregates if we're not already using GROUP BY
      // Otherwise, we assume the query is already set up for aggregation
      if (!query.includes("GROUP BY")) {
        const aggregateClauses = this.queryParts.aggregates.map((agg) =>
          `${agg.expression} AS ${agg.alias}`
        );

        // Replace the SELECT clause
        query = query.replace(
          /SELECT\s+.+?\s+FROM/i,
          `SELECT ${aggregateClauses.join(", ")} FROM`,
        );
      }
    }

    // Process JSON operations
    if (
      this.queryParts.jsonOperations &&
      this.queryParts.jsonOperations.length > 0
    ) {
      const jsonClauses = this.queryParts.jsonOperations.map((op) => {
        // PostgreSQL JSON path extraction syntax
        return `${op.column}->>'${op.path}' AS ${op.alias}`;
      });

      // Add JSON operations to SELECT clause
      const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
      if (selectMatch && selectMatch[1]) {
        const columns = selectMatch[1];
        query = query.replace(
          `SELECT ${columns}`,
          `SELECT ${columns}, ${jsonClauses.join(", ")}`,
        );
      }
    }

    // Process case expressions
    if (
      this.queryParts.caseExpressions &&
      this.queryParts.caseExpressions.length > 0
    ) {
      const caseClauses = this.queryParts.caseExpressions.map((caseExpr) => {
        let caseClause = "CASE ";

        for (const { when, then } of caseExpr.cases) {
          if (typeof when === "string") {
            caseClause += `WHEN ${when} THEN $${paramIndex++} `;
            params.push(then);
          } else {
            const conditions = Object.entries(when).map(([col, val]) => {
              params.push(val);
              return `${col} = $${paramIndex++}`;
            });
            caseClause += `WHEN ${
              conditions.join(" AND ")
            } THEN $${paramIndex++} `;
            params.push(then);
          }
        }

        caseClause += `ELSE $${paramIndex++} END AS ${caseExpr.alias}`;
        params.push(caseExpr.defaultValue);

        return caseClause;
      });

      // Add case expressions to SELECT clause
      const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
      if (selectMatch && selectMatch[1]) {
        const columns = selectMatch[1];
        query = query.replace(
          `SELECT ${columns}`,
          `SELECT ${columns}, ${caseClauses.join(", ")}`,
        );
      }
    }

    // Process full-text search
    if (this.queryParts.textSearch && this.queryParts.textSearch.length > 0) {
      for (const search of this.queryParts.textSearch) {
        // Generate the text search condition based on database type
        const dbType = this.queryParts.activeVectorDBConfig === "pgvector"
          ? "postgres"
          : "sqlite";

        let searchCondition = "";
        if (dbType === "postgres") {
          // PostgreSQL text search syntax
          const columnList = search.columns.join(" || ' ' || ");
          searchCondition =
            `to_tsvector('${search.language}', ${columnList}) @@ plainto_tsquery('${search.language}', $${paramIndex++})`;
          params.push(search.query);
        } else {
          // SQLite FTS syntax (simplified)
          searchCondition = search.columns.map((col) =>
            `${col} LIKE '%' || $${paramIndex++} || '%'`
          ).join(" OR ");

          // Add parameters for each column
          for (let i = 0; i < search.columns.length; i++) {
            params.push(search.query);
          }
        }

        // Add the search condition to WHERE clause
        if (query.includes(" WHERE ")) {
          query += ` AND (${searchCondition})`;
        } else {
          query += ` WHERE (${searchCondition})`;
        }
      }
    }

    // Process raw SQL
    if (this.queryParts.rawSql && this.queryParts.rawSql.length > 0) {
      for (const raw of this.queryParts.rawSql) {
        // Add the raw SQL to the query at an appropriate location
        if (query.includes(" WHERE ")) {
          query += ` AND (${raw.sql})`;
        } else if (query.includes(" FROM ")) {
          query += ` WHERE (${raw.sql})`;
        }

        // Add parameters
        params.push(...raw.params);
      }
    }

    // Process hybrid ranking if vector operations are present
    if (
      this.queryParts.hybridRanking &&
      this.queryParts.vectorOperations &&
      this.queryParts.vectorOperations.length > 0
    ) {
      const weights = this.queryParts.hybridRanking.weights;
      const vectorWeight = weights.vector || 1.0;
      const recencyWeight = weights.recency || 0.0;
      const popularityWeight = weights.popularity || 0.0;

      // If we have ORDER BY for vector similarity, modify it to include other factors
      if (
        query.includes("ORDER BY") &&
        (query.includes("<->") || query.includes("vss_search"))
      ) {
        // Extract the ORDER BY clause
        const orderByMatch = query.match(/ORDER BY\s+(.*?)(?:\s+LIMIT|\s+$)/i);
        if (orderByMatch && orderByMatch[1]) {
          const originalOrderBy = orderByMatch[1];

          // Build a weighted ranking formula
          let hybridOrderBy = `(${vectorWeight} * (${originalOrderBy}))`;

          // Add recency factor if weight > 0
          if (recencyWeight > 0 && this.queryParts.orderBy) {
            // Assume the first date/timestamp column in ORDER BY is for recency
            const dateColumn = this.queryParts.orderBy.find((order) =>
              order.column.toLowerCase().includes("date") ||
              order.column.toLowerCase().includes("time")
            );

            if (dateColumn) {
              hybridOrderBy +=
                ` + (${recencyWeight} * extract(epoch from now() - ${dateColumn.column}) / 86400.0)`;
            }
          }

          // Add popularity factor if weight > 0
          if (popularityWeight > 0) {
            // Look for a popularity column (views, likes, etc.)
            const popularityColumn = this.queryParts.orderBy?.find((order) =>
              order.column.toLowerCase().includes("view") ||
              order.column.toLowerCase().includes("like") ||
              order.column.toLowerCase().includes("score") ||
              order.column.toLowerCase().includes("popular")
            )?.column || "views";

            hybridOrderBy +=
              ` - (${popularityWeight} * log(${popularityColumn} + 1))`;
          }

          // Replace the original ORDER BY with our hybrid formula
          query = query.replace(
            `ORDER BY ${originalOrderBy}`,
            `ORDER BY ${hybridOrderBy}`,
          );
        }
      }
    }

    // Process vector operations
    const vectorOrderBy: string[] = [];
    const vectorWhere: string[] = [];
    const vectorSelect: string[] = [];
    let hasVectorOperations = false;

    if (
      this.queryParts.vectorOperations &&
      this.queryParts.vectorOperations.length > 0
    ) {
      hasVectorOperations = true;
      const config = QueryBuilder.vectorDBConfigs[
        this.queryParts.activeVectorDBConfig ||
        QueryBuilder.activeVectorDBConfig
      ];

      // Custom formatter handles everything
      if (config.customFormatter) {
        for (const vectorOp of this.queryParts.vectorOperations) {
          const { clause, params: opParams, nextParamIndex: nextIdx } = config
            .customFormatter(vectorOp, paramIndex);

          // Add clause based on vector database configuration placement
          if (config.placement === "WHERE") {
            vectorWhere.push(clause);
          } else if (config.placement === "ORDER_BY") {
            vectorOrderBy.push(clause);
          } else if (config.placement === "SELECT") {
            vectorSelect.push(clause);
          }

          params.push(...opParams);
          paramIndex = nextIdx;
        }
      } else {
        // Handle each vector operation
        for (const op of this.queryParts.vectorOperations) {
          const metric = op.options?.metric ?? config.defaultMetric;
          const k = op.options?.k ?? config.defaultK;
          const threshold = op.options?.threshold ?? config.defaultThreshold;

          // Format the vector according to the DB requirements
          const vectorValue = config.formatVector(op.vector);

          let syntaxTemplate = "";
          switch (op.operation) {
            case "KNN":
              syntaxTemplate = config.knnSyntax;
              break;
            case "DISTANCE":
              syntaxTemplate = config.distanceSyntax;
              break;
            case "SIMILARITY":
              syntaxTemplate = config.similaritySyntax;
              break;
            case "VECTOR_MATCH":
              syntaxTemplate = config.vectorMatchSyntax;
              break;
            case "EMBEDDING_SEARCH":
              syntaxTemplate = config.embeddingSearchSyntax;
              break;
            case "CUSTOM":
              syntaxTemplate = op.options?.customSyntax ??
                "{column} <-> {vector}";
              break;
          }

          // Replace placeholders in template
          let clause = syntaxTemplate
            .replace(/\{column\}/g, op.column)
            .replace(/\{vector\}/g, vectorValue)
            .replace(/\{k\}/g, k.toString())
            .replace(/\{metric\}/g, metric)
            .replace(/\{threshold\}/g, threshold.toString());

          if (
            syntaxTemplate.includes("{efSearch}") &&
            op.options?.efSearch !== undefined
          ) {
            clause = clause.replace(
              /\{efSearch\}/g,
              op.options.efSearch.toString(),
            );
          }

          // Add clause based on vector database configuration placement
          if (config.placement === "WHERE") {
            vectorWhere.push(clause);
          } else if (config.placement === "ORDER_BY") {
            vectorOrderBy.push(clause);
          } else if (config.placement === "SELECT") {
            vectorSelect.push(clause);
          }
        }
      }

      // If we have vector SELECT clauses, we need to modify the SELECT part of the query
      if (vectorSelect.length > 0) {
        // If we're selecting *, replace it with specific table columns to avoid conflicts
        if (query.includes("SELECT *")) {
          query = query.replace(
            "SELECT *",
            `SELECT ${this.queryParts.table}.*`,
          );
        }

        // Add vector selection clauses
        const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
        if (selectMatch && selectMatch[1]) {
          const columns = selectMatch[1];
          query = query.replace(
            `SELECT ${columns}`,
            `SELECT ${columns}, ${vectorSelect.join(", ")}`,
          );
        }
      }

      // Add vector WHERE clauses
      if (vectorWhere.length > 0) {
        query += query.includes("WHERE")
          ? ` AND ${vectorWhere.join(" AND ")}`
          : ` WHERE ${vectorWhere.join(" AND ")}`;
      }

      // Add or modify ORDER BY with vector operations
      if (vectorOrderBy.length > 0) {
        if (query.includes("ORDER BY")) {
          // Extract the ORDER BY clause
          const orderByMatch = query.match(
            /ORDER BY\s+(.*?)(?:\s+LIMIT|\s+$)/i,
          );
          if (orderByMatch && orderByMatch[1]) {
            query = query.replace(
              `ORDER BY ${orderByMatch[1]}`,
              `ORDER BY ${orderByMatch[1]}, ${vectorOrderBy.join(", ")}`,
            );
          }
        } else {
          query += ` ORDER BY ${vectorOrderBy.join(", ")}`;
        }
      }

      // Add LIMIT for vector queries if not already specified
      if (this.queryParts.limit === undefined && hasVectorOperations) {
        if (config.placement === "ORDER_BY") {
          const k = this.queryParts.vectorOperations[0]?.options?.k ??
            config.defaultK;
          if (!query.includes(" LIMIT ")) {
            query += ` LIMIT ${k}`;
          }
        }
      }
    }

    return { query, params };
  }

  private buildInsert(): { query: string; params: QueryParam[] } {
    const columns = this.queryParts.columns!.join(", ");
    let placeholders = "";
    let params: QueryParam[] = [];

    // Handle bulk insert
    if (this.queryParts.metadata?.bulkInsertRows) {
      // Multiple value sets for bulk insert using metadata from bulkInsert method
      const valueSets = [];
      const colCount = this.queryParts.columns!.length;
      const rowCount = this.queryParts.metadata.bulkInsertRows;

      let paramIndex = 1;

      // Create placeholders for each row with proper grouping
      for (let i = 0; i < rowCount; i++) {
        const valueSet = [];
        for (let j = 0; j < colCount; j++) {
          valueSet.push(`$${paramIndex++}`);
        }
        valueSets.push(`(${valueSet.join(", ")})`);
      }

      placeholders = valueSets.join(", ");
      params = this.queryParts.values!;
    } else {
      // Single value set
      placeholders = this.queryParts.values!.map((_, idx) => `$${idx + 1}`)
        .join(", ");
      placeholders = `(${placeholders})`;
      params = this.queryParts.values!;
    }

    let query =
      `INSERT INTO ${this.queryParts.table} (${columns}) VALUES ${placeholders}`;

    // Add RETURNING clause if specified
    if (this.queryParts.returning && this.queryParts.returning.length > 0) {
      query += ` RETURNING ${this.queryParts.returning.join(", ")}`;
    }

    return { query, params };
  }

  // ... other build methods like buildUpdate, buildDelete ...

  /**
   * Helper method to check if a value is a Date object
   */
  private isDate(value: unknown): value is Date {
    return Object.prototype.toString.call(value) === "[object Date]";
  }

  private buildWhereClause(
    conditions: WhereCondition[],
    startParamIndex = 1,
    _clauseType: "WHERE" | "HAVING" = "WHERE", // Prefix with underscore to indicate it's intentionally unused
  ): {
    whereClause: string;
    whereParams: QueryParam[];
    nextParamIndex: number;
  } {
    let paramIndex = startParamIndex;
    const params: QueryParam[] = [];
    const clauses: string[] = [];

    conditions.forEach((cond, idx) => {
      let clause = "";

      // Add logical operator for all except first condition
      if (idx > 0) {
        clause += cond.logicalOperator || "AND";
        clause += " ";
      }

      // Handle special operators that don't need values
      if (cond.operator === "IS NULL" || cond.operator === "IS NOT NULL") {
        clause += `${cond.column} ${cond.operator}`;
        // Don't add params for IS NULL and IS NOT NULL operators
      } // Handle operators that work with arrays
      else if (cond.operator === "IN" || cond.operator === "NOT IN") {
        const rawValues = Array.isArray(cond.value) ? cond.value : [cond.value];

        // Convert any Date objects to ISO strings using safe type checking
        const values = rawValues.map((val) =>
          this.isDate(val) ? val.toISOString() : val
        );

        const placeholders = values.map(() => `$${paramIndex++}`).join(", ");
        clause += `${cond.column} ${cond.operator} (${placeholders})`;
        params.push(...values);
      } // Handle BETWEEN operator
      else if (cond.operator === "BETWEEN" || cond.operator === "NOT BETWEEN") {
        const rawValues = Array.isArray(cond.value)
          ? cond.value
          : [cond.value, cond.value];

        // Convert any Date objects to ISO strings using safe type checking
        const values = rawValues.map((val) =>
          this.isDate(val) ? val.toISOString() : val
        );

        clause +=
          `${cond.column} ${cond.operator} $${paramIndex++} AND $${paramIndex++}`;
        params.push(values[0], values[1]);
      } // Handle normal operators
      else {
        clause += `${cond.column} ${cond.operator} $${paramIndex++}`;

        // Convert Date to ISO string if necessary using safe type checking
        const value = Array.isArray(cond.value) ? cond.value[0] : cond.value;
        params.push(this.isDate(value) ? value.toISOString() : value);
      }

      clauses.push(clause);
    });

    return {
      whereClause: clauses.join(" "),
      whereParams: params,
      nextParamIndex: paramIndex,
    };
  }

  private buildUpdate(): { query: string; params: QueryParam[] } {
    const setEntries = Object.entries(this.queryParts.set!);
    const sets = setEntries.map((entry, idx) => `${entry[0]} = $${idx + 1}`)
      .join(", ");
    let query = `UPDATE ${this.queryParts.table} SET ${sets}`;
    let params = [...setEntries.map((entry) => entry[1])];
    let paramIndex = params.length + 1;

    if (this.queryParts.where && this.queryParts.where.length > 0) {
      const { whereClause, whereParams, nextParamIndex } = this
        .buildWhereClause(
          this.queryParts.where,
          paramIndex,
        );
      query += ` WHERE ${whereClause}`;
      params = [...params, ...whereParams];
      paramIndex = nextParamIndex;
    }

    // Add RETURNING clause if specified
    if (this.queryParts.returning && this.queryParts.returning.length > 0) {
      query += ` RETURNING ${this.queryParts.returning.join(", ")}`;
    }

    return { query, params };
  }

  private buildDelete(): { query: string; params: QueryParam[] } {
    let query = `DELETE FROM ${this.queryParts.table}`;
    let params: QueryParam[] = [];
    let paramIndex = 1;

    if (this.queryParts.where && this.queryParts.where.length > 0) {
      const { whereClause, whereParams, nextParamIndex } = this
        .buildWhereClause(
          this.queryParts.where,
          paramIndex,
        );
      query += ` WHERE ${whereClause}`;
      params = whereParams;
      paramIndex = nextParamIndex;
    }

    // Add RETURNING clause if specified
    if (this.queryParts.returning && this.queryParts.returning.length > 0) {
      query += ` RETURNING ${this.queryParts.returning.join(", ")}`;
    }

    return { query, params };
  }

  /**
   * Converts Date objects to ISO strings for database compatibility
   * This ensures that Date objects are properly handled by the database adapter
   */
  private convertParamsForAdapter(
    params: Array<string | number | boolean | null | undefined | Date>,
  ): QueryParam[] {
    return params.map((param) => {
      if (param instanceof Date) {
        return param.toISOString(); // Convert Date to ISO string for the database
      }
      return param;
    });
  }

  /**
   * Calculate a hash of the current query for caching purposes
   */
  private calculateQueryHash(): string {
    return JSON.stringify(this.queryParts);
  }

  /**
   * Execute the query using the provided database adapter
   */
  async execute(adapter: DatabaseAdapter): Promise<QueryResult> {
    if (!this.queryParts.table) {
      throw new Error("Table name is required");
    }

    // Calculate query hash for potential caching
    this.queryHash = this.calculateQueryHash();

    let builtQuery: { query: string; params: QueryParam[] };

    switch (this.queryParts.type) {
      case "SELECT":
        builtQuery = this.buildSelect();
        break;
      case "INSERT":
        builtQuery = this.buildInsert();
        break;
      case "UPDATE":
        builtQuery = this.buildUpdate();
        break;
      case "DELETE":
        builtQuery = this.buildDelete();
        break;
      default:
        throw new Error("Invalid query type");
    }

    // Convert any Date objects to ISO strings before passing to the database adapter
    const convertedParams = this.convertParamsForAdapter(
      builtQuery.params as Array<
        string | number | boolean | null | undefined | Date
      >,
    );

    const result = await adapter.execute(builtQuery.query, convertedParams);

    // Store the query for debugging
    const formattedResult: QueryResult = {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
      debug: {
        query: builtQuery.query,
        params: convertedParams,
      },
    };

    // Cache the result if needed
    this.cachedResult = formattedResult;

    // Reset state after execution
    this.reset();

    return formattedResult;
  }

  /**
   * Get the raw SQL and parameters without executing the query
   */
  toSQL(): { query: string; params: QueryParam[] } {
    if (!this.queryParts.table) {
      throw new Error("Table name is required");
    }

    switch (this.queryParts.type) {
      case "SELECT":
        return this.buildSelect();
      case "INSERT":
        return this.buildInsert();
      case "UPDATE":
        return this.buildUpdate();
      case "DELETE":
        return this.buildDelete();
      default:
        throw new Error("Invalid query type");
    }
  }

  /**
   * Clone the current query builder for reuse
   */
  clone(): QueryBuilder {
    const clone = new QueryBuilder();
    clone.queryParts = JSON.parse(JSON.stringify(this.queryParts));
    clone.params = [...this.params];
    clone.paramCounter = this.paramCounter;
    return clone;
  }

  /**
   * Reset the query builder state
   */
  private reset(): void {
    // Store metadata for reuse
    const metadata = this.queryParts.metadata;

    this.queryParts = {};
    this.params = [];
    this.paramCounter = 1;

    // Restore metadata if it existed
    if (metadata) {
      this.queryParts.metadata = metadata;
    }
  }

  // Helper method to get the base query before modifications
  private buildBaseSelect(): { query: string; params: QueryParam[] } {
    const distinct = this.queryParts.distinct ? "DISTINCT " : "";

    // Handle the case when we only have aggregates and no columns
    let columnsClause = "";
    if (this.queryParts.columns && this.queryParts.columns.length > 0) {
      columnsClause = this.queryParts.columns.join(", ");
    } else if (
      this.queryParts.aggregates && this.queryParts.aggregates.length > 0
    ) {
      // If we only have aggregates, use them as the columns
      columnsClause = this.queryParts.aggregates.map((agg) =>
        `${agg.expression} AS ${agg.alias}`
      ).join(", ");
    } else {
      // Default to * if no columns or aggregates specified
      columnsClause = "*";
    }

    let query =
      `SELECT ${distinct}${columnsClause} FROM ${this.queryParts.table}`;
    let params: QueryParam[] = [];
    let paramIndex = 1;

    // Add joins if present
    if (this.queryParts.joins && this.queryParts.joins.length > 0) {
      const joinClauses = this.queryParts.joins.map((join) => {
        return `${join.type} JOIN ${join.table} ON ${join.on.leftColumn} ${join.on.operator} ${join.on.rightColumn}`;
      });
      query += ` ${joinClauses.join(" ")}`;
    }

    // Add where clauses
    if (this.queryParts.where && this.queryParts.where.length > 0) {
      const { whereClause, whereParams, nextParamIndex } = this
        .buildWhereClause(
          this.queryParts.where,
          paramIndex,
        );
      query += ` WHERE ${whereClause}`;
      params = whereParams;
      paramIndex = nextParamIndex;
    }

    // Add group by
    if (this.queryParts.groupBy && this.queryParts.groupBy.columns.length > 0) {
      query += ` GROUP BY ${this.queryParts.groupBy.columns.join(", ")}`;
    }

    // Add having
    if (this.queryParts.having && this.queryParts.having.length > 0) {
      const { whereClause, whereParams, nextParamIndex } = this
        .buildWhereClause(
          this.queryParts.having,
          paramIndex,
          "HAVING",
        );
      query += ` HAVING ${whereClause}`;
      params = [...params, ...whereParams];
      paramIndex = nextParamIndex;
    }

    // Add order by
    if (this.queryParts.orderBy && this.queryParts.orderBy.length > 0) {
      const orderClauses = this.queryParts.orderBy.map((order) => {
        let clause = `${order.column} ${order.direction}`;
        if (order.nulls) {
          clause += ` NULLS ${order.nulls}`;
        }
        return clause;
      });
      query += ` ORDER BY ${orderClauses.join(" ")}`;
    }

    // Add limit and offset
    if (this.queryParts.limit !== undefined) {
      query += ` LIMIT ${this.queryParts.limit}`;
    }

    if (this.queryParts.offset !== undefined) {
      query += ` OFFSET ${this.queryParts.offset}`;
    }

    return { query, params };
  }
}
