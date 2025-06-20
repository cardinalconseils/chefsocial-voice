'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  restaurantName: string
  role: string
  subscriptionStatus: string
  trialEndDate: string
  createdAt: string
}

interface AdminStats {
  totalUsers: number
  activeTrials: number
  paidSubscriptions: number
  totalRevenue: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  trialConversionRate: number
}

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  userId?: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeTrials: 0,
    paidSubscriptions: 0,
    totalRevenue: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    trialConversionRate: 0
  })
  const [recentUsers, setRecentUsers] = useState<User[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        router.push('/auth/login')
        return
      }

      try {
        const parsedUser = JSON.parse(userData)
        if (parsedUser.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        setUser(parsedUser)
      } catch (error) {
        router.push('/auth/login')
        return
      }
    }

    const loadDashboardData = async () => {
      try {
        // For now, using mock data until backend is fully ready
        // TODO: Replace with actual API calls once backend is ready
        
        // Simulated API calls
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
        
        setStats({
          totalUsers: 127,
          activeTrials: 45,
          paidSubscriptions: 82,
          totalRevenue: 2378,
          newUsersToday: 3,
          newUsersThisWeek: 18,
          newUsersThisMonth: 67,
          trialConversionRate: 64.2
        })

        setRecentUsers([
          {
            id: '1',
            email: 'demo@restaurant.com',
            name: 'Demo Restaurant',
            restaurantName: 'The Grand Bistro',
            role: 'user',
            subscriptionStatus: 'trialing',
            trialEndDate: '2024-01-15',
            createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
          },
          {
            id: '2', 
            email: 'chef@italianhouse.com',
            name: 'Maria Giuseppe',
            restaurantName: 'Italian House',
            role: 'user',
            subscriptionStatus: 'active',
            trialEndDate: '2024-01-10',
            createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            email: 'owner@spicekitchen.com', 
            name: 'Raj Patel',
            restaurantName: 'Spice Kitchen',
            role: 'user',
            subscriptionStatus: 'trialing',
            trialEndDate: '2024-01-20',
            createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
          }
        ])

        setRecentActivity([
          {
            id: '1',
            type: 'user_registration',
            description: 'New user registered: demo@restaurant.com',
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            userId: '1'
          },
          {
            id: '2',
            type: 'subscription_upgrade',
            description: 'User upgraded to Pro plan: chef@italianhouse.com',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            userId: '2'
          },
          {
            id: '3',
            type: 'voice_session',
            description: 'Voice processing session completed for The Grand Bistro',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            userId: '1'
          }
        ])

      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
    loadDashboardData()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return `${Math.floor(diffInMinutes / 1440)} days ago`
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return '👤'
      case 'subscription_upgrade': return '⬆️'
      case 'voice_session': return '🎤'
      default: return '📝'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Dashboard...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift">
      {/* Header */}
      <header className="backdrop-blur-lg bg-white/10 border-b border-white/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-3 text-xl font-bold text-white">
            <span className="text-3xl">🍽️</span>
            ChefSocial Voice Admin
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/users"
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              Manage Users
            </Link>
            <span className="text-white/80">Admin: {user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Dashboard Header */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-white/80">Real-time insights and user management for ChefSocial Voice</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">👥</div>
              <div className="text-green-300 text-sm">+{stats.newUsersThisMonth} this month</div>
            </div>
            <h3 className="text-3xl font-bold text-white">{stats.totalUsers}</h3>
            <p className="text-white/80">Total Users</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">🆓</div>
              <div className="text-blue-300 text-sm">+{stats.newUsersThisWeek} this week</div>
            </div>
            <h3 className="text-3xl font-bold text-white">{stats.activeTrials}</h3>
            <p className="text-white/80">Active Trials</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">💳</div>
              <div className="text-purple-300 text-sm">{stats.trialConversionRate}% conversion</div>
            </div>
            <h3 className="text-3xl font-bold text-white">{stats.paidSubscriptions}</h3>
            <p className="text-white/80">Paid Subscriptions</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">💰</div>
              <div className="text-yellow-300 text-sm">+{stats.newUsersToday} today</div>
            </div>
            <h3 className="text-3xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</h3>
            <p className="text-white/80">Monthly Revenue</p>
          </div>
        </div>

        {/* Recent Users & Activity */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Users */}
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Users</h2>
              <Link 
                href="/admin/users"
                className="text-white/80 hover:text-white transition-colors text-sm"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {recentUsers.map((recentUser) => (
                <div key={recentUser.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{recentUser.name}</p>
                      <p className="text-white/60 text-sm">{recentUser.restaurantName}</p>
                      <p className="text-white/60 text-xs">{recentUser.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        recentUser.subscriptionStatus === 'active' 
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {recentUser.subscriptionStatus}
                      </span>
                      <p className="text-white/60 text-xs mt-1">
                        {formatTimeAgo(recentUser.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-white/90">{activity.description}</p>
                      <p className="text-white/60 text-sm">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/users" className="block backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-white mb-2">User Management</h3>
            <p className="text-white/80">View, edit, and manage user accounts and subscriptions</p>
          </Link>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer opacity-60">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
            <p className="text-white/80">Detailed usage analytics and performance metrics</p>
            <p className="text-white/60 text-sm mt-2">Coming Soon</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer opacity-60">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-bold text-white mb-2">Voice Sessions</h3>
            <p className="text-white/80">Monitor voice processing sessions and API usage</p>
            <p className="text-white/60 text-sm mt-2">Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  )
} 