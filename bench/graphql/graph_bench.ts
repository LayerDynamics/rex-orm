// benchmarks/graphql/graph_bench.ts
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
import type {
  DatabaseAdapter,
  DatabaseRecord,
} from "../../src/interfaces/DatabaseAdapter.ts";

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

// Create tables and seed with test data
async function setupDatabaseForBenchmark(benchAdapter: BenchAdapter) {
  const adapter = benchAdapter.adapter;

  // Create tables based on adapter type
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

  // Seed database with test data
  // Insert authors
  for (let i = 1; i <= 10; i++) {
    await adapter.execute(
      `INSERT INTO bench_authors (name, email, bio) VALUES (?, ?, ?)`,
      [`Author ${i}`, `author${i}@example.com`, `Bio for author ${i}`],
    );
  }

  // Insert books
  for (let i = 1; i <= 50; i++) {
    const authorId = (i % 10) + 1; // Distribute books among 10 authors
    await adapter.execute(
      `INSERT INTO bench_books (title, description, page_count, price, author_id, published_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `Book ${i}`,
        `Description for book ${i}`,
        Math.floor(Math.random() * 500) + 100,
        (Math.random() * 50 + 9.99).toFixed(2),
        authorId,
        new Date().toISOString(),
      ],
    );
  }

  // Insert reviews
  for (let i = 1; i <= 200; i++) {
    const bookId = (i % 50) + 1; // Distribute reviews among 50 books
    const rating = Math.floor(Math.random() * 5) + 1; // Random rating 1-5
    await adapter.execute(
      `INSERT INTO bench_reviews (title, content, rating, book_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        `Review ${i}`,
        `This is the content of review ${i}. It contains some thoughts about the book.`,
        rating,
        bookId,
        new Date().toISOString(),
      ],
    );
  }

  return adapter;
}

