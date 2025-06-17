'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { analyticsAPI } from '@/lib/api';
import { Analytics } from '@/types';
import { 
  Users, 
  CreditCard, 
  UserPlus, 
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ title, value, change, trend, icon, loading }: StatCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-chef-orange bg-opacity-10 rounded-lg">
            {icon}
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center mt-1">
              {loading ? (
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-chef-dark">{value}</p>
              )}
            </div>
          </div>
        </div>
        {change && !loading && (
          <div className={`flex items-center text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">{change}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getAnalytics(period);
      setAnalytics(response.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-chef-dark">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with ChefSocial.</p>
          </div>
          
          <div className="mt-4 lg:mt-0">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="form-input w-auto"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={analytics?.totalUsers || 0}
            icon={<Users className="h-6 w-6 text-chef-orange" />}
            loading={loading}
          />
          
          <StatCard
            title="Active Subscriptions"
            value={analytics?.activeSubscriptions || 0}
            icon={<CreditCard className="h-6 w-6 text-chef-orange" />}
            loading={loading}
          />
          
          <StatCard
            title="New Users"
            value={analytics?.newUsers || 0}
            change={period === '30d' ? '+12%' : undefined}
            trend="up"
            icon={<UserPlus className="h-6 w-6 text-chef-orange" />}
            loading={loading}
          />
          
          <StatCard
            title="Content Generated"
            value={analytics?.contentGenerated || 0}
            change={period === '30d' ? '+24%' : undefined}
            trend="up"
            icon={<MessageSquare className="h-6 w-6 text-chef-orange" />}
            loading={loading}
          />
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-chef-dark">Monthly Recurring Revenue</h3>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(analytics?.revenue.monthlyRecurringRevenue || 0)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-chef-dark">Active Subscribers</h3>
              <Users className="h-6 w-6 text-chef-blue" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-chef-blue">
                {analytics?.revenue.activeSubscriptions || 0}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-chef-dark mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/users"
              className="p-4 border border-gray-200 rounded-lg hover:border-chef-orange hover:shadow-md transition-all"
            >
              <Users className="h-8 w-8 text-chef-orange mb-2" />
              <h4 className="font-medium text-chef-dark">Manage Users</h4>
              <p className="text-sm text-gray-600 mt-1">View and manage user accounts</p>
            </a>
            
            <a
              href="/analytics"
              className="p-4 border border-gray-200 rounded-lg hover:border-chef-orange hover:shadow-md transition-all"
            >
              <Activity className="h-8 w-8 text-chef-orange mb-2" />
              <h4 className="font-medium text-chef-dark">View Analytics</h4>
              <p className="text-sm text-gray-600 mt-1">Detailed platform analytics</p>
            </a>
            
            <a
              href="/audit"
              className="p-4 border border-gray-200 rounded-lg hover:border-chef-orange hover:shadow-md transition-all"
            >
              <MessageSquare className="h-8 w-8 text-chef-orange mb-2" />
              <h4 className="font-medium text-chef-dark">Audit Logs</h4>
              <p className="text-sm text-gray-600 mt-1">Review admin activities</p>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}