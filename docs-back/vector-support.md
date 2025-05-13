# Optional Vector Operations Support in Rex ORM

## Executive Summary

After reviewing the codebase, I'd like to propose a comprehensive approach for
implementing vector-based operations as an optional feature in Rex ORM. This
document outlines the architectural changes, interfaces, and implementation
strategies needed to add vector operation support without making it a required
feature.

## Current Implementation Analysis

The codebase already has a robust implementation of vector operations through
the `QueryBuilder` class with:

- Core vector operations (KNN search, similarity search, distance search, vector
  matching)
- Support for different vector DB engines (pgvector, SQLite VSS, custom
  configurations)
- Advanced features (hybrid ranking, custom formatters, different query
  placements)
- Test cases demonstrating real-world scenarios

However, these features appear to be tightly integrated into the core
`QueryBuilder` class, making them difficult to separate as optional components.

## Proposed Architecture

### 1. Plugin-based Vector Support

```typescript
// Core interface for vector operation plugins
interface VectorPlugin {
  name: string;
  initialize(): Promise<boolean>;
  isSupported(): boolean;
  getOperations(): VectorOperationsProvider;
}

// Provider for actual vector operations
interface VectorOperationsProvider {
  knnSearch(
    column: string,
    vector: number[] | string,
    k?: number,
    metric?: string,
  ): QueryModifier;
  similaritySearch(
    column: string,
    vector: number[] | string,
    metric?: string,
  ): QueryModifier;
  distanceSearch(
    column: string,
    vector: number[] | string,
    metric?: string,
  ): QueryModifier;
  vectorMatch(
    column: string,
    vector: number[] | string,
    threshold?: number,
    metric?: string,
  ): QueryModifier;
  customVectorOperation(
    column: string,
    vector: number[] | string,
    customSyntax: string,
    additionalParams?: Record<string, unknown>,
  ): QueryModifier;
  cosineSimilarity(
    column: string,
    vector: number[],
    similarity?: number,
  ): QueryModifier;
}

// Interface for modifying a query
interface QueryModifier {
  apply(queryBuilder: QueryBuilder): void;
}
```

### 2. Decorator Pattern for Query Builder

```typescript
// Add vector functionality through decorators
@VectorOperations()
class QueryBuilder {
  // Existing core functionality
}

// Implementation
function VectorOperations() {
  return function <T extends { new (...args: any[]): QueryBuilder }>(
    constructor: T,
  ) {
    return class extends constructor {
      #vectorPlugin: VectorPlugin | null = null;

      constructor(...args: any[]) {
        super(...args);
        this.#vectorPlugin = VectorPluginRegistry.getDefaultPlugin();
      }

      useVectorPlugin(pluginName: string): this {
        const plugin = VectorPluginRegistry.getPlugin(pluginName);
        if (plugin && plugin.isSupported()) {
          this.#vectorPlugin = plugin;
        } else {
          console.warn(
            `Vector plugin "${pluginName}" not found or not supported.`,
          );
        }
        return this;
      }

      // Vector operation methods that delegate to the plugin
      knnSearch(
        column: string,
        vector: number[] | string,
        k?: number,
        metric?: string,
      ): this {
        if (this.#vectorPlugin) {
          const modifier = this.#vectorPlugin.getOperations().knnSearch(
            column,
            vector,
            k,
            metric,
          );
          modifier.apply(this);
        }
        return this;
      }

      // Other vector methods similarly implemented
    };
  };
}
```

### 3. Registry for Vector Database Configurations

```typescript
// Registry for vector database configurations and plugins
class VectorPluginRegistry {
  private static plugins: Map<string, VectorPlugin> = new Map();
  private static defaultPlugin: string | null = null;

  static registerPlugin(plugin: VectorPlugin): void {
    VectorPluginRegistry.plugins.set(plugin.name, plugin);
    if (VectorPluginRegistry.defaultPlugin === null) {
      VectorPluginRegistry.defaultPlugin = plugin.name;
    }
  }

  static getPlugin(name: string): VectorPlugin | null {
    return VectorPluginRegistry.plugins.get(name) || null;
  }

  static getDefaultPlugin(): VectorPlugin | null {
    if (VectorPluginRegistry.defaultPlugin === null) {
      return null;
    }
    return VectorPluginRegistry.plugins.get(
      VectorPluginRegistry.defaultPlugin,
    ) || null;
  }

  static setDefaultPlugin(name: string): boolean {
    if (VectorPluginRegistry.plugins.has(name)) {
      VectorPluginRegistry.defaultPlugin = name;
      return true;
    }
    return false;
  }
}
```

