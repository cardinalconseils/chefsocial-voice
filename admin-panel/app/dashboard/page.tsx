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

interface SubscriptionStats {
  totalUsers: number;
  activeTrials: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  trialConversionRate: number;
  churnRate: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  restaurantName: string;
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete';
  trialStartDate: string;
  trialEndDate: string;
  subscriptionStartDate?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  monthlyAmount: number;
  paymentMethodLast4?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface RecentActivity {
  id: string;
  type: 'trial_started' | 'subscription_created' | 'payment_succeeded' | 'payment_failed' | 'subscription_cancelled';
  userId: string;
  userName: string;
  userEmail: string;
  amount?: number;
  timestamp: string;
  metadata?: any;
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'activity' | 'settings'>('overview');
  const [userFilter, setUserFilter] = useState<'all' | 'trialing' | 'active' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAnalytics();
    fetchDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
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

  const fetchDashboardData = async () => {
    try {
      const [statsRes, usersRes, activityRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/activity')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.activities || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleUserAction = async (userId: string, action: 'extend_trial' | 'cancel_subscription' | 'reactivate' | 'send_reminder') => {
    try {
      const response = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action }),
      });

      if (response.ok) {
        // Refresh user data
        fetchDashboardData();
        alert(`Action "${action}" completed successfully for user.`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      alert('An error occurred while performing the action.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      trialing: { color: 'bg-blue-100 text-blue-800', text: '🎯 Trial' },
      active: { color: 'bg-green-100 text-green-800', text: '✅ Active' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', text: '⚠️ Past Due' },
      cancelled: { color: 'bg-red-100 text-red-800', text: '❌ Cancelled' },
      incomplete: { color: 'bg-gray-100 text-gray-800', text: '⏳ Incomplete' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTrialDaysRemaining = (trialEndDate: string) => {
    const end = new Date(trialEndDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = userFilter === 'all' || user.subscriptionStatus === userFilter;
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.restaurantName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="loading-spin w-8 h-8 border-4 border-chef-orange border-t-transparent rounded-full" />
          <span className="ml-3 text-chef-gray">Loading dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

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

        {/* Tab Navigation */}
        <div className="border-b border-chef-light">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: '📊 Overview', count: null },
              { key: 'users', label: '👥 Users', count: users.length },
              { key: 'activity', label: '📈 Activity', count: recentActivity.length },
              { key: 'settings', label: '⚙️ Settings', count: null },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.key
                    ? 'border-chef-orange text-chef-orange'
                    : 'border-transparent text-chef-gray hover:text-chef-dark hover:border-chef-light'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-chef-light text-chef-dark px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {selectedTab === 'users' && (
          <div className="space-y-6">
            {/* User Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex space-x-2">
                {[
                  { key: 'all', label: 'All Users' },
                  { key: 'trialing', label: 'Trials' },
                  { key: 'active', label: 'Active' },
                  { key: 'cancelled', label: 'Cancelled' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setUserFilter(filter.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userFilter === filter.key
                        ? 'bg-chef-orange text-white'
                        : 'bg-chef-light text-chef-dark hover:bg-chef-orange/10'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search users by name, email, or restaurant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-chef-light rounded-lg focus:ring-2 focus:ring-chef-orange focus:border-transparent"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-chef-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-chef-light">
                  <thead className="bg-chef-light/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-chef-gray uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-chef-gray uppercase tracking-wider">
                        Restaurant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-chef-gray uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-chef-gray uppercase tracking-wider">
                        Trial/Billing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-chef-gray uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-chef-light">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-chef-light/20">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-chef-dark">{user.name}</div>
                            <div className="text-sm text-chef-gray">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-chef-dark">{user.restaurantName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user.subscriptionStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-chef-gray">
                          {user.subscriptionStatus === 'trialing' ? (
                            <div>
                              <div className="font-medium">
                                {getTrialDaysRemaining(user.trialEndDate)} days left
                              </div>
                              <div>Ends {formatDate(user.trialEndDate)}</div>
                            </div>
                          ) : user.subscriptionStatus === 'active' ? (
                            <div>
                              <div className="font-medium">{formatCurrency(user.monthlyAmount)}/month</div>
                              {user.nextPaymentDate && (
                                <div>Next: {formatDate(user.nextPaymentDate)}</div>
                              )}
                            </div>
                          ) : (
                            <div>-</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {user.subscriptionStatus === 'trialing' && (
                            <button
                              onClick={() => handleUserAction(user.id, 'extend_trial')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Extend trial by 7 days"
                            >
                              ⏰ Extend
                            </button>
                          )}
                          {user.subscriptionStatus === 'active' && (
                            <button
                              onClick={() => handleUserAction(user.id, 'cancel_subscription')}
                              className="text-red-600 hover:text-red-900"
                              title="Cancel subscription"
                            >
                              ❌ Cancel
                            </button>
                          )}
                          {user.subscriptionStatus === 'cancelled' && (
                            <button
                              onClick={() => handleUserAction(user.id, 'reactivate')}
                              className="text-green-600 hover:text-green-900"
                              title="Reactivate subscription"
                            >
                              ✅ Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => handleUserAction(user.id, 'send_reminder')}
                            className="text-chef-orange hover:text-chef-orange-dark"
                            title="Send reminder email"
                          >
                            📧 Email
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-chef-gray text-lg">No users found</div>
                  <div className="text-chef-gray text-sm mt-1">
                    {userFilter !== 'all' ? 'Try changing the filter' : 'No users have registered yet'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'activity' && (
          <div className="bg-white rounded-xl shadow-sm border border-chef-light">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-chef-dark mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 bg-chef-light/20 rounded-lg">
                    <div className="flex-shrink-0">
                      {activity.type === 'trial_started' && <span className="text-2xl">🎯</span>}
                      {activity.type === 'subscription_created' && <span className="text-2xl">✅</span>}
                      {activity.type === 'payment_succeeded' && <span className="text-2xl">💳</span>}
                      {activity.type === 'payment_failed' && <span className="text-2xl">❌</span>}
                      {activity.type === 'subscription_cancelled' && <span className="text-2xl">🚫</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-chef-dark">
                        {activity.userName} ({activity.userEmail})
                      </div>
                      <div className="text-sm text-chef-gray">
                        {activity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {activity.amount && ` - ${formatCurrency(activity.amount)}`}
                      </div>
                    </div>
                    <div className="text-sm text-chef-gray">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>

              {recentActivity.length === 0 && (
                <div className="text-center py-8 text-chef-gray">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border border-chef-light p-6">
            <h3 className="text-lg font-semibold text-chef-dark mb-4">License Management Settings</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-chef-dark mb-2">Trial Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-chef-gray mb-1">
                      Default Trial Length (days)
                    </label>
                    <input
                      type="number"
                      defaultValue="14"
                      className="w-full px-3 py-2 border border-chef-light rounded-lg focus:ring-2 focus:ring-chef-orange focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-chef-gray mb-1">
                      Trial Extension Length (days)
                    </label>
                    <input
                      type="number"
                      defaultValue="7"
                      className="w-full px-3 py-2 border border-chef-light rounded-lg focus:ring-2 focus:ring-chef-orange focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-chef-dark mb-2">Subscription Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-chef-gray mb-1">
                      Monthly Price (USD cents)
                    </label>
                    <input
                      type="number"
                      defaultValue="7900"
                      className="w-full px-3 py-2 border border-chef-light rounded-lg focus:ring-2 focus:ring-chef-orange focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-chef-gray mb-1">
                      Grace Period (days)
                    </label>
                    <input
                      type="number"
                      defaultValue="3"
                      className="w-full px-3 py-2 border border-chef-light rounded-lg focus:ring-2 focus:ring-chef-orange focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-chef-dark mb-2">Notification Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-3" />
                    <span className="text-sm text-chef-gray">Send trial expiration reminders (3 days before)</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-3" />
                    <span className="text-sm text-chef-gray">Send payment failure notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-3" />
                    <span className="text-sm text-chef-gray">Send subscription cancellation confirmations</span>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button className="px-6 py-2 bg-chef-orange text-white rounded-lg hover:bg-chef-orange-dark transition-colors">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}