
import { DatabaseAdapter, QueryResult } from "../interfaces/DatabaseAdapter.ts";

type ConditionOperator = "=" | ">" | "<" | ">=" | "<=" | "<>" | "LIKE" | "IN";

export class QueryBuilder {
  private queryParts: {
    type?: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
    table?: string;
    columns?: string[];
    values?: any[];
    set?: { [key: string]: any };
    where?: { column: string; operator: ConditionOperator; value: any }[];
    orderBy?: string;
    limit?: number;
    offset?: number;
  } = {};

  private params: any[] = [];

  select(columns: string[] | "*"): this {
    this.queryParts.type = "SELECT";
    if (Array.isArray(columns)) {
      this.queryParts.columns = columns;
    } else {
      this.queryParts.columns = ["*"];
    }
    return this;
  }

  insert(table: string, data: { [key: string]: any }): this {
    this.queryParts.type = "INSERT";
    this.queryParts.table = table;
    this.queryParts.columns = Object.keys(data);
    this.queryParts.values = Object.values(data);
    return this;
  }

  update(table: string, data: { [key: string]: any }): this {
    this.queryParts.type = "UPDATE";
    this.queryParts.table = table;
    this.queryParts.set = data;
    return this;
  }

  delete(table: string): this {
    this.queryParts.type = "DELETE";
    this.queryParts.table = table;
    return this;
  }

  from(table: string): this {
    this.queryParts.table = table;
    return this;
  }

  where(column: string, operator: ConditionOperator, value: any): this {
    if (!this.queryParts.where) {
      this.queryParts.where = [];
    }
    this.queryParts.where.push({ column, operator, value });
    return this;
  }

  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): this {
    this.queryParts.orderBy = `${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.queryParts.limit = count;
    return this;
  }

  offset(count: number): this {
    this.queryParts.offset = count;
    return this;
  }

  private buildSelect(): { query: string; params: any[] } {
    const columns = this.queryParts.columns!.join(", ");
    let query = `SELECT ${columns} FROM ${this.queryParts.table}`;
    if (this.queryParts.where && this.queryParts.where.length > 0) {
      const conditions = this.queryParts.where
        .map((cond, idx) => `${cond.column} ${cond.operator} $${idx + 1}`)
        .join(" AND ");
      query += ` WHERE ${conditions}`;
      this.params.push(...this.queryParts.where.map(cond => cond.value));
    }
    if (this.queryParts.orderBy) {
      query += ` ORDER BY ${this.queryParts.orderBy}`;
    }
    if (this.queryParts.limit !== undefined) {
      query += ` LIMIT ${this.queryParts.limit}`;
    }
    if (this.queryParts.offset !== undefined) {
      query += ` OFFSET ${this.queryParts.offset}`;