### 4. Lazy-loading Implementation

```typescript
// Lazy-loading vector functionality
class VectorFeaturesLoader {
  private static isLoaded = false;
  private static isLoading = false;

  static async loadVectorFeatures(): Promise<boolean> {
    if (VectorFeaturesLoader.isLoaded) return true;
    if (VectorFeaturesLoader.isLoading) {
      // Wait for loading to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (VectorFeaturesLoader.isLoaded) {
            resolve(true);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    VectorFeaturesLoader.isLoading = true;
    try {
      // Dynamic import for vector functionality
      const { PgVectorPlugin, SQLiteVSSPlugin } = await import(
        "./vector/plugins.ts"
      );

      // Register available plugins
      VectorPluginRegistry.registerPlugin(new PgVectorPlugin());
      VectorPluginRegistry.registerPlugin(new SQLiteVSSPlugin());

      VectorFeaturesLoader.isLoaded = true;
      return true;
    } catch (error) {
      console.error("Failed to load vector features:", error);
      return false;
    } finally {
      VectorFeaturesLoader.isLoading = false;
    }
  }
}
```

## Database Adapter Enhancements

### 1. Vector Capability Detection

```typescript
interface DatabaseAdapter {
  // Existing adapter methods

  // Vector capability detection
  hasVectorSupport(): Promise<boolean>;
  getVectorCapabilities(): Promise<VectorCapabilities>;
}

interface VectorCapabilities {
  supportedOperations: string[]; // KNN, SIMILARITY, etc.
  maxVectorDimensions: number;
  supportedMetrics: string[]; // cosine, euclidean, etc.
  nativeImplementation: string; // pgvector, sqlite-vss, etc.
}
```

### 2. Database-Specific Vector Plugins

```typescript
// PostgreSQL with pgvector
class PgVectorPlugin implements VectorPlugin {
  name = "pgvector";

  async initialize(): Promise<boolean> {
    // Check if pgvector extension is installed
    // return true if available
    return true;
  }

  isSupported(): boolean {
    // Check if the current environment supports pgvector
    return true;
  }

  getOperations(): VectorOperationsProvider {
    return new PgVectorOperations();
  }
}

// SQLite with VSS extension
class SQLiteVSSPlugin implements VectorPlugin {
  name = "sqlite-vss";

  async initialize(): Promise<boolean> {
    // Check if SQLite VSS extension is available
    // return true if available
    return true;
  }

  // Other methods
}
```

## Model-Level Vector Integration

### 1. Vector Field Type

```typescript
// Define a specialized vector field type
function Vector(options: VectorFieldOptions = {}) {
  return function (target: any, propertyKey: string) {
    // Define metadata for this field
    Reflect.defineMetadata(
      "vector:field",
      {
        dimensions: options.dimensions || 1536, // Default to OpenAI embedding size
        indexed: options.indexed !== false, // Default to indexed
        metric: options.metric || "cosine",
      },
      target,
      propertyKey,
    );

    // Load vector functionality if field is used
    VectorFeaturesLoader.loadVectorFeatures();
  };
}

interface VectorFieldOptions {
  dimensions?: number;
  indexed?: boolean;
  metric?: "cosine" | "euclidean" | "dot" | "manhattan";
  indexType?: "hnsw" | "ivfflat";
}
```

### 2. Model Decorator for Vector Support

