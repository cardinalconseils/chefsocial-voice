import { NextRequest, NextResponse } from 'next/server';
import { DatabaseOperations } from '../../../../lib/database';
import { AuthService } from '../../../../lib/auth';

const authService = new AuthService();
const db = new DatabaseOperations();

/**
 * GET /api/admin/performance
 * Get system performance metrics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await authService.getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const operation = url.searchParams.get('operation');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const startTime = Date.now();

    // Get performance metrics from database
    const metrics = db.getPerformanceMetrics();
    const memoryUsage = process.memoryUsage();

    // Calculate overview statistics
    const overview = {
      healthScore: 95, // Placeholder - could be calculated based on metrics
      totalOperations: metrics.stats?.totalOperations || 0,
      averageResponseTime: metrics.stats?.averageTime || 0,
      slowOperations: metrics.recent?.filter((m: any) => m.duration > 50).length || 0,
      errorRate: 0, // Placeholder
      cacheSize: metrics.cacheSize || 0
    };

    // Format recent metrics
    const recentMetrics = metrics.recent?.map((metric: any) => ({
      operation: metric.operation,
      duration: metric.duration,
      timestamp: metric.timestamp,
      status: metric.duration > 50 ? 'slow' : 'normal'
    })) || [];

    // Memory usage in MB
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    // Generate recommendations
    const recommendations = [];
    if (overview.averageResponseTime > 100) {
      recommendations.push('Consider optimizing database queries - average response time is high');
    }
    if (overview.slowOperations > 5) {
      recommendations.push('Multiple slow operations detected - review query performance');
    }
    if (memoryUsageMB.heapUsed > 100) {
      recommendations.push('High memory usage - consider implementing memory optimization');
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        overview,
        statistics: metrics.stats,
        operationBreakdown: metrics.stats?.operationCounts || {},
        recentMetrics,
        cacheStatistics: {
          size: metrics.cacheSize,
          hitRate: 0 // Placeholder - would need to track hits/misses
        },
        memoryUsage: memoryUsageMB,
        recommendations,
        responseTime
      }
    });

  } catch (error) {
    console.error('Performance monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/performance
 * Clear performance metrics and cache
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await authService.getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Clear metrics and cache
    db.clearPerformanceCache();

    return NextResponse.json({
      success: true,
      message: 'Performance metrics and cache cleared'
    });

  } catch (error) {
    console.error('Performance clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * Calculate system health score based on performance metrics
 */
function calculateHealthScore(
  stats: any,
  memoryUsage: NodeJS.MemoryUsage
): number {
  let score = 100;

  // Deduct points for slow operations
  if (stats.averageDuration > 200) score -= 20;
  else if (stats.averageDuration > 100) score -= 10;

  // Deduct points for errors
  if (stats.errorRate > 5) score -= 30;
  else if (stats.errorRate > 1) score -= 15;

  // Deduct points for high memory usage (>500MB heap)
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 500) score -= 20;
  else if (heapUsedMB > 300) score -= 10;

  // Deduct points for many slow operations
  const slowOperationRate = stats.totalOperations > 0 ? 
    (stats.slowOperations / stats.totalOperations) * 100 : 0;
  if (slowOperationRate > 20) score -= 25;
  else if (slowOperationRate > 10) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(
  stats: any,
  operationStats: Record<string, any>,
  memoryUsage: NodeJS.MemoryUsage
): string[] {
  const recommendations: string[] = [];

  // Database performance recommendations
  const dbOperations = Object.entries(operationStats)
    .filter(([key]) => key.startsWith('db_'))
    .sort(([,a], [,b]) => b.averageDuration - a.averageDuration);

  if (dbOperations.length > 0 && dbOperations[0][1].averageDuration > 100) {
    recommendations.push(
      `Slowest database operation: ${dbOperations[0][0]} (${Math.round(dbOperations[0][1].averageDuration)}ms). Consider adding indexes or optimizing query.`
    );
  }

  // API performance recommendations
  const apiOperations = Object.entries(operationStats)
    .filter(([key]) => key.startsWith('api_'))
    .sort(([,a], [,b]) => b.averageDuration - a.averageDuration);

  if (apiOperations.length > 0 && apiOperations[0][1].averageDuration > 200) {
    recommendations.push(
      `Slowest API endpoint: ${apiOperations[0][0]} (${Math.round(apiOperations[0][1].averageDuration)}ms). Consider caching or optimization.`
    );
  }

  // Memory recommendations
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 400) {
    recommendations.push(
      `High memory usage detected (${Math.round(heapUsedMB)}MB). Consider implementing memory cleanup or reducing cache size.`
    );
  }

  // Error rate recommendations
  if (stats.errorRate > 1) {
    recommendations.push(
      `Error rate is ${Math.round(stats.errorRate * 100) / 100}%. Review error logs and implement better error handling.`
    );
  }

  // General recommendations
  if (stats.slowOperations > stats.totalOperations * 0.1) {
    recommendations.push(
      'More than 10% of operations are slow (>200ms). Consider implementing caching and query optimization.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('System performance is optimal. No immediate actions required.');
  }

  return recommendations;
} 