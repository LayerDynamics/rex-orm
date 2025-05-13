import { ModelRegistry } from "../models/ModelRegistry.ts";
import type {
  GraphQLSchemaConfig,
  GraphQLSource,
  GraphQLValue,
} from "./types.ts";
import type {
  DatabaseAdapter,
  DatabaseRecord,
  QueryParam,
} from "../interfaces/DatabaseAdapter.ts";
import { QueryBuilder } from "../query/QueryBuilder.ts";
import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";

interface ResolverContext {
  adapter: DatabaseAdapter;
}

// Helper type to convert GraphQLValue to QueryParam
type GraphQLValueToQueryParam<T> = T extends GraphQLValue[] ? never
  : T extends object ? never
  : T;

export class ResolversGenerator {
  static generateResolvers(schemaConfig: GraphQLSchemaConfig) {
    const resolvers: Record<
      string,
      Record<
        string,
        graphql.GraphQLFieldResolver<GraphQLSource, ResolverContext>
      >
    > = {
      Query: {},
      Mutation: {},
    };

    for (const [modelName, _modelType] of Object.entries(schemaConfig.types)) {
      const metadata = ModelRegistry.getModelMetadata(
        ModelRegistry.resolveTarget(modelName),
      );

      // Query resolvers
      resolvers.Query[`get${modelName}`] = async (
        _parent: GraphQLSource,
        args: Record<string, unknown>,
        context: ResolverContext,
      ): Promise<DatabaseRecord | null> => {
        const id = args.id as string;
        const qb = new QueryBuilder();
        const result = await qb
          .select("*")
          .from(metadata.tableName)
          .where("id", "=", id)
          .execute(context.adapter);

        return result.rows[0] || null;
      };

      resolvers.Query[`list${modelName}`] = async (
        _parent: GraphQLSource,
        args: Record<string, unknown>,
        context: ResolverContext,
      ): Promise<DatabaseRecord[]> => {
        const limit = args.limit as number | undefined;
        const offset = args.offset as number | undefined;

        const qb = new QueryBuilder();
        qb.select("*").from(metadata.tableName);
        if (limit !== undefined) {
          qb.limit(limit);
        }
        if (offset !== undefined) {
          qb.offset(offset);
        }
        const result = await qb.execute(context.adapter);
        return result.rows;
      };

      // Mutation resolvers
      resolvers.Mutation[`create${modelName}`] = async (
        _parent: GraphQLSource,
        args: Record<string, unknown>,
        context: ResolverContext,
      ): Promise<DatabaseRecord | null> => {
        const input = args.input as Record<string, unknown>;

        // Convert GraphQLValue to QueryParam
        const queryInput: Record<string, QueryParam> = {};
        for (const [key, value] of Object.entries(input)) {
          // Skip arrays and objects that aren't compatible with QueryParam
          if (
            Array.isArray(value) ||
            (typeof value === "object" && value !== null &&
              !(value instanceof Date))
          ) {
            continue;
          }
          queryInput[key] = value as QueryParam;
        }

        const qb = new QueryBuilder();
        const result = await qb
          .insert(metadata.tableName, queryInput)
          .execute(context.adapter);

        if (result.rows[0]) {
          return result.rows[0];
        }
        return null;
      };

      resolvers.Mutation[`update${modelName}`] = async (
        _parent: GraphQLSource,
        args: Record<string, unknown>,
        context: ResolverContext,
      ): Promise<DatabaseRecord | null> => {
        const id = args.id as string;
        const input = args.input as Record<string, unknown>;

        // Convert GraphQLValue to QueryParam
        const queryInput: Record<string, QueryParam> = {};
        for (const [key, value] of Object.entries(input)) {
          // Skip arrays and objects that aren't compatible with QueryParam
          if (
            Array.isArray(value) ||
            (typeof value === "object" && value !== null &&
              !(value instanceof Date))
          ) {
            continue;
          }
          queryInput[key] = value as QueryParam;
        }

        const qb = new QueryBuilder();
        const result = await qb
          .update(metadata.tableName, queryInput)
          .where("id", "=", id)
          .execute(context.adapter);

        return result.rows[0] || null;
      };

      resolvers.Mutation[`delete${modelName}`] = async (
        _parent: GraphQLSource,
        args: Record<string, unknown>,
        context: ResolverContext,
      ): Promise<boolean> => {
        const id = args.id as string;

        const qb = new QueryBuilder();
        await qb
          .delete(metadata.tableName)
          .where("id", "=", id)
          .execute(context.adapter);

        return true;
      };
    }

    return resolvers;
  }
}