```typescript
// Add vector search capabilities to a model
function VectorSearchable(options: VectorSearchableOptions = {}) {
  return function <T extends { new (...args: any[]): any }>(constructor: T) {
    // Register this model with vector capabilities
    VectorModelRegistry.register(constructor.name, {
      defaultSearchField: options.defaultSearchField,
      defaultMetric: options.defaultMetric || "cosine",
    });

    // Enhance the model with vector search methods
    return class extends constructor {
      static async findSimilar(
        vector: number[] | string,
        options?: FindSimilarOptions,
      ): Promise<InstanceType<T>[]> {
        // Implement vector similarity search
        const vectorFields = VectorModelRegistry.getVectorFields(
          constructor.name,
        );
        const searchField = options?.field || vectorFields[0] ||
          options?.defaultSearchField;

        if (!searchField) {
          throw new Error(
            `No vector field specified for similarity search on ${constructor.name}`,
          );
        }

        const qb = new QueryBuilder()
          .select("*")
          .from(this.tableName())
          .similaritySearch(searchField, vector, options?.metric)
          .limit(options?.limit || 10);

        return await qb.execute();
      }

      // Other vector-specific methods
    };
  };
}

interface VectorSearchableOptions {
  defaultSearchField?: string;
  defaultMetric?: "cosine" | "euclidean" | "dot" | "manhattan";
}

interface FindSimilarOptions {
  field?: string;
  metric?: string;
  limit?: number;
  threshold?: number;
}
```

## Schema Migration Support

### 1. Vector-specific Migration Methods

```typescript
// Add vector-specific methods to migration builder
class SchemaBuilder {
  // Existing schema methods

  // Create a vector column
  vectorColumn(
    name: string,
    dimensions: number,
    options?: VectorColumnOptions,
  ): this {
    if (!VectorFeaturesLoader.isLoaded) {
      console.warn(
        "Vector features not loaded. Column will be created but vector functionality may not work.",
      );
    }

    // Add vector column based on DB type
    if (this.dbAdapter.type === "postgres") {
      this.rawSql(
        `ALTER TABLE ${this.tableName} ADD COLUMN ${name} vector(${dimensions})`,
      );
    } else if (this.dbAdapter.type === "sqlite") {
      this.rawSql(`ALTER TABLE ${this.tableName} ADD COLUMN ${name} BLOB`);
    }

    // Add vector index if specified
    if (options?.indexed) {
      this.addVectorIndex(name, options);
    }

    return this;
  }

  // Add a vector index
  addVectorIndex(columnName: string, options: VectorIndexOptions = {}): this {
    const indexType = options.indexType || "hnsw";
    const metric = options.metric || "cosine";

    // Create index based on DB type
    if (this.dbAdapter.type === "postgres") {
      this.rawSql(
        `CREATE INDEX ${options.name || `idx_${this.tableName}_${columnName}`} 
                   ON ${this.tableName} USING ${indexType}(${columnName} ${metric}_ops)`,
      );
    }

    return this;
  }
}

interface VectorColumnOptions {
  indexed?: boolean;
  indexType?: "hnsw" | "ivfflat";
  metric?: "cosine" | "euclidean" | "dot" | "manhattan";
}

interface VectorIndexOptions extends VectorColumnOptions {
  name?: string;
}
```

## Performance Considerations

### 1. Caching for Embeddings

```typescript
// Cache embeddings to avoid redundant computation
class EmbeddingCache {
  private static cache = new Map<string, number[]>();
  private static maxSize: number = 1000;

  static set(key: string, embedding: number[]): void {
    // Add to cache, remove oldest if full
    if (EmbeddingCache.cache.size >= EmbeddingCache.maxSize) {
      const oldestKey = EmbeddingCache.cache.keys().next().value;
      EmbeddingCache.cache.delete(oldestKey);
    }

    EmbeddingCache.cache.set(key, embedding);
  }

  static get(key: string): number[] | undefined {
    return EmbeddingCache.cache.get(key);
  }

  static has(key: string): boolean {
    return EmbeddingCache.cache.has(key);
  }

  static clear(): void {
    EmbeddingCache.cache.clear();
  }
}
```

### 2. Hybrid Search Optimization

