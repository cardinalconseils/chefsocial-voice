'use client';

import { useState, useEffect } from 'react';

interface PerformanceData {
  overview: {
    healthScore: number;
    totalOperations: number;
    averageResponseTime: number;
    slowOperations: number;
    errorRate: number;
    cacheSize: number;
  };
  statistics: any;
  operationBreakdown: Record<string, any>;
  recentMetrics: any[];
  cacheStatistics: any;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  recommendations: string[];
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/admin/performance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = async () => {
    try {
      const response = await fetch('/api/admin/performance', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        await fetchPerformanceData();
      }
    } catch (err) {
      console.error('Failed to clear metrics:', err);
    }
  };

  useEffect(() => {
    fetchPerformanceData();

    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Performance Data</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPerformanceData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
              <p className="text-gray-600 mt-2">Real-time system performance metrics and analytics</p>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Auto-refresh</span>
              </label>
              <button
                onClick={fetchPerformanceData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
              <button
                onClick={clearMetrics}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear Metrics
              </button>
            </div>
          </div>
        </div>

        {/* Health Score */}
        <div className={`mb-8 p-6 rounded-lg ${getHealthScoreBackground(data.overview.healthScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Health Score</h2>
              <p className="text-gray-600">Overall system performance indicator</p>
            </div>
            <div className={`text-6xl font-bold ${getHealthScoreColor(data.overview.healthScore)}`}>
              {data.overview.healthScore}
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Operations</h3>
            <p className="text-3xl font-bold text-blue-600">{data.overview.totalOperations.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Response Time</h3>
            <p className="text-3xl font-bold text-green-600">{data.overview.averageResponseTime}ms</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Slow Operations</h3>
            <p className="text-3xl font-bold text-yellow-600">{data.overview.slowOperations}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Rate</h3>
            <p className="text-3xl font-bold text-red-600">{data.overview.errorRate.toFixed(2)}%</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cache Size</h3>
            <p className="text-3xl font-bold text-purple-600">{data.overview.cacheSize}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Memory Usage</h3>
            <p className="text-3xl font-bold text-indigo-600">{data.memoryUsage.heapUsed}MB</p>
          </div>
        </div>

        {/* Operation Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Database Operations</h3>
            <div className="space-y-3">
              {Object.entries(data.operationBreakdown)
                .filter(([key]) => key.startsWith('db_'))
                .map(([operation, stats]: [string, any]) => (
                  <div key={operation} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{operation.replace('db_', '')}</span>
                    <div className="text-right">
                      <span className="font-semibold">{stats.averageDuration.toFixed(1)}ms</span>
                      <span className="text-xs text-gray-500 ml-2">({stats.totalOperations} ops)</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints</h3>
            <div className="space-y-3">
              {Object.entries(data.operationBreakdown)
                .filter(([key]) => key.startsWith('api_'))
                .map(([operation, stats]: [string, any]) => (
                  <div key={operation} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{operation.replace('api_', '')}</span>
                    <div className="text-right">
                      <span className="font-semibold">{stats.averageDuration.toFixed(1)}ms</span>
                      <span className="text-xs text-gray-500 ml-2">({stats.totalOperations} ops)</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Memory Usage Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{data.memoryUsage.rss}MB</p>
              <p className="text-sm text-gray-600">RSS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{data.memoryUsage.heapUsed}MB</p>
              <p className="text-sm text-gray-600">Heap Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{data.memoryUsage.heapTotal}MB</p>
              <p className="text-sm text-gray-600">Heap Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{data.memoryUsage.external}MB</p>
              <p className="text-sm text-gray-600">External</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Recommendations</h3>
          <div className="space-y-2">
            {data.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">💡</span>
                <p className="text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 