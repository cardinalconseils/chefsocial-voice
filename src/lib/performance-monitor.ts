/**
 * Performance Monitoring and Caching System
 * Tracks database queries, API responses, and memory usage
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private readonly defaultTtl = 5 * 60 * 1000; // 5 minutes default TTL

  /**
   * Track operation performance
   */
  trackOperation<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    return this.measureAsync(operation, fn, metadata);
  }

  /**
   * Track synchronous operation performance
   */
  trackSync<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    const startTime = Date.now();
    try {
      const result = fn();
      this.recordMetric(operation, Date.now() - startTime, metadata);
      return result;
    } catch (error) {
      this.recordMetric(operation, Date.now() - startTime, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure async operation performance
   */
  private async measureAsync<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, metadata);
      
      // Log slow operations
      if (duration > 200) {
        console.warn(`Slow operation: ${operation} took ${duration}ms`, metadata);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, { ...metadata, error: true });
      console.error(`Failed operation: ${operation} took ${duration}ms`, error);
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  private recordMetric(operation: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(operation?: string): {
    totalOperations: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    slowOperations: number;
    errorRate: number;
  } {
    let relevantMetrics = this.metrics;
    
    if (operation) {
      relevantMetrics = this.metrics.filter(m => m.operation === operation);
    }

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        slowOperations: 0,
        errorRate: 0
      };
    }

    const durations = relevantMetrics.map(m => m.duration);
    const errors = relevantMetrics.filter(m => m.metadata?.error).length;
    const slowOps = relevantMetrics.filter(m => m.duration > 200).length;

    return {
      totalOperations: relevantMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      slowOperations: slowOps,
      errorRate: (errors / relevantMetrics.length) * 100
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 50): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Cache data with TTL
   */
  setCache(key: string, data: any, ttl: number = this.defaultTtl): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached data
   */
  getCache(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Get or set cache with fallback function
   */
  async getCachedOrExecute<T>(
    key: string, 
    fn: () => Promise<T>, 
    ttl: number = this.defaultTtl
  ): Promise<T> {
    // Try cache first
    const cached = this.getCache(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    this.setCache(key, result, ttl);
    return result;
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Clear all metrics and cache
   */
  clear(): void {
    this.metrics = [];
    this.cache.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Cleanup cache every 5 minutes
setInterval(() => {
  const cleaned = performanceMonitor.cleanupCache();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired cache entries`);
  }
}, 5 * 60 * 1000);

// Database query wrapper with performance tracking
export function trackDatabaseQuery<T>(
  operation: string,
  query: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return performanceMonitor.trackOperation(`db_${operation}`, query, metadata);
}

// API endpoint wrapper with performance tracking
export function trackApiEndpoint<T>(
  endpoint: string,
  handler: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return performanceMonitor.trackOperation(`api_${endpoint}`, handler, metadata);
}

export default performanceMonitor; 