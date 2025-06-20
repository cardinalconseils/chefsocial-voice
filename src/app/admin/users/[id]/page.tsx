'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  restaurantName: string
  cuisineType?: string
  location?: string
  phone?: string
  website?: string
  description?: string
  role: string
  subscriptionStatus: string
  subscriptionPlan?: string
  trialStartDate?: string
  trialEndDate?: string
  subscriptionStartDate?: string
  lastPaymentDate?: string
  nextPaymentDate?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  emailVerified: boolean
  profileCompleted: boolean
}

interface ActivityLog {
  id: string
  action: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

interface EditableUser {
  name: string
  restaurantName: string
  cuisineType?: string
  location?: string
  phone?: string
  website?: string
  description?: string
  role: string
  subscriptionStatus: string
  emailVerified: boolean
}

export default function UserDetail() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<EditableUser>({} as EditableUser)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'activity' | 'security'>('profile')
  
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

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
      } catch (error) {
        router.push('/auth/login')
        return
      }
    }

    const loadUserData = async () => {
      try {
        setLoading(true)
        
        // For now, using mock data until backend is fully ready
        // TODO: Replace with actual API calls once backend is ready
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Mock user data based on ID
        const mockUser: User = {
          id: userId,
          email: userId === '1' ? 'demo@restaurant.com' : 'chef@italianhouse.com',
          name: userId === '1' ? 'Demo Restaurant' : 'Maria Giuseppe',
          restaurantName: userId === '1' ? 'The Grand Bistro' : 'Italian House',
          cuisineType: userId === '1' ? 'French' : 'Italian',
          location: userId === '1' ? 'New York, NY' : 'San Francisco, CA',
          phone: userId === '1' ? '+1 (555) 123-4567' : '+1 (555) 987-6543',
          website: userId === '1' ? 'https://grandbistro.com' : 'https://italianhouse.com',
          description: userId === '1' ? 'Fine French dining in the heart of Manhattan' : 'Authentic Italian cuisine with family recipes',
          role: 'user',
          subscriptionStatus: userId === '1' ? 'trialing' : 'active',
          subscriptionPlan: userId === '1' ? 'Pro Trial' : 'Pro Monthly',
          trialStartDate: userId === '1' ? '2024-01-08T10:30:00Z' : undefined,
          trialEndDate: userId === '1' ? '2024-01-15T10:30:00Z' : undefined,
          subscriptionStartDate: userId === '1' ? undefined : '2024-01-10T14:20:00Z',
          lastPaymentDate: userId === '1' ? undefined : '2024-01-10T14:20:00Z',
          nextPaymentDate: userId === '1' ? undefined : '2024-02-10T14:20:00Z',
          createdAt: userId === '1' ? '2024-01-08T10:30:00Z' : '2024-01-07T14:20:00Z',
          updatedAt: userId === '1' ? '2024-01-08T15:45:00Z' : '2024-01-08T12:30:00Z',
          lastLoginAt: userId === '1' ? '2024-01-08T15:45:00Z' : '2024-01-08T12:30:00Z',
          emailVerified: userId === '1' ? true : true,
          profileCompleted: userId === '1' ? true : true
        }
        
        setUser(mockUser)
        setEditForm({
          name: mockUser.name,
          restaurantName: mockUser.restaurantName,
          cuisineType: mockUser.cuisineType,
          location: mockUser.location,
          phone: mockUser.phone,
          website: mockUser.website,
          description: mockUser.description,
          role: mockUser.role,
          subscriptionStatus: mockUser.subscriptionStatus,
          emailVerified: mockUser.emailVerified
        })

        // Mock activity logs
        setActivityLogs([
          {
            id: '1',
            action: 'login',
            description: 'User logged in from Chrome on macOS',
            timestamp: '2024-01-08T15:45:00Z',
            metadata: { ip: '192.168.1.100', userAgent: 'Chrome/120.0.0.0' }
          },
          {
            id: '2',
            action: 'voice_session',
            description: 'Completed voice processing session (3 minutes)',
            timestamp: '2024-01-08T15:30:00Z',
            metadata: { duration: 180, tokensUsed: 1250 }
          },
          {
            id: '3',
            action: 'profile_update',
            description: 'Updated restaurant description',
            timestamp: '2024-01-08T14:15:00Z'
          },
          {
            id: '4',
            action: 'trial_start',
            description: 'Started Pro trial subscription',
            timestamp: '2024-01-08T10:30:00Z'
          },
          {
            id: '5',
            action: 'registration',
            description: 'Account created and email verified',
            timestamp: '2024-01-08T10:30:00Z'
          }
        ])
        
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
    loadUserData()
  }, [userId, router])

  const handleSave = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update local state for now
      setUser(prev => prev ? { ...prev, ...editForm, updatedAt: new Date().toISOString() } : null)
      setEditing(false)
      
      console.log('User updated:', editForm)
      
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setEditForm({
        name: user.name,
        restaurantName: user.restaurantName,
        cuisineType: user.cuisineType,
        location: user.location,
        phone: user.phone,
        website: user.website,
        description: user.description,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        emailVerified: user.emailVerified
      })
    }
    setEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'trialing': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'canceled': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'past_due': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'login': return '🔐'
      case 'logout': return '🚪'
      case 'voice_session': return '🎤'
      case 'profile_update': return '✏️'
      case 'subscription_upgrade': return '⬆️'
      case 'subscription_downgrade': return '⬇️'
      case 'trial_start': return '🆓'
      case 'payment': return '💳'
      case 'registration': return '📝'
      default: return '📋'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading User Details...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
          <div className="text-white text-xl mb-4">User not found</div>
          <Link 
            href="/admin/users"
            className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
          >
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift">
      {/* Header */}
      <header className="backdrop-blur-lg bg-white/10 border-b border-white/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-3 text-xl font-bold text-white">
              <span className="text-3xl">🍽️</span>
              ChefSocial Voice Admin
            </Link>
            <span className="text-white/60">/</span>
            <Link href="/admin/users" className="text-white/80 hover:text-white">Users</Link>
            <span className="text-white/60">/</span>
            <span className="text-white">{user.name}</span>
          </div>
          
          <div className="flex gap-2">
            <Link 
              href="/admin/users"
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              Back to Users
            </Link>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
              >
                Edit User
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* User Header */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
                <p className="text-white/80 text-lg mb-1">{user.restaurantName}</p>
                <p className="text-white/60">{user.email}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm border ${getStatusColor(user.subscriptionStatus)}`}>
                    {user.subscriptionStatus}
                  </span>
                  {user.role === 'admin' && (
                    <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full text-sm">
                      Admin
                    </span>
                  )}
                  {user.emailVerified ? (
                    <span className="text-green-300 text-sm">✓ Verified</span>
                  ) : (
                    <span className="text-red-300 text-sm">✗ Unverified</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right text-white/80">
              <div className="text-sm">Member since</div>
              <div className="font-medium">{formatDate(user.createdAt)}</div>
              {user.lastLoginAt && (
                <>
                  <div className="text-sm mt-2">Last login</div>
                  <div className="font-medium">{formatDate(user.lastLoginAt)}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Mode Actions */}
        {editing && (
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-4 border border-white/20 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-white">Editing User Profile</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl border border-white/20 overflow-hidden mb-6">
          <div className="flex border-b border-white/20">
            {[
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'subscription', label: 'Subscription', icon: '💳' },
              { id: 'activity', label: 'Activity', icon: '📊' },
              { id: 'security', label: 'Security', icon: '🔒' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white border-b-2 border-white'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      />
                    ) : (
                      <div className="text-white font-medium">{user.name}</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Restaurant Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.restaurantName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, restaurantName: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      />
                    ) : (
                      <div className="text-white font-medium">{user.restaurantName}</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Email</label>
                    <div className="text-white font-medium">{user.email}</div>
                    <div className="text-white/60 text-sm">Email cannot be changed</div>
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Phone</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      />
                    ) : (
                      <div className="text-white font-medium">{user.phone || 'Not provided'}</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Cuisine Type</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.cuisineType || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cuisineType: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      />
                    ) : (
                      <div className="text-white font-medium">{user.cuisineType || 'Not specified'}</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Location</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.location || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      />
                    ) : (
                      <div className="text-white font-medium">{user.location || 'Not provided'}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Website</label>
                  {editing ? (
                    <input
                      type="url"
                      value={editForm.website || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                    />
                  ) : (
                    <div className="text-white font-medium">
                      {user.website ? (
                        <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">
                          {user.website}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Description</label>
                  {editing ? (
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                    />
                  ) : (
                    <div className="text-white font-medium">{user.description || 'No description provided'}</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Status</label>
                    {editing ? (
                      <select
                        value={editForm.subscriptionStatus}
                        onChange={(e) => setEditForm(prev => ({ ...prev, subscriptionStatus: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      >
                        <option value="trialing">Trialing</option>
                        <option value="active">Active</option>
                        <option value="canceled">Canceled</option>
                        <option value="past_due">Past Due</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-3 py-1 rounded-full text-sm border ${getStatusColor(user.subscriptionStatus)}`}>
                        {user.subscriptionStatus}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Plan</label>
                    <div className="text-white font-medium">{user.subscriptionPlan || 'No plan'}</div>
                  </div>
                </div>

                {user.subscriptionStatus === 'trialing' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h3 className="text-blue-300 font-medium mb-2">Trial Information</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-white/80">
                      <div>
                        <div className="text-sm">Trial Started</div>
                        <div className="font-medium">{user.trialStartDate ? formatDate(user.trialStartDate) : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm">Trial Ends</div>
                        <div className="font-medium">{user.trialEndDate ? formatDate(user.trialEndDate) : 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {user.subscriptionStatus === 'active' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <h3 className="text-green-300 font-medium mb-2">Subscription Information</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-white/80">
                      <div>
                        <div className="text-sm">Subscription Started</div>
                        <div className="font-medium">{user.subscriptionStartDate ? formatDate(user.subscriptionStartDate) : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm">Next Payment</div>
                        <div className="font-medium">{user.nextPaymentDate ? formatDate(user.nextPaymentDate) : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm">Last Payment</div>
                        <div className="font-medium">{user.lastPaymentDate ? formatDate(user.lastPaymentDate) : 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-white font-medium text-lg">Recent Activity</h3>
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getActivityIcon(log.action)}</div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{log.description}</div>
                          <div className="text-white/60 text-sm">{formatDate(log.timestamp)}</div>
                          {log.metadata && (
                            <div className="mt-2 text-white/60 text-xs">
                              {Object.entries(log.metadata).map(([key, value]) => (
                                <span key={key} className="mr-4">
                                  {key}: {JSON.stringify(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Role</label>
                    {editing ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <div className="text-white font-medium">{user.role}</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Email Verified</label>
                    {editing ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editForm.emailVerified}
                          onChange={(e) => setEditForm(prev => ({ ...prev, emailVerified: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-white">Verified</span>
                      </label>
                    ) : (
                      <div className="text-white font-medium">
                        {user.emailVerified ? '✓ Verified' : '✗ Unverified'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h3 className="text-yellow-300 font-medium mb-2">Admin Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-white transition-colors">
                      🔄 Reset Password
                    </button>
                    <button className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-white transition-colors">
                      📧 Resend Verification Email
                    </button>
                    <button className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-white transition-colors">
                      🚫 Suspend Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 