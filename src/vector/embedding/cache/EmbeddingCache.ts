/**
 * Cache for embedding vectors
 * Used to avoid redundant computations of embeddings
 */
export class EmbeddingCache {
  /**
   * In-memory cache of embeddings
   */
  private static cache = new Map<string, number[]>();

  /**
   * Maximum size of the cache
   */
  private static maxSize = 1000;

  /**
   * Time-to-live for cache entries in milliseconds
   */
  private static ttl = 3600 * 1000; // 1 hour default

  /**
   * Map of cache entry expiration times
   */
  private static expirations = new Map<string, number>();

  /**
   * Set the maximum size of the cache
   * @param size New maximum size
   */
  static setMaxSize(size: number): void {
    EmbeddingCache.maxSize = size;
    EmbeddingCache.pruneCache();
  }

  /**
   * Set the time-to-live for cache entries
   * @param ttlSeconds Time-to-live in seconds
   */
  static setTTL(ttlSeconds: number): void {
    EmbeddingCache.ttl = ttlSeconds * 1000;
    EmbeddingCache.pruneCache();
  }

  /**
   * Store an embedding in the cache
   * @param key Cache key (typically text content)
   * @param embedding Vector embedding
   */
  static set(key: string, embedding: number[]): void {
    // Add to cache, remove oldest if full
    if (EmbeddingCache.cache.size >= EmbeddingCache.maxSize) {
      // Find the oldest entry by expiration time
      let oldestKey = "";
      let oldestTime = Date.now();

      for (const [k, time] of EmbeddingCache.expirations.entries()) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = k;
        }
      }

      // If we found an oldest key, remove it
      if (oldestKey) {
        EmbeddingCache.cache.delete(oldestKey);
        EmbeddingCache.expirations.delete(oldestKey);
      } else {
        // If no clear oldest (unlikely), remove first entry
        const firstKey = EmbeddingCache.cache.keys().next().value;
        if (typeof firstKey === "string") {
          EmbeddingCache.cache.delete(firstKey);
          EmbeddingCache.expirations.delete(firstKey);
        }
      }
    }

    // Add new entry
    EmbeddingCache.cache.set(key, embedding);
    EmbeddingCache.expirations.set(key, Date.now() + EmbeddingCache.ttl);
  }

  /**
   * Get an embedding from the cache
   * @param key Cache key
   * @returns The embedding if found, undefined otherwise
   */
  static get(key: string): number[] | undefined {
    // Check if entry exists and isn't expired
    const expiration = EmbeddingCache.expirations.get(key);
    if (expiration === undefined || expiration < Date.now()) {
      // Expired or missing, remove if needed
      if (expiration !== undefined) {
        EmbeddingCache.cache.delete(key);
        EmbeddingCache.expirations.delete(key);
      }
      return undefined;
    }

    // Return valid cached embedding
    return EmbeddingCache.cache.get(key);
  }

  /**
   * Check if the cache has a valid entry for a key
   * @param key Cache key
   * @returns true if a valid entry exists
   */
  static has(key: string): boolean {
    const expiration = EmbeddingCache.expirations.get(key);
    return expiration !== undefined && expiration >= Date.now();
  }

  /**
   * Clear the entire cache
   */
  static clear(): void {
    EmbeddingCache.cache.clear();
    EmbeddingCache.expirations.clear();
  }

  /**
   * Remove expired entries from the cache
   */
  private static pruneCache(): void {
    const now = Date.now();
    for (const [key, expiration] of EmbeddingCache.expirations.entries()) {
      if (expiration < now) {
        EmbeddingCache.cache.delete(key);
        EmbeddingCache.expirations.delete(key);
      }
    }
  }
}