```typescript
// Optimize hybrid vector + keyword search
class HybridSearchOptimizer {
  static optimizeQuery(
    queryBuilder: QueryBuilder,
    options: HybridSearchOptions,
  ): QueryBuilder {
    // Determine if we should do text search first or vector search first
    if (options.strategy === "text-first") {
      return HybridSearchOptimizer.textFirstStrategy(queryBuilder, options);
    } else {
      return HybridSearchOptimizer.vectorFirstStrategy(queryBuilder, options);
    }
  }

  private static textFirstStrategy(
    queryBuilder: QueryBuilder,
    options: HybridSearchOptions,
  ): QueryBuilder {
    // Perform text search first to filter candidates, then rerank with vector
    return queryBuilder
      .textSearch(options.textFields, options.textQuery)
      .limit(options.textCandidates || 1000)
      .knnSearch(options.vectorField, options.vector, options.limit)
      .hybridRanking({
        vector: options.vectorWeight || 0.7,
        text: options.textWeight || 0.3,
      });
  }

  private static vectorFirstStrategy(
    queryBuilder: QueryBuilder,
    options: HybridSearchOptions,
  ): QueryBuilder {
    // Perform vector search first, then filter with text
    return queryBuilder
      .knnSearch(
        options.vectorField,
        options.vector,
        options.vectorCandidates || 1000,
      )
      .textSearch(options.textFields, options.textQuery)
      .hybridRanking({
        vector: options.vectorWeight || 0.7,
        text: options.textWeight || 0.3,
      })
      .limit(options.limit || 10);
  }
}

interface HybridSearchOptions {
  vectorField: string;
  vector: number[] | string;
  textFields: string[];
  textQuery: string;
  strategy?: "text-first" | "vector-first";
  limit?: number;
  textCandidates?: number;
  vectorCandidates?: number;
  vectorWeight?: number;
  textWeight?: number;
}
```

## Integration with Embedding Services

### 1. Embedding Provider Interface

```typescript
// Interface for embedding providers
interface EmbeddingProvider {
  name: string;
  getEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>;
  batchGetEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<number[][]>;
  dimensions: number;
}

// OpenAI embedding provider
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = "openai";
  dimensions = 1536; // for text-embedding-ada-002

  async getEmbedding(
    text: string,
    options?: EmbeddingOptions,
  ): Promise<number[]> {
    // Implementation using OpenAI API
    // This would make API calls to OpenAI's embedding endpoint
    return []; // Placeholder
  }

  async batchGetEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<number[][]> {
    // Batch implementation
    return []; // Placeholder
  }
}

interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  normalize?: boolean;
}
```

### 2. Automatic Embedding Generation

```typescript
// Add automatic embedding generation
function AutoEmbed(options: AutoEmbedOptions = {}) {
  return function (target: any, propertyKey: string) {
    // Get the source field that will generate the embedding
    const sourceField = options.from;
    if (!sourceField) {
      throw new Error(
        `AutoEmbed decorator requires a 'from' option to specify the source field`,
      );
    }

    // Add field metadata
    Reflect.defineMetadata(
      "vector:auto-embed",
      {
        from: sourceField,
        provider: options.provider || "default",
        dimensions: options.dimensions,
        normalize: options.normalize !== false,
      },
      target,
      propertyKey,
    );

    // Load vector functionality
    VectorFeaturesLoader.loadVectorFeatures();

    // Override setter for source field to update embedding
    const sourceDescriptor = Object.getOwnPropertyDescriptor(
      target,
      sourceField,
    );
    const originalSetter = sourceDescriptor?.set;

    if (originalSetter) {
      Object.defineProperty(target, sourceField, {
        ...sourceDescriptor,
        set: function (value) {
          originalSetter.call(this, value);

          // Schedule embedding update
          if (value) {
            setTimeout(async () => {
              const provider = EmbeddingProviderRegistry.getProvider(
                options.provider || "default",
              );
              if (provider) {
                try {
                  const embedding = await provider.getEmbedding(value);
                  this[propertyKey] = embedding;
                } catch (error) {
                  console.error(
                    `Failed to generate embedding for ${propertyKey}:`,
                    error,
                  );
                }
              }
            }, 0);
          }
        },
      });
    }
  };
}

interface AutoEmbedOptions {
  from: string;
  provider?: string;
  dimensions?: number;
  normalize?: boolean;
}

// Registry for embedding providers
class EmbeddingProviderRegistry {
  private static providers: Map<string, EmbeddingProvider> = new Map();
  private static defaultProvider: string | null = null;

  static registerProvider(provider: EmbeddingProvider): void {
    EmbeddingProviderRegistry.providers.set(provider.name, provider);
    if (EmbeddingProviderRegistry.defaultProvider === null) {
      EmbeddingProviderRegistry.defaultProvider = provider.name;
    }
  }

  static getProvider(name: string): EmbeddingProvider | null {
    return name === "default" && EmbeddingProviderRegistry.defaultProvider
      ? EmbeddingProviderRegistry.providers.get(
        EmbeddingProviderRegistry.defaultProvider,
      ) || null
      : EmbeddingProviderRegistry.providers.get(name) || null;
  }

  static setDefaultProvider(name: string): boolean {
    if (EmbeddingProviderRegistry.providers.has(name)) {
      EmbeddingProviderRegistry.defaultProvider = name;
      return true;
    }
    return false;
  }
}
```

