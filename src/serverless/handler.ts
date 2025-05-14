import * as graphqlDeno from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";
import { GraphQLSchemaGenerator } from "../graphql/GraphQLSchema.ts";
import { ResolversGenerator } from "../graphql/Resolvers.ts";
import { DatabaseFactory } from "../factory/DatabaseFactory.ts";
import { ModelRegistry } from "../models/ModelRegistry.ts";
import { BaseModel } from "../models/BaseModel.ts";
import { RealTimeSync, RealTimeSyncImpl } from "../realtime/index.ts"; // or wherever it is

// Add test mode flag
let isTestMode = false;
let mockRealTimeSync: RealTimeSync | null = null;

// Add function to set test mode
export function setTestMode(enabled: boolean, mockSync?: RealTimeSync) {
  isTestMode = enabled;
  mockRealTimeSync = mockSync || null;
}

// Initialize core components at module level to optimize cold starts
let schema: graphqlDeno.GraphQLSchema;
let realTimeSync: RealTimeSync;

async function initialize() {
  if (schema) return;

  // Initialize Database Adapter
  const config = {
    database: Deno.env.get("DATABASE_TYPE") || "sqlite",
    databasePath: Deno.env.get("DATABASE_URL") || "./data/rex_orm_db.sqlite",
  };

  const adapter = await DatabaseFactory.createAdapter(config);
  await adapter.connect();

  // Use mock RealTimeSync in test mode
  realTimeSync = isTestMode && mockRealTimeSync
    ? mockRealTimeSync
    : new RealTimeSyncImpl({
      port: parseInt(Deno.env.get("REALTIME_PORT") || "8080"),
    });

  await realTimeSync.start();

  BaseModel.initializeRealTimeSync(realTimeSync);

  // Generate GraphQL Schema and Resolvers
  const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();
  const resolvers = ResolversGenerator.generateResolvers(schemaConfig);

  // Initialize GraphQL Schema with resolvers
  schema = new graphqlDeno.GraphQLSchema({
    query: new graphqlDeno.GraphQLObjectType({
      name: "Query",
      fields: () => {
        // Convert schemaConfig.queries into proper field configurations
        const queryFields: graphqlDeno.GraphQLFieldConfigMap<unknown, unknown> =
          {};

        // Add all schema query fields
        Object.entries(schemaConfig.queries).forEach(
          ([fieldName, fieldConfig]) => {
            // Transform the field config to be compatible with graphql_deno
            queryFields[fieldName] = {
              type: fieldConfig.type,
              description: fieldConfig.description,
              args: fieldConfig.args
                ? Object.fromEntries(
                  Object.entries(fieldConfig.args).map((
                    [argName, argConfig],
                  ) => [
                    argName,
                    {
                      type: argConfig.type,
                      defaultValue: argConfig.defaultValue,
                      description: argConfig.description,
                    },
                  ]),
                )
                : undefined,
              resolve: fieldConfig.resolve,
              subscribe: fieldConfig.subscribe,
              deprecationReason: fieldConfig.deprecationReason,
            };
          },
        );

        // Add resolver functions to query fields
        Object.entries(resolvers.Query || {}).forEach(
          ([fieldName, resolver]) => {
            if (queryFields[fieldName]) {
              queryFields[fieldName].resolve = resolver;
            }
          },
        );

        return queryFields;
      },
    }),
    mutation: new graphqlDeno.GraphQLObjectType({
      name: "Mutation",
      fields: () => {
        // Convert schemaConfig.mutations into proper field configurations
        const mutationFields: graphqlDeno.GraphQLFieldConfigMap<
          unknown,
          unknown
        > = {};

        // Add all schema mutation fields with proper type conversion
        Object.entries(schemaConfig.mutations).forEach(
          ([fieldName, fieldConfig]) => {
            mutationFields[fieldName] = {
              type: fieldConfig.type,
              description: fieldConfig.description,
              args: fieldConfig.args
                ? Object.fromEntries(
                  Object.entries(fieldConfig.args).map((
                    [argName, argConfig],
                  ) => [
                    argName,
                    {
                      type: argConfig.type,
                      defaultValue: argConfig.defaultValue,
                      description: argConfig.description,
                    },
                  ]),
                )
                : undefined,
              resolve: fieldConfig.resolve,
              subscribe: fieldConfig.subscribe,
              deprecationReason: fieldConfig.deprecationReason,
            };
          },
        );

        // Add resolver functions to their respective fields
        Object.entries(resolvers.Mutation || {}).forEach(
          ([fieldName, resolver]) => {
            if (mutationFields[fieldName]) {
              mutationFields[fieldName].resolve = resolver;
            }
          },
        );

        return mutationFields;
      },
    }),
  });
}

// GraphQL handler implementation
export const graphqlHandler = async (event: unknown, _context: unknown) => {
  await initialize();

  // Handle CORS preflight requests
  if ((event as { httpMethod?: string }).httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  try {
    const { query, variables, operationName } = JSON.parse(event.body || "{}");
    const result = await graphqlDeno.graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: {
        adapter: DatabaseFactory.getAdapter(),
        models: ModelRegistry.getRegisteredModels(),
      },
    });

    const responseBody = result.errors
      ? { errors: result.errors }
      : { data: result.data };

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        errors: [{
          message: error instanceof Error
            ? error.message
            : "Internal server error",
        }],
      }),
    };
  }
};

export const realtimeHandler = async (event: unknown, _context: unknown) => {
  await initialize();

  if (!event.requestContext) {
    return {
      statusCode: 400,
      body: "Invalid event format",
    };
  }

  const { eventType, connectionId } = event.requestContext;

  try {
    switch (eventType) {
      case "CONNECT": {
        await realTimeSync.connect(connectionId);
        return {
          statusCode: 200,
          body: "Connected",
        };
      }

      case "MESSAGE": {
        if (!event.body) {
          return {
            statusCode: 400,
            body: "Message body required",
          };
        }
        const message = JSON.parse(event.body);
        await realTimeSync.message(connectionId, message);
        return {
          statusCode: 200,
          body: "Message processed",
        };
      }

      case "DISCONNECT": {
        await realTimeSync.disconnect(connectionId);
        return {
          statusCode: 200,
          body: "Disconnected",
        };
      }

      default:
        return {
          statusCode: 400,
          body: "Invalid event type",
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
