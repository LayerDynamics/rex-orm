# Vector Database Support in Rex-ORM

Rex-ORM provides built-in support for vector databases and operations, enabling
AI-powered applications and semantic search functionality. This guide explains
how to use vector features in your applications.

## Overview

Vector database support in Rex-ORM allows you to:

1. Store and retrieve vector embeddings
2. Perform similarity searches
3. Build AI-powered features like semantic search, recommendations, and
   clustering
4. Integrate with AI models for text and image embeddings

## Supported Vector Databases

Rex-ORM currently supports the following vector database capabilities:

- **PostgreSQL with pgvector**: Using the `pgvector` extension
- **SQLite with sqlite-vss**: Using the vector search extension for SQLite
- **In-memory vector store**: For development and testing

## Setup

### PostgreSQL with pgvector

To use PostgreSQL with pgvector, first ensure the extension is installed in your
database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then configure Rex-ORM to use the PostgreSQL vector adapter:

```typescript
import {
  DatabaseFactory,
  VectorAdapterType,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

const db = await DatabaseFactory.create({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "my_database",

  // Vector configuration
  vector: {
    adapter: VectorAdapterType.PGVECTOR,
    defaultDimensions: 1536, // For OpenAI embeddings
  },
});
```

### SQLite with Vector Extension

For SQLite, the vector extension is used automatically:

```typescript
import {
  DatabaseFactory,
  VectorAdapterType,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

const db = await DatabaseFactory.create({
  type: "sqlite",
  database: "./my_database.sqlite",

  // Vector configuration
  vector: {
    adapter: VectorAdapterType.SQLITE_VSS,
    defaultDimensions: 1536,
  },
});
```

## Defining Vector Models

To define a model with vector fields, use the `@Column` decorator with the
`vector` type:

```typescript
import {
  BaseModel,
  Column,
  Entity,
  PrimaryKey,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

@Entity({ tableName: "documents" })
export class Document extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  // Vector embedding column
  @Column({
    type: "vector",
    dimensions: 1536, // OpenAI embedding dimensions
    indexType: "hnsw", // Index type (hnsw, ivfflat, or flat)
  })
  embedding!: number[];
}
```

## Generating Embeddings

Rex-ORM doesn't generate embeddings directly but makes it easy to work with
AI-generated embeddings:

```typescript
import { Document } from "./models/document.ts";

// Function to get embeddings from OpenAI (using their API)
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

// Create a document with embedding
async function createDocumentWithEmbedding(title: string, content: string) {
  // Generate embedding from the content
  const embedding = await getEmbedding(content);

  // Create and save the document
  const document = new Document();
  document.title = title;
  document.content = content;
  document.embedding = embedding;
  await document.save();

  return document;
}
```

## Vector Queries

### Similarity Search

To find documents similar to a given embedding:

```typescript
import { VectorQuery } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";
import { Document } from "./models/document.ts";

async function findSimilarDocuments(query: string, limit = 5) {
  // Generate embedding for the query
  const queryEmbedding = await getEmbedding(query);

  // Perform similarity search
  const results = await Document.findAll({
    vector: {
      column: "embedding",
      vector: queryEmbedding,
      similarityThreshold: 0.7, // Minimum similarity score (0-1)
      distance: "cosine", // Distance function: cosine, euclidean, or dot
    },
    limit: limit,
    orderBy: "_vector_distance ASC", // Order by similarity (closest first)
  });

  return results;
}
```

### Combined Queries

You can combine vector search with traditional filters:

```typescript
async function searchDocumentsWithCategory(
  query: string,
  category: string,
  limit = 5,
) {
  const queryEmbedding = await getEmbedding(query);

  const results = await Document.findAll({
    where: {
      category: category, // Traditional filter
      isPublished: true,
    },
    vector: {
      column: "embedding",
      vector: queryEmbedding,
      similarityThreshold: 0.7,
    },
    limit: limit,
    orderBy: "_vector_distance ASC",
  });

  return results;
}
```

## Vector Search with Query Builder

For more complex vector queries, use the query builder:

```typescript
import { QueryBuilder } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

async function advancedVectorSearch(
  query: string,
  categories: string[],
  limit = 10,
) {
  const queryEmbedding = await getEmbedding(query);

  const queryBuilder = new QueryBuilder("documents")
    .select("*")
    .selectVectorDistance("embedding", queryEmbedding, "similarity")
    .whereVectorSimilarity("embedding", queryEmbedding, ">=", 0.7)
    .where("category IN (?)", [categories])
    .where("published_at IS NOT NULL")
    .orderBy("similarity DESC")
    .limit(limit);

  return await queryBuilder.execute(db);
}
```

## Custom Vector Operations

For specialized vector operations:

```typescript
import { VectorOperations } from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

async function customVectorOperation() {
  const vectorOps = new VectorOperations(db);

  // Vector operations
  const result = await vectorOps.findNearest({
    table: "documents",
    column: "embedding",
    vector: queryEmbedding,
    k: 10, // Number of nearest neighbors
    returnFields: ["id", "title", "content"],
    filter: "category = 'technology'",
    distanceType: "cosine",
  });

  return result;
}
```

## Working with Multiple Vector Fields

Models can have multiple vector fields for different types of embeddings:

```typescript
@Entity({ tableName: "products" })
export class Product extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "vector", dimensions: 1536 })
  textEmbedding!: number[]; // Embedding for text content

  @Column({ type: "vector", dimensions: 512 })
  imageEmbedding!: number[]; // Embedding for product image
}
```

## Vector Indexes

To optimize vector search performance, Rex-ORM supports multiple index types:

```typescript
@Column({
  type: "vector",
  dimensions: 1536,
  indexType: "hnsw",        // Hierarchical Navigable Small World graph
  indexParameters: {
    m: 16,                  // Maximum number of connections
    efConstruction: 64      // Size of the dynamic candidate list
  }
})
embedding!: number[];
```

Supported index types:

- `hnsw`: Fast approximate nearest neighbor search
- `ivfflat`: Inverted file with flat compression
- `flat`: Exact nearest neighbor search (slower but precise)

## Best Practices

1. **Choose appropriate dimensions** based on your embedding model
2. **Set index parameters** based on your dataset size and query patterns
3. **Use appropriate distance metrics** for your use case (cosine for text,
   euclidean for images)
4. **Batch process large datasets** when adding embeddings
5. **Consider dimensionality reduction** for very large embeddings
6. **Add traditional filtering** to improve search relevance and performance

## Example Use Cases

### Semantic Document Search

```typescript
async function semanticSearch(query: string, limit = 10) {
  const queryEmbedding = await getEmbedding(query);

  const documents = await Document.findAll({
    vector: {
      column: "embedding",
      vector: queryEmbedding,
      similarityThreshold: 0.7,
    },
    limit: limit,
    orderBy: "_vector_distance ASC",
  });

  return documents.map((doc) => ({
    title: doc.title,
    content: doc.content,
    similarity: doc._vector_distance,
  }));
}
```

### Product Recommendations

```typescript
async function getProductRecommendations(productId: number, limit = 5) {
  // Get the product
  const product = await Product.findByPk(productId);
  if (!product) return [];

  // Find similar products by embedding
  const similarProducts = await Product.findAll({
    where: {
      id: { $ne: productId }, // Exclude the current product
      category: product.category,
    },
    vector: {
      column: "embedding",
      vector: product.embedding,
    },
    limit: limit,
  });

  return similarProducts;
}
```

For more details on vector database support, check out the
[API Documentation](../api/index.md) and
[Vector Examples](https://github.com/username/rex-orm/tree/main/examples/vector).
