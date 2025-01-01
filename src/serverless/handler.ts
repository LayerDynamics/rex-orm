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

  const adapter = DatabaseFactory.createAdapter(config);
  await adapter.connect();

  // Use mock RealTimeSync in test mode
  realTimeSync = isTestMode && mockRealTimeSync ? 
    mockRealTimeSync : 
    new RealTimeSyncImpl({
      port: parseInt(Deno.env.get("REALTIME_PORT") || "8080")
    });

  await realTimeSync.start();

  BaseModel.initializeRealTimeSync(realTimeSync);

  // Generate GraphQL Schema and Resolvers
  const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();
  const resolvers = ResolversGenerator.generateResolvers(schemaConfig);

  // Initialize GraphQL Schema with resolvers
  schema = new graphqlDeno.GraphQLSchema({
    query: new graphqlDeno.GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        ...schemaConfig.queries,
        resolvers: resolvers.Query
      })
    }),
    mutation: new graphqlDeno.GraphQLObjectType({
      name: 'Mutation',
      fields: () => ({
        ...schemaConfig.mutations,
        resolvers: resolvers.Mutation
      })
    })
  });
}

export const graphqlHandler = async (event: any, context: any) => {
  await initialize();
  
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    const { query, variables, operationName } = JSON.parse(event.body);
    const result = await graphqlDeno.graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: { 
        adapter: DatabaseFactory.getAdapter(),
        models: ModelRegistry.getRegisteredModels()
      }
    });

    // Ensure we always return an object with data
    const responseBody = {
      data: result.data || {},
      errors: result.errors
    };

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(responseBody)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        errors: [{ message: error instanceof Error ? error.message : "Internal server error" }]
      })
    };
  }
};

export const realtimeHandler = async (event: any, context: any) => {
  await initialize();
  
  if (!event.requestContext) {
    return {
      statusCode: 400,
      body: "Invalid event format"
    };
  }

  const { eventType, connectionId } = event.requestContext;

  try {
    switch (eventType) {
      case "CONNECT":
        await realTimeSync.connect(connectionId);
        return {
          statusCode: 200,
          body: "Connected"
        };

      case "MESSAGE":
        if (!event.body) {
          return {
            statusCode: 400,
            body: "Message body required"
          };
        }
        const message = JSON.parse(event.body);
        await realTimeSync.message(connectionId, message);
        return {
          statusCode: 200,
          body: "Message processed"
        };

      case "DISCONNECT":
        await realTimeSync.disconnect(connectionId);
        return {
          statusCode: 200,
          body: "Disconnected"
        };

      default:
        return {
          statusCode: 400,
          body: "Invalid event type"
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: error instanceof Error ? error.message : "Internal server error"
    };
  }
};


