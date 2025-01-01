import { ModelRegistry } from "../models/ModelRegistry.ts";
import type { GraphQLSchemaConfig } from "./types.ts";
import type { DatabaseAdapter } from "../interfaces/DatabaseAdapter.ts";
import { QueryBuilder } from "../query/QueryBuilder.ts";

interface ResolverContext {
  adapter: DatabaseAdapter;
}

export class ResolversGenerator {
  static generateResolvers(schemaConfig: GraphQLSchemaConfig) {
    const resolvers: Record<string, any> = {
      Query: {},
      Mutation: {}
    };

    for (const [modelName, modelType] of Object.entries(schemaConfig.types)) {
      const metadata = ModelRegistry.getModelMetadata(
        ModelRegistry.resolveTarget(modelName)
      );

      // Query resolvers
      resolvers.Query[`get${modelName}`] = async (_: any, { id }: { id: string }, context: ResolverContext) => {
        const qb = new QueryBuilder();
        const result = await qb
          .select("*")
          .from(metadata.tableName)
          .where("id", "=", id)
          .execute(context.adapter);

        return result.rows[0] || null;
      };

      resolvers.Query[`list${modelName}`] = async (_: any, { limit, offset }: { limit?: number; offset?: number }, context: ResolverContext) => {
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
      resolvers.Mutation[`create${modelName}`] = async (_: any, { input }: { input: Record<string, any> }, context: ResolverContext) => {
        const qb = new QueryBuilder();
        const result = await qb
          .insert(metadata.tableName, input)
          .execute(context.adapter);

        if (result.rows[0]) {
          return result.rows[0];
        }
        return null;
      };

      resolvers.Mutation[`update${modelName}`] = async (_: any, { id, input }: { id: string; input: Record<string, any> }, context: ResolverContext) => {
        const qb = new QueryBuilder();
        const result = await qb
          .update(metadata.tableName, input)
          .where("id", "=", id)
          .execute(context.adapter);

        return result.rows[0] || null;
      };

      resolvers.Mutation[`delete${modelName}`] = async (_: any, { id }: { id: string }, context: ResolverContext) => {
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