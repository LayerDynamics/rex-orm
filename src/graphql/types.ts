import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";
import type { FieldDefinitionNode } from "https://deno.land/x/graphql_deno@v15.0.0/lib/language/ast.d.ts";

// Base types for GraphQL values and contexts
export type GraphQLValue = string | number | boolean | null | GraphQLValue[] | {
  [key: string]: GraphQLValue;
};
export type GraphQLSource = Record<string, GraphQLValue>;
export type GraphQLContextValue = Record<string, unknown>;

export interface ColumnMetadata {
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  options?: {
    type: string;
    length?: number;
    nullable?: boolean;
    unique?: boolean;
    primaryKey?: boolean;
  };
}

export interface GraphQLFieldConfig extends
  Omit<
    graphql.GraphQLFieldConfig<GraphQLSource, GraphQLContextValue>,
    "args"
  > {
  type: graphql.GraphQLOutputType;
  args: Record<string, GraphQLArgumentConfig>;
  resolve?: graphql.GraphQLFieldResolver<GraphQLSource, GraphQLContextValue>;
  description?: string;
  deprecationReason?: string;
  extensions?: Record<string, unknown>;
  astNode?: FieldDefinitionNode;
}

export interface GraphQLArgumentConfig {
  type: graphql.GraphQLInputType;
  defaultValue?: GraphQLValue;
  description?: string;
  extensions?: Record<string, unknown>;
  astNode?: graphql.ASTNode;
}

export interface GraphQLType {
  name: string;
  description?: string;
  fields: Record<string, GraphQLFieldConfig>;
  interfaces?: graphql.GraphQLInterfaceType[];
  isTypeOf?: (
    source: GraphQLSource,
    context: GraphQLContextValue,
    info: graphql.GraphQLResolveInfo,
  ) => boolean;
  extensions?: Record<string, unknown>;
  astNode?: graphql.ASTNode;
}

export interface GraphQLSchemaConfig {
  types: Record<string, graphql.GraphQLObjectType>;
  queries: Record<string, GraphQLFieldConfig>;
  mutations: Record<string, GraphQLFieldConfig>;
  subscriptions?: Record<string, GraphQLFieldConfig>;
  directives?: graphql.GraphQLDirective[];
  extensions?: Record<string, unknown>;
  astNode?: graphql.ASTNode;
}

export interface GraphQLError {
  message: string;
  path?: ReadonlyArray<string | number>;
  locations?: ReadonlyArray<{ line: number; column: number }>;
  extensions?: Record<string, unknown>;
  nodes?: ReadonlyArray<graphql.ASTNode>;
  source?: graphql.Source;
  positions?: ReadonlyArray<number>;
  originalError?: Error & {
    extensions?: Record<string, unknown>;
  };
}

export interface GraphQLResponse {
  data?: Record<string, GraphQLValue> | null;
  errors?: ReadonlyArray<GraphQLError>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLInputField {
  type: graphql.GraphQLInputType;
  defaultValue?: GraphQLValue;
  description?: string;
  extensions?: Record<string, unknown>;
  astNode?: graphql.ASTNode;
}

export interface QueryResult {
  rows: Array<Record<string, GraphQLValue>>;
  rowCount: number;
  fields?: Array<unknown>;
  command?: string;
  rowAsArray?: boolean;
}

export type Constructor<T = unknown> = new (...args: Array<unknown>) => T;

export interface GraphQLContext {
  [key: string]: unknown;
}
