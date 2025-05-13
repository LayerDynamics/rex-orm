import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { GraphQLSchemaConfig } from "./types.ts";

export class GraphQLServerWrapper {
  private schema: graphql.GraphQLSchema;
  private abortController: AbortController;
  private isRunning = false;

  constructor(
    schemaConfig: GraphQLSchemaConfig,
    private context: Record<string, unknown>, // changed from 'any'
    private options: { port: number },
  ) {
    this.schema = new graphql.GraphQLSchema({
      query: new graphql.GraphQLObjectType({
        name: "Query",
        fields: () => ({
          ...Object.entries(schemaConfig.queries).reduce(
            (acc, [key, query]) => ({
              ...acc,
              [key]: {
                type: query.type,
                args: query.args || {},
                // removed 'async' keyword since there's no await
                resolve: query.resolve || (() => null),
              },
            }),
            {},
          ),
        }),
      }),
      mutation:
        schemaConfig.mutations && Object.keys(schemaConfig.mutations).length > 0
          ? new graphql.GraphQLObjectType({
            name: "Mutation",
            fields: () => ({
              ...Object.entries(schemaConfig.mutations).reduce(
                (acc, [key, mutation]) => ({
                  ...acc,
                  [key]: {
                    type: mutation.type,
                    args: mutation.args || {},
                    // removed 'async' keyword since there's no await
                    resolve: mutation.resolve || (() => null),
                  },
                }),
                {},
              ),
            }),
          })
          : undefined,
    });

    this.abortController = new AbortController();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const handler = async (req: Request): Promise<Response> => {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (req.method === "POST") {
        try {
          const body = await req.json();
          const { query, variables, operationName } = body;

          if (!query) {
            throw new Error("Query is required");
          }

          const result = await graphql.graphql({
            schema: this.schema,
            source: query,
            variableValues: variables,
            operationName,
            contextValue: this.context,
          });

          return new Response(JSON.stringify(result), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              errors: [{
                message: error instanceof Error
                  ? error.message
                  : "Internal server error",
                path: [],
                locations: [],
              }],
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      return new Response("Method not allowed", {
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    };

    try {
      this.isRunning = true;
      await serve(handler, {
        port: this.options.port,
        signal: this.abortController.signal,
        onListen: ({ port }) => {
          console.log(
            `GraphQL Server listening on http://localhost:${port}/graphql`,
          );
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        throw error;
      }
    } finally {
      this.isRunning = false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.abortController.abort();
    this.abortController = new AbortController();

    // Wait for server to fully stop
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.isRunning = false;
  }

  getSchema(): graphql.GraphQLSchema {
    return this.schema;
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }
}
