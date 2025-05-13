// benchmarks/graphql/schema_generation.ts
import {
  BenchAdapter,
  cleanupAdapter,
  runBenchmarkWithBothAdapters,
} from "../utils/db_utils.ts";
import { GraphQLSchemaGenerator } from "../../src/graphql/GraphQLSchema.ts";
import { ResolversGenerator } from "../../src/graphql/Resolvers.ts";
import { ModelRegistry } from "../../src/models/ModelRegistry.ts";
import { BaseModel } from "../../src/models/BaseModel.ts";
import { GraphQLSource } from "../../src/graphql/types.ts";
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
} from "../../src/decorators/index.ts";
import * as graphql from "https://deno.land/x/graphql_deno@v15.0.0/mod.ts";

// Define test models for benchmarking
@Entity({ tableName: "bench_authors" })
class BenchAuthor extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @OneToMany({
    target: () => "BenchBook",
    inverse: (book: BenchBook) => book.author,
  })
  books!: BenchBook[];
}

@Entity({ tableName: "bench_books" })
class BenchBook extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "integer" })
  pageCount!: number;

  @Column({ type: "float" })
  price!: number;

  @ManyToOne({
    target: () => "BenchAuthor",
    inverse: (author: BenchAuthor) => author.books,
  })
  author!: BenchAuthor;

  @OneToMany({
    target: () => "BenchReview",
    inverse: (review: BenchReview) => review.book,
  })
  reviews!: BenchReview[];

  @Column({ type: "timestamp" })
  publishedAt!: Date;
}

@Entity({ tableName: "bench_reviews" })
class BenchReview extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "integer" })
  rating!: number;

  @ManyToOne({
    target: () => "BenchBook",
    inverse: (book: BenchBook) => book.reviews,
  })
  book!: BenchBook;

  @Column({ type: "timestamp" })
  createdAt!: Date;
}

// Register models with the ModelRegistry for benchmark
function registerModels() {
  ModelRegistry.registerModel(BenchAuthor);
  ModelRegistry.registerModel(BenchBook);
  ModelRegistry.registerModel(BenchReview);
}

// Create tables based on the adapter type
async function createTables(benchAdapter: BenchAdapter) {
  const adapter = benchAdapter.adapter;

  if (benchAdapter.type === "sqlite") {
    // Create SQLite tables
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_authors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        bio TEXT
      )
    `);

    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        page_count INTEGER NOT NULL,
        price REAL NOT NULL,
        author_id INTEGER NOT NULL,
        published_at TIMESTAMP NOT NULL,
        FOREIGN KEY(author_id) REFERENCES bench_authors(id)
      )
    `);

    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY(book_id) REFERENCES bench_books(id)
      )
    `);
  } else {
    // Create PostgreSQL tables
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_authors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        bio TEXT
      )
    `);

    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        page_count INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        author_id INTEGER NOT NULL,
        published_at TIMESTAMP NOT NULL,
        FOREIGN KEY(author_id) REFERENCES bench_authors(id)
      )
    `);

    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS bench_reviews (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY(book_id) REFERENCES bench_books(id)
      )
    `);
  }

  return adapter;
}

