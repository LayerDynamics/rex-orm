import { DatabaseAdapter, QueryResult } from "../interfaces/DatabaseAdapter.ts";

type ConditionOperator = "=" | ">" | "<" | ">=" | "<=" | "<>" | "LIKE" | "IN";

export class QueryBuilder {
  private queryParts: {
    type?: "SELECT" | "INSERT" | "UPDATE" | "DELETE",
    table?: string,
    columns?: string[],
    values?: any[],
    set?: { [key: string]: any },
    where?: { column: string; operator: ConditionOperator; value: any }[],
    orderBy?: string,
    limit?: number,
    offset?: number,
  } = {};

  private params: any[] = [];

  select(columns: string[] | "*"): this {
    this.queryParts.type = "SELECT";
    this.queryParts.columns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  insert(table: string, data: { [key: string]: any }): this {
    this.queryParts.type = "INSERT";
    this.queryParts.table = table;
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