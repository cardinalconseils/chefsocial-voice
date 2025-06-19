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
}

interface AdminStats {
  totalUsers: number
  activeTrials: number
  paidSubscriptions: number
  totalRevenue: number
}

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeTrials: 0,
    paidSubscriptions: 0,
    totalRevenue: 0
  })
  const router = useRouter()

  useEffect(() => {
    // Check authentication and admin role
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
      
      // Load admin stats (mock data for now)
      setStats({
        totalUsers: 127,
        activeTrials: 45,
        paidSubscriptions: 82,
        totalRevenue: 12450
      })
    } catch (error) {
      router.push('/auth/login')
      return
    }

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
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
          <Link href="/" className="flex items-center gap-3 text-xl font-bold text-white">
            <span className="text-3xl">🍽️</span>
            ChefSocial Voice Admin
          </Link>
          
          <div className="flex items-center gap-4">
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
          <p className="text-white/80">Monitor and manage ChefSocial Voice platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3>
            <p className="text-white/80">Total Users</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">🆓</div>
            <h3 className="text-2xl font-bold text-white">{stats.activeTrials}</h3>
            <p className="text-white/80">Active Trials</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-2xl font-bold text-white">{stats.paidSubscriptions}</h3>
            <p className="text-white/80">Paid Subscriptions</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</h3>
            <p className="text-white/80">Total Revenue</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-bold text-white mb-2">User Management</h3>
            <p className="text-white/80">View and manage user accounts, subscriptions, and permissions</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
            <p className="text-white/80">View detailed usage analytics, conversion rates, and performance metrics</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-xl font-bold text-white mb-2">Billing</h3>
            <p className="text-white/80">Manage subscriptions, payments, and billing configurations</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-bold text-white mb-2">Voice Sessions</h3>
            <p className="text-white/80">Monitor voice processing sessions and API usage</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-bold text-white mb-2">System Settings</h3>
            <p className="text-white/80">Configure platform settings, API keys, and integrations</p>
          </div>

          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-white mb-2">Content Review</h3>
            <p className="text-white/80">Review generated content and manage content moderation</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/90">New user registration</p>
                  <p className="text-white/60 text-sm">demo@restaurant.com started free trial</p>
                </div>
                <span className="text-white/60 text-sm">2 minutes ago</span>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/90">Subscription upgrade</p>
                  <p className="text-white/60 text-sm">user@example.com upgraded to Pro plan</p>
                </div>
                <span className="text-white/60 text-sm">15 minutes ago</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/90">Voice session completed</p>
                  <p className="text-white/60 text-sm">Generated content for "Truffle Pasta Special"</p>
                </div>
                <span className="text-white/60 text-sm">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 