## GraphQL Integration

### 1. GraphQL Vector Types

```typescript
// GraphQL schema definition for vector types
const vectorTypeDefs = `
  # Vector input type
  input VectorInput {
    values: [Float!]!
  }
  
  # Vector search parameters
  input VectorSearchInput {
    vector: VectorInput!
    field: String
    limit: Int
    metric: String
    threshold: Float
  }
  
  # Vector similarity result type
  type VectorSimilarityResult {
    similarity: Float
    distance: Float
    item: Item
  }
  
  # Add to existing types
  extend type Query {
    searchSimilarItems(search: VectorSearchInput!): [VectorSimilarityResult!]!
    recommendItems(search: VectorSearchInput!): [VectorSimilarityResult!]!
  }
`;

// GraphQL resolver for vector search
const vectorResolvers = {
  Query: {
    searchSimilarItems: async (_, { search }, context) => {
      await VectorFeaturesLoader.loadVectorFeatures();

      const { vector, field = "embedding", limit = 10, metric = "cosine" } =
        search;

      const results = await context.models.Item.query()
        .select(["*"])
        .similaritySearch(field, vector.values, metric)
        .limit(limit)
        .execute();

      return results.map((item) => ({
        similarity: item.similarity,
        distance: item.distance,
        item,
      }));
    },

    recommendItems: async (_, { search }, context) => {
      // Similar to searchSimilarItems but with recommendation logic
      // ...
    },
  },
};
```

### 2. GraphQL Vector Directives

```typescript
// GraphQL directive for vector search
const vectorDirectives = `
  directive @vectorSearch(
    field: String!
    metric: String = "cosine"
    limit: Int = 10
  ) on FIELD_DEFINITION
  
  directive @vectorIndex(
    dimensions: Int!
    metric: String = "cosine"
    indexType: String = "hnsw"
  ) on FIELD_DEFINITION
`;

// GraphQL directive resolver for vector search
const vectorDirectiveResolvers = {
  vectorSearch: (next, source, { field, metric, limit }, context, info) => {
    // This directive transforms a regular field to use vector search
    // It expects a vector argument in the query

    const args = info.fieldNodes[0].arguments || [];
    const vectorArg = args.find((arg) => arg.name.value === "vector");

    if (!vectorArg) {
      throw new Error(`Vector search requires a 'vector' argument`);
    }

    // Extract vector value from arguments
    const vector = context.variableValues[vectorArg.value.name.value];

    // Replace resolver with vector search
    return context.models[info.parentType.name].query()
      .select(["*"])
      .similaritySearch(field, vector, metric)
      .limit(limit)
      .execute();
  },
};
```

## Configuration System

### 1. Global Vector Configuration