// Clean up tables based on the adapter type
async function cleanupTables(benchAdapter: BenchAdapter) {
  if (!benchAdapter || !benchAdapter.adapter) return;

  const adapter = benchAdapter.adapter;

  try {
    await adapter.execute("DROP TABLE IF EXISTS bench_reviews");
    await adapter.execute("DROP TABLE IF EXISTS bench_books");
    await adapter.execute("DROP TABLE IF EXISTS bench_authors");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during cleanup: ${errorMessage}`);
  }
}

// Schema Generation Benchmark
Deno.bench("GraphQL: Schema Generation from Models", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: Schema Generation from Models",
    "GraphQL",
    "Schema Generation from Models",
    async (benchAdapter) => {
      try {
        await createTables(benchAdapter);

        // Register test models
        registerModels();

        // Generate GraphQL schema from models
        const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

        // Validate schema generation
        if (
          !schemaConfig.types.BenchAuthor || !schemaConfig.types.BenchBook ||
          !schemaConfig.types.BenchReview
        ) {
          throw new Error("Failed to generate schema types for all models");
        }

        if (!schemaConfig.queries.getBenchBookByAuthorId) {
          // This is fine, just checking if specific queries are generated
        }

        // Check if expected mutations are generated
        const expectedMutations = [
          "createBenchAuthor",
          "updateBenchAuthor",
          "deleteBenchAuthor",
          "createBenchBook",
          "updateBenchBook",
          "deleteBenchBook",
          "createBenchReview",
          "updateBenchReview",
          "deleteBenchReview",
        ];

        for (const mutation of expectedMutations) {
          if (!schemaConfig.mutations[mutation]) {
            throw new Error(`Expected mutation ${mutation} not generated`);
          }
        }
      } finally {
        await cleanupTables(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});

Deno.bench("GraphQL: Resolvers Generation", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: Resolvers Generation",
    "GraphQL",
    "Resolvers Generation",
    async (benchAdapter) => {
      try {
        await createTables(benchAdapter);

        // Register test models
        registerModels();

        // Generate GraphQL schema config
        const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

        // Generate resolvers from schema config
        const resolvers = ResolversGenerator.generateResolvers(schemaConfig);

        // Validate resolver generation
        if (!resolvers.Query || !resolvers.Mutation) {
          throw new Error("Failed to generate Query and Mutation resolvers");
        }

        // Check if expected query resolvers are generated
        const expectedQueries = [
          "getBenchAuthor",
          "listBenchAuthor",
          "getBenchBook",
          "listBenchBook",
          "getBenchReview",
          "listBenchReview",
        ];

        for (const query of expectedQueries) {
          if (!resolvers.Query[query]) {
            throw new Error(`Expected query resolver ${query} not generated`);
          }
        }
      } finally {
        await cleanupTables(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});

Deno.bench("GraphQL: Schema Creation with GraphQL.js", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: Schema Creation with GraphQL.js",
    "GraphQL",
    "Schema Creation with GraphQL.js",
    async (benchAdapter) => {
      try {
        await createTables(benchAdapter);

        // Register test models
        registerModels();

        // Generate GraphQL schema config
        const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

        // Create actual GraphQL schema
        const schema = new graphql.GraphQLSchema({
          query: new graphql.GraphQLObjectType({
            name: "Query",
            fields: () => ({
              ...Object.entries(schemaConfig.queries).reduce(
                (acc, [key, query]) => ({
                  ...acc,
                  [key]: {
                    type: query.type,
                    args: query.args || {},
                    resolve: (
                      parent: unknown,
                      args: unknown,
                      ctx: unknown,
                      info: graphql.GraphQLResolveInfo,
                    ) => {
                      // Use type casting for compatibility
                      if (query.resolve) {
                        return query.resolve(
                          parent as GraphQLSource,
                          args as Record<string, unknown>,
                          ctx as Record<string, unknown>,
                          info as graphql.GraphQLResolveInfo,
                        );
                      }
                      return null;
                    },
                  },
                }),
                {},
              ),
            }),
          }),
          mutation: new graphql.GraphQLObjectType({
            name: "Mutation",
            fields: () => ({
              ...Object.entries(schemaConfig.mutations).reduce(
                (acc, [key, mutation]) => ({
                  ...acc,
                  [key]: {
                    type: mutation.type,
                    args: mutation.args || {},
                    resolve: (
                      parent: unknown,
                      args: unknown,
                      ctx: unknown,
                      info: graphql.GraphQLResolveInfo,
                    ) => {
                      // Use type casting for compatibility
                      if (mutation.resolve) {
                        return mutation.resolve(
                          parent as GraphQLSource,
                          args as Record<string, unknown>,
                          ctx as Record<string, unknown>,
                          info as graphql.GraphQLResolveInfo,
                        );
                      }
                      return null;
                    },
                  },
                }),
                {},
              ),
            }),
          }),
        });

        // Validate schema creation
        if (!schema) {
          throw new Error("Failed to create GraphQL schema");
        }

        const queryType = schema.getQueryType();
        if (!queryType) {
          throw new Error("Query type not found in schema");
        }

        const mutationType = schema.getMutationType();
        if (!mutationType) {
          throw new Error("Mutation type not found in schema");
        }
      } finally {
        await cleanupTables(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});

Deno.bench("GraphQL: End-to-End Schema Generation Process", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: End-to-End Schema Generation Process",
    "GraphQL",
    "End-to-End Schema Generation Process",
    async (benchAdapter) => {
      try {
        await createTables(benchAdapter);

        // Register test models
        registerModels();

        // Generate GraphQL schema config
        const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

        // Generate resolvers from schema config (not used directly but demonstrates pipeline)
        ResolversGenerator.generateResolvers(schemaConfig);

        // Define types for resolver parameters
        type ResolverParent = GraphQLSource;
        type ResolverArgs = { [key: string]: unknown };
        type ResolverContext = Record<string, unknown>;

        // Create schema with explicit typing
        const schema = new graphql.GraphQLSchema({
          query: new graphql.GraphQLObjectType({
            name: "Query",
            fields: () => {
              // Create field config object directly instead of using reduce
              const fieldConfigs: Record<
                string,
                graphql.GraphQLFieldConfig<unknown, unknown>
              > = {};

              for (const [key, query] of Object.entries(schemaConfig.queries)) {
                fieldConfigs[key] = {
                  type: query.type as graphql.GraphQLOutputType,
                  args: query.args as graphql.GraphQLFieldConfigArgumentMap ||
                    {},
                  resolve: (
                    _parent: unknown,
                    _args: unknown,
                    _ctx: unknown,
                    info: graphql.GraphQLResolveInfo,
                  ) => {
                    // Use specific types for compatibility
                    if (query.resolve) {
                      return query.resolve(
                        _parent as GraphQLSource,
                        _args as Record<string, unknown>,
                        _ctx as Record<string, unknown>,
                        info,
                      );
                    }
                    return null;
                  },
                };
              }

              return fieldConfigs;
            },
          }),
          mutation: new graphql.GraphQLObjectType({
            name: "Mutation",
            fields: () => {
              // Create field config object directly instead of using reduce
              const fieldConfigs: Record<
                string,
                graphql.GraphQLFieldConfig<unknown, unknown>
              > = {};

              for (
                const [key, mutation] of Object.entries(schemaConfig.mutations)
              ) {
                fieldConfigs[key] = {
                  type: mutation.type as graphql.GraphQLOutputType,
                  args:
                    mutation.args as graphql.GraphQLFieldConfigArgumentMap ||
                    {},
                  resolve: (
                    _parent: unknown,
                    _args: unknown,
                    _ctx: unknown,
                    info: graphql.GraphQLResolveInfo,
                  ) => {
                    // Use specific types for resolver parameters
                    if (mutation.resolve) {
                      return mutation.resolve(
                        _parent as GraphQLSource,
                        _args as Record<string, unknown>,
                        _ctx as Record<string, unknown>,
                        info,
                      );
                    }
                    return null;
                  },
                };
              }

              return fieldConfigs;
            },
          }),
        });

        // Validate schema
        const queryType = schema.getQueryType();
        const mutationType = schema.getMutationType();

        if (!queryType || !mutationType) {
          throw new Error("Failed to create complete GraphQL schema");
        }
      } finally {
        await cleanupTables(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});
