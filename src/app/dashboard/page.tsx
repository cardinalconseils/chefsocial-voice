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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/auth/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
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

  const daysLeft = user.trialEndDate ? Math.ceil((new Date(user.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift">
      {/* Header */}
      <header className="backdrop-blur-lg bg-white/10 border-b border-white/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 text-xl font-bold text-white">
            <span className="text-3xl">🍽️</span>
            ChefSocial Voice
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-white/80">Welcome, {user.name}</span>
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
        {/* Trial Status */}
        {user.subscriptionStatus === 'trialing' && (
          <div className="backdrop-blur-lg bg-orange-500/20 border border-orange-500/30 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Free Trial Active</h2>
            <p className="text-white/90">
              You have <strong>{daysLeft} days</strong> left in your free trial. 
              <Link href="/pricing" className="text-orange-300 hover:text-orange-200 ml-2 underline">
                Upgrade now to continue using all features.
              </Link>
            </p>
          </div>
        )}

        {/* Restaurant Info */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Restaurant Information</h3>
              <p className="text-white/80"><strong>Name:</strong> {user.restaurantName}</p>
              <p className="text-white/80"><strong>Owner:</strong> {user.name}</p>
              <p className="text-white/80"><strong>Email:</strong> {user.email}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Account Status</h3>
              <p className="text-white/80"><strong>Subscription:</strong> {user.subscriptionStatus}</p>
              <p className="text-white/80"><strong>Role:</strong> {user.role}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/apps/conversation" className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-bold text-white mb-2">Voice to Content</h3>
            <p className="text-white/80">Create social media content from your voice descriptions</p>
          </Link>

          <Link href="/apps/natural" className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-2">Natural Chat</h3>
            <p className="text-white/80">Have natural conversations about your restaurant</p>
          </Link>

          <Link href="/apps/livekit-voice" className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">LiveKit Voice</h3>
            <p className="text-white/80">Advanced voice processing with real-time features</p>
          </Link>

          <Link href="/dashboard/analytics" className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
            <p className="text-white/80">View your content performance and engagement metrics</p>
          </Link>

          <Link href="/dashboard/content" className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-white mb-2">Content Library</h3>
            <p className="text-white/80">Manage and organize your generated content</p>
          </Link>

          <Link href="/dashboard/profile" className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-bold text-white mb-2">Settings</h3>
            <p className="text-white/80">Manage your account and restaurant preferences</p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/80">Welcome to ChefSocial Voice! Start by exploring our voice-to-content features.</p>
              <p className="text-white/60 text-sm mt-2">Just now</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 