// Clean up tables
async function cleanupBenchmarkDatabase(benchAdapter: BenchAdapter) {
  if (!benchAdapter || !benchAdapter.adapter) return;

  const adapter = benchAdapter.adapter;

  try {
    await adapter.execute("DROP TABLE IF EXISTS bench_reviews");
    await adapter.execute("DROP TABLE IF EXISTS bench_books");
    await adapter.execute("DROP TABLE IF EXISTS bench_authors");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during database cleanup: ${errorMessage}`);
  }
}

// Define ResolverContext interface with correct adapter type
interface ResolverContext {
  adapter: DatabaseAdapter<DatabaseRecord>;
}

// Setup GraphQL environment for benchmarks
function setupGraphQLEnvironment(_benchAdapter: BenchAdapter) {
  // Register models
  registerModels();

  // Generate schema config
  const schemaConfig = GraphQLSchemaGenerator.generateSchemaConfig();

  // Generate resolvers
  const resolvers = ResolversGenerator.generateResolvers(schemaConfig);

  // Create schema
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
                args: { [argName: string]: unknown },
                ctx: unknown,
                info: graphql.GraphQLResolveInfo,
              ) => {
                // Cast all parameters to their expected types
                return resolvers.Query[key](
                  parent as GraphQLSource,
                  args as { [argName: string]: unknown },
                  ctx as ResolverContext,
                  info as graphql.GraphQLResolveInfo,
                );
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
                args: { [argName: string]: unknown },
                ctx: unknown,
                info: graphql.GraphQLResolveInfo,
              ) => {
                // Cast all parameters to their expected types
                return resolvers.Mutation[key](
                  parent as GraphQLSource,
                  args as { [argName: string]: unknown },
                  ctx as ResolverContext,
                  info as graphql.GraphQLResolveInfo,
                );
              },
            },
          }),
          {},
        ),
      }),
    }),
  });

  return { schema, resolvers };
}

// GraphQL Query Benchmarks
Deno.bench("GraphQL: Simple Query Execution", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: Simple Query Execution",
    "GraphQL",
    "Simple Query Execution",
    async (benchAdapter) => {
      try {
        // Setup database with test data
        await setupDatabaseForBenchmark(benchAdapter);

        // Setup GraphQL environment
        const { schema } = setupGraphQLEnvironment(
          benchAdapter,
        );

        // Context for resolvers
        const context = {
          adapter: benchAdapter.adapter,
        };

        // Execute a simple query
        const queryResult = await graphql.graphql({
          schema,
          source: `
            {
              listBenchAuthor {
                id
                name
                email
              }
            }
          `,
          contextValue: context,
        });

        if (queryResult.errors && queryResult.errors.length > 0) {
          throw new Error(
            `GraphQL query failed: ${queryResult.errors[0].message}`,
          );
        }

        // Validate result
        const authors = queryResult.data?.listBenchAuthor;
        if (!authors || !Array.isArray(authors) || authors.length === 0) {
          throw new Error("Expected authors in query result");
        }
      } finally {
        await cleanupBenchmarkDatabase(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});

Deno.bench("GraphQL: Complex Query with Relations", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: Complex Query with Relations",
    "GraphQL",
    "Complex Query with Relations",
    async (benchAdapter) => {
      try {
        // Setup database with test data
        await setupDatabaseForBenchmark(benchAdapter);

        // Setup GraphQL environment
        const { schema } = setupGraphQLEnvironment(
          benchAdapter,
        );

        // Context for resolvers
        const context = {
          adapter: benchAdapter.adapter,
        };

        // Execute a complex query with relations
        const queryResult = await graphql.graphql({
          schema,
          source: `
            {
              listBenchBook {
                id
                title
                pageCount
                price
                author {
                  id
                  name
                  email
                }
              }
            }
          `,
          contextValue: context,
        });

        if (queryResult.errors && queryResult.errors.length > 0) {
          throw new Error(
            `GraphQL query failed: ${queryResult.errors[0].message}`,
          );
        }

        // Validate result
        const books = queryResult.data?.listBenchBook;
        if (!books || !Array.isArray(books) || books.length === 0) {
          throw new Error("Expected books in query result");
        }
      } finally {
        await cleanupBenchmarkDatabase(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});

Deno.bench("GraphQL: Mutation Performance", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: Mutation Performance",
    "GraphQL",
    "Mutation Performance",
    async (benchAdapter) => {
      try {
        // Setup database with test data
        await setupDatabaseForBenchmark(benchAdapter);

        // Setup GraphQL environment
        const { schema } = setupGraphQLEnvironment(
          benchAdapter,
        );

        // Context for resolvers
        const context = {
          adapter: benchAdapter.adapter,
        };

        // Execute a mutation
        const mutationResult = await graphql.graphql({
          schema,
          source: `
            mutation {
              createBenchBook(input: {
                title: "New Benchmark Book"
                description: "A book created during benchmarking"
                pageCount: 300
                price: 19.99
                authorId: 1
                publishedAt: "${new Date().toISOString()}"
              }) {
                id
                title
              }
            }
          `,
          contextValue: context,
        });

        if (mutationResult.errors && mutationResult.errors.length > 0) {
          throw new Error(
            `GraphQL mutation failed: ${mutationResult.errors[0].message}`,
          );
        }

        // Validate result
        const newBook = mutationResult.data?.createBenchBook;
        if (!newBook || !newBook.id) {
          throw new Error("Expected a new book ID in mutation result");
        }
      } finally {
        await cleanupBenchmarkDatabase(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});

Deno.bench("GraphQL: Batch Query Performance", async () => {
  await runBenchmarkWithBothAdapters(
    "GraphQL: Batch Query Performance",
    "GraphQL",
    "Batch Query Performance",
    async (benchAdapter) => {
      try {
        // Setup database with test data
        await setupDatabaseForBenchmark(benchAdapter);

        // Setup GraphQL environment
        const { schema } = setupGraphQLEnvironment(
          benchAdapter,
        );

        // Context for resolvers
        const context = {
          adapter: benchAdapter.adapter,
        };

        // Generate batch of operations
        const operations = [];

        // Add 10 get operations
        for (let i = 1; i <= 10; i++) {
          operations.push(
            graphql.graphql({
              schema,
              source: `{ getBenchBook(id: ${i}) { id title } }`,
              contextValue: context,
            }),
          );
        }

        // Execute all in parallel
        const results = await Promise.all(operations);

        // Validate results
        let valid = true;
        for (const result of results) {
          if (result.errors && result.errors.length > 0) {
            valid = false;
            break;
          }
        }

        if (!valid) {
          throw new Error("One or more batch operations failed");
        }
      } finally {
        await cleanupBenchmarkDatabase(benchAdapter);
        await cleanupAdapter(benchAdapter);
      }
    },
  );
});
