import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";
// deno-lint-ignore no-unused-vars
import { GraphQLFieldConfig, GraphQLSchemaConfig } from "./types.ts";

// Define Constructor type locally to ensure availability
type ModelConstructor<T = unknown> = { new (...args: unknown[]): T };

export class GraphQLSchemaGenerator {
  static generateSchemaConfig(): GraphQLSchemaConfig {
    const config: GraphQLSchemaConfig = {
      types: {},
      queries: {},
      mutations: {},
    };

    for (const Model of ModelRegistry.getAllModels()) {
      const modelName = Model.name;
      const metadata = ModelRegistry.getModelMetadata(
        Model as ModelConstructor,
      );

      const graphqlType = new graphql.GraphQLObjectType({
        name: modelName,
        fields: () => {
          const fields: Record<
            string,
            graphql.GraphQLFieldConfig<unknown, unknown>
          > = {};

          for (const column of metadata.columns) {
            fields[column.propertyKey] = {
              type: this.mapToOutputType(
                column.type || column.options.type || "string",
                !column.options.nullable,
              ),
              args: {},
            };
          }

          for (const relation of metadata.relations || []) {
            const targetModel = ModelRegistry.resolveTarget(
              relation.targetName,
            );
            const targetType = this.getOrCreateType(
              config.types,
              targetModel as ModelConstructor,
            );

            switch (relation.type) {
              case "OneToMany":
                fields[relation.propertyKey] = {
                  type: new graphql.GraphQLList(targetType),
                  args: {},
                };
                break;
              case "ManyToOne":
              case "OneToOne":
                fields[relation.propertyKey] = {
                  type: targetType,
                  args: {},
                };
                break;
            }
          }

          return fields;
        },
      });

      config.types[modelName] = graphqlType;

      const inputType = new graphql.GraphQLInputObjectType({
        name: `${modelName}Input`,
        fields: () => {
          const fields: Record<string, graphql.GraphQLInputFieldConfig> = {};
          for (const column of metadata.columns) {
            if (!column.options.primaryKey) {
              fields[column.propertyKey] = {
                type: this.mapToInputType(
                  column.type || column.options.type || "string",
                  !column.options.nullable,
                ),
              };
            }
          }
          return fields;
        },
      });

      config.queries[`get${modelName}`] = {
        type: graphqlType,
        args: {
          id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
        },
      };

      config.queries[`list${modelName}`] = {
        type: new graphql.GraphQLList(graphqlType),
        args: {
          limit: { type: graphql.GraphQLInt },
          offset: { type: graphql.GraphQLInt },
        },
      };

      config.mutations[`create${modelName}`] = {
        type: graphqlType,
        args: {
          input: { type: new graphql.GraphQLNonNull(inputType) },
        },
      };

      config.mutations[`update${modelName}`] = {
        type: graphqlType,
        args: {
          id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
          input: { type: new graphql.GraphQLNonNull(inputType) },
        },
      };

      config.mutations[`delete${modelName}`] = {
        type: graphqlType,
        args: {
          id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
        },
      };
    }

    return config;
  }

  private static mapToOutputType(
    type: string,
    required: boolean = false,
  ): graphql.GraphQLOutputType {
    const gqlType: graphql.GraphQLOutputType = (() => {
      switch (type.toLowerCase()) {
        case "string":
        case "varchar":
        case "text":
          return graphql.GraphQLString;
        case "int":
        case "integer":
        case "serial":
          return graphql.GraphQLInt;
        case "float":
        case "decimal":
        case "number":
          return graphql.GraphQLFloat;
        case "boolean":
          return graphql.GraphQLBoolean;
        case "id":
          return graphql.GraphQLID;
        default:
          return graphql.GraphQLString;
      }
    })();

    return required ? new graphql.GraphQLNonNull(gqlType) : gqlType;
  }

  private static mapToInputType(
    type: string,
    required: boolean = false,
  ): graphql.GraphQLInputType {
    const gqlType: graphql.GraphQLInputType = this.mapToOutputType(
      type,
    ) as graphql.GraphQLInputType;
    return required ? new graphql.GraphQLNonNull(gqlType) : gqlType;
  }

  private static getOrCreateType(
    types: Record<string, graphql.GraphQLObjectType>,
    Model: ModelConstructor,
  ): graphql.GraphQLObjectType {
    const modelName = Model.name;
    if (!types[modelName]) {
      const metadata = ModelRegistry.getModelMetadata(Model);
      types[modelName] = new graphql.GraphQLObjectType({
        name: modelName,
        fields: () => {
          const fields: Record<
            string,
            graphql.GraphQLFieldConfig<unknown, unknown>
          > = {};
          for (const column of metadata.columns) {
            fields[column.propertyKey] = {
              type: this.mapToOutputType(
                column.type || column.options.type || "string",
                !column.options.nullable,
              ),
              args: {},
            };
          }
          return fields;
        },
      });
    }
    return types[modelName];
  }
}
