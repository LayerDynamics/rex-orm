import { VectorConfig } from "./types.ts";

/**
 * Default configuration for vector operations
 */
const defaultConfig: VectorConfig = {
  enabled: false,
  defaultProvider: "openai",
  defaultDimensions: 1536, // Default for OpenAI embeddings
  defaultMetric: "cosine",
  embeddingProviders: {
    openai: {
      type: "openai",
      model: "text-embedding-ada-002",
      dimensions: 1536,
    },
    ollama: {
      type: "ollama",
      model: "nomic-embed-text",
      dimensions: 768,
      endpoint: "http://localhost:11434/api/embeddings",
    },
    local: {
      type: "local",
      model: "mini",
      dimensions: 384,
    },
  },
  adapters: {
    pgvector: {
      type: "postgres",
      indexType: "hnsw",
      efConstruction: 128,
      m: 16,
    },
    "sqlite-vss": {
      type: "sqlite",
      indexType: "hnsw",
      efConstruction: 64,
      m: 8,
    },
  },
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: 3600,
  },
};

export default defaultConfig;