```typescript
// Global configuration for vector features
interface VectorConfig {
  enabled: boolean;
  defaultProvider: string;
  defaultDimensions: number;
  defaultMetric: string;
  embeddingProviders: {
    [name: string]: EmbeddingProviderConfig;
  };
  adapters: {
    [name: string]: VectorAdapterConfig;
  };
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
}

interface EmbeddingProviderConfig {
  type: string;
  apiKey?: string;
  model?: string;
  dimensions?: number;
  endpoint?: string;
}

interface VectorAdapterConfig {
  type: string;
  indexType?: string;
  efConstruction?: number;
  m?: number;
}

// Configuration manager
class VectorConfigManager {
  private static config: VectorConfig = {
    enabled: false,
    defaultProvider: "openai",
    defaultDimensions: 1536,
    defaultMetric: "cosine",
    embeddingProviders: {},
    adapters: {},
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 3600,
    },
  };

  static initialize(config: Partial<VectorConfig>): void {
    VectorConfigManager.config = {
      ...VectorConfigManager.config,
      ...config,
    };

    // Set up providers from config
    if (VectorConfigManager.config.enabled) {
      VectorFeaturesLoader.loadVectorFeatures()
        .then(() => {
          // Initialize providers
          Object.entries(VectorConfigManager.config.embeddingProviders).forEach(
            ([name, config]) => {
              const provider = VectorConfigManager.createProvider(name, config);
              if (provider) {
                EmbeddingProviderRegistry.registerProvider(provider);
              }
            },
          );

          // Set default provider
          EmbeddingProviderRegistry.setDefaultProvider(
            VectorConfigManager.config.defaultProvider,
          );
        });
    }
  }

  private static createProvider(
    name: string,
    config: EmbeddingProviderConfig,
  ): EmbeddingProvider | null {
    // Create provider based on type
    switch (config.type) {
      case "openai":
        return new OpenAIEmbeddingProvider(config);
      // Other provider types...
      default:
        console.warn(`Unknown embedding provider type: ${config.type}`);
        return null;
    }
  }

  static getConfig(): VectorConfig {
    return { ...VectorConfigManager.config };
  }

  static isEnabled(): boolean {
    return VectorConfigManager.config.enabled;
  }
}
```

## Implementation Strategy

To implement these features in a modular, optional way:

1. **Extract Vector Functionality**: Move vector operations from the core
   `QueryBuilder` into a separate module.

2. **Create Plugin System**: Implement the plugin architecture to load vector
   functionality only when needed.

3. **Dependency Injection**: Use dependency injection to provide vector
   capabilities to the ORM.

4. **Feature Detection**: Add runtime detection of vector database capabilities.

5. **Backward Compatibility Layer**: Ensure existing code that uses vector
   operations still works.

## Impact Assessment

### Positive Impacts

1. **Reduced Bundle Size**: Users who don't need vector operations don't pay the
   cost.
2. **Flexibility**: Support for multiple vector databases and embedding
   providers.
3. **Extensibility**: Plugin system allows adding new vector capabilities.
4. **Performance**: Optimized architecture for vector operations.

### Potential Challenges

1. **API Compatibility**: Maintaining backward compatibility while making vector
   operations optional.
2. **Testing Complexity**: More configuration combinations to test.
3. **Documentation Overhead**: Need to document optional nature and setup
   process.

## Implementation Roadmap

1. **Phase 1**: Extract vector operations into separate module
2. **Phase 2**: Implement plugin architecture and registry
3. **Phase 3**: Add embedding providers and integration
4. **Phase 4**: Develop GraphQL support
5. **Phase 5**: Update documentation and examples

## Conclusion

This implementation plan provides a comprehensive approach to making vector
operations an optional feature in Rex ORM. By using a plugin architecture, lazy
loading, and a robust configuration system, we can provide powerful vector
database capabilities without burdening users who don't need these features.

# Vector Operations Support Structure for Rex ORM

Based on your proposed architecture for optional vector operations support,
here's the recommended folder structure changes:

```
src/
  ├── vector/                            # New directory for all vector-related functionality
  │   ├── config/                        # Vector configuration
  │   │   ├── VectorConfigManager.ts     # Manages vector configs
  │   │   └── types.ts                   # Vector config types
  │   ├── embedding/                     # Embedding service providers
  │   │   ├── EmbeddingProvider.ts       # Base interface
  │   │   ├── EmbeddingProviderRegistry.ts # Registry for providers
  │   │   ├── providers/                 # Specific implementations
  │   │   │   ├── OpenAIEmbeddingProvider.ts
  │   │   │   └── LocalEmbeddingProvider.ts
  │   │   └── cache/                     # Embedding caching
  │   │       └── EmbeddingCache.ts      # Caching implementation
  │   ├── plugins/                       # Vector database plugins
  │   │   ├── VectorPlugin.ts            # Plugin interface
  │   │   ├── VectorPluginRegistry.ts    # Plugin registry
  │   │   ├── implementations/           # Specific implementations
  │   │   │   ├── PgVectorPlugin.ts      # PostgreSQL pgvector support
  │   │   │   └── SQLiteVSSPlugin.ts     # SQLite VSS support
  │   │   └── operations/                # Vector operation implementations
  │   │       ├── VectorOperationsProvider.ts # Provider interface
  │   │       ├── PgVectorOperations.ts  # pgvector operations
  │   │       └── SQLiteVSSOperations.ts # SQLite VSS operations
  │   ├── decorators/                    # Vector-specific decorators
  │   │   ├── Vector.ts                  # Vector field decorator
  │   │   ├── VectorSearchable.ts        # Model decorator
  │   │   └── AutoEmbed.ts               # Auto-embedding decorator
  │   ├── schema/                        # Schema support for vectors
  │   │   └── VectorSchemaBuilder.ts     # Vector schema extensions
  │   ├── graphql/                       # GraphQL integration
  │   │   ├── types.ts                   # GraphQL vector types
  │   │   ├── resolvers.ts               # GraphQL vector resolvers
  │   │   └── directives.ts              # GraphQL vector directives
  │   ├── search/                        # Search optimization
  │   │   └── HybridSearchOptimizer.ts   # Hybrid search implementation
  │   ├── loaders/                       # Lazy-loading support
  │   │   └── VectorFeaturesLoader.ts    # Loads vector features on demand
  │   ├── utils/                         # Vector utilities
  │   │   └── VectorUtils.ts             # Common vector operations
  │   ├── interfaces/                    # Vector interfaces
  │   │   ├── VectorCapabilities.ts      # DB capabilities interface
  │   │   └── QueryModifier.ts           # Query modification interface
  │   ├── models/                        # Vector model integrations
  │   │   └── VectorModelRegistry.ts     # Registry for vector models
  │   └── index.ts                       # Main entry point for vector features
  ├── query/
  │   ├── QueryBuilder.ts                # Core query builder (modified to use plugins)
  │   ├── decorators/                    # Query builder decorators
  │   │   └── VectorOperations.ts        # Vector operations decorator
  │   └── enhancers/                     # Query enhancers
  │       └── VectorEnhancer.ts          # Vector-specific query enhancing
  └── interfaces/
      ├── DatabaseAdapter.ts             # Enhanced with vector capabilities
      └── VectorAdapter.ts               # Vector-specific adapter interface
```

## Modified Files

The following files would need to be modified to implement this architecture:

```
src/query/QueryBuilder.ts            # Remove direct vector operations, add plugin support
src/interfaces/DatabaseAdapter.ts    # Add vector capabilities detection
src/adapters/PostgreSQLAdapter.ts    # Add vector support detection and operations
src/adapters/SQLiteAdapter.ts        # Add vector support detection and operations
src/migration/MigrationManager.ts    # Add vector schema operations
src/graphql/GraphQLSchema.ts         # Add vector type support
src/models/BaseModel.ts              # Add vector search methods when needed
```

## New Configuration Files

```
src/vector/config/default-config.ts  # Default vector configuration
```

## Documentation Updates

```
docs/vector-support.md              # Documentation for vector operations
docs/embedding-providers.md         # Guide for embedding service integration
docs/vector-database-support.md     # Supported vector databases
```

## Structure Rationale

1. **Isolation**: All vector functionality is isolated in its own directory
   structure
2. **Plugin-based**: The design follows the plugin pattern for extensibility
3. **Lazy-loading**: Vector features only load when needed
4. **Configuration-driven**: Behavior controlled through configuration
5. **DB-agnostic**: Support for multiple vector database engines

This structure enables you to implement vector operations as an optional feature
that doesn't impact the core functionality of Rex ORM, while still providing a
comprehensive and flexible vector search capability when it's needed.

---
