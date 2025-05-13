/**
 * Interface defining vector database capabilities
 * Describes what vector operations a plugin supports
 */
export interface VectorCapabilities {
  /**
   * Whether the plugin supports vector similarity search
   */
  readonly supportsSimilaritySearch: boolean;

  /**
   * Whether the plugin supports vector KNN search
   */
  readonly supportsKnnSearch: boolean;

  /**
   * Whether the plugin supports hybrid search (vector + text)
   */
  readonly supportsHybridSearch: boolean;

  /**
   * Whether the plugin supports custom distance metrics
   */
  readonly supportsCustomMetrics: boolean;

  /**
   * Maximum dimensions supported by the plugin
   */
  readonly maxDimensions: number;

  /**
   * Supported distance metrics
   */
  readonly supportedMetrics: string[];

  /**
   * Whether the plugin supports vector indexing
   */
  readonly supportsIndexing: boolean;

  /**
   * Supported index types
   */
  readonly supportedIndexTypes: string[];
}
