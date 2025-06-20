'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  restaurantName: string
  cuisineType?: string
  location?: string
  phone?: string
  role: string
  subscriptionStatus: string
  trialEndDate?: string
  createdAt: string
  lastLoginAt?: string
}

interface UserFilters {
  search: string
  subscriptionStatus: string
  role: string
  dateFrom: string
  dateTo: string
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    subscriptionStatus: '',
    role: '',
    dateFrom: '',
    dateTo: ''
  })
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const router = useRouter()
  const usersPerPage = 20

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

    const loadUsers = async () => {
      try {
        setLoading(true)
        
        // For now, using mock data until backend is fully ready
        // TODO: Replace with actual API calls once backend is ready
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Mock data for demonstration
        const mockUsers: User[] = [
          {
            id: '1',
            email: 'demo@restaurant.com',
            name: 'Demo Restaurant',
            restaurantName: 'The Grand Bistro',
            cuisineType: 'French',
            location: 'New York, NY',
            phone: '+1 (555) 123-4567',
            role: 'user',
            subscriptionStatus: 'trialing',
            trialEndDate: '2024-01-15',
            createdAt: '2024-01-08T10:30:00Z',
            lastLoginAt: '2024-01-08T15:45:00Z'
          },
          {
            id: '2',
            email: 'chef@italianhouse.com',
            name: 'Maria Giuseppe',
            restaurantName: 'Italian House',
            cuisineType: 'Italian',
            location: 'San Francisco, CA',
            phone: '+1 (555) 987-6543',
            role: 'user',
            subscriptionStatus: 'active',
            trialEndDate: '2024-01-10',
            createdAt: '2024-01-07T14:20:00Z',
            lastLoginAt: '2024-01-08T12:30:00Z'
          },
          {
            id: '3',
            email: 'owner@spicekitchen.com',
            name: 'Raj Patel',
            restaurantName: 'Spice Kitchen',
            cuisineType: 'Indian',
            location: 'Austin, TX',
            phone: '+1 (555) 456-7890',
            role: 'user',
            subscriptionStatus: 'trialing',
            trialEndDate: '2024-01-20',
            createdAt: '2024-01-06T09:15:00Z',
            lastLoginAt: '2024-01-07T18:22:00Z'
          },
          {
            id: '4',
            email: 'contact@mexicocafe.com',
            name: 'Carlos Rodriguez',
            restaurantName: 'Mexico Cafe',
            cuisineType: 'Mexican',
            location: 'Los Angeles, CA',
            phone: '+1 (555) 321-9876',
            role: 'user',
            subscriptionStatus: 'canceled',
            createdAt: '2024-01-05T16:45:00Z',
            lastLoginAt: '2024-01-06T10:15:00Z'
          },
          {
            id: '5',
            email: 'admin@chefsocial.com',
            name: 'System Administrator',
            restaurantName: 'ChefSocial Voice',
            role: 'admin',
            subscriptionStatus: 'active',
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-01-08T16:00:00Z'
          }
        ]
        
        // Apply filters to mock data
        let filteredUsers = mockUsers.filter(user => {
          if (filters.search && !user.email.toLowerCase().includes(filters.search.toLowerCase()) && 
              !user.name.toLowerCase().includes(filters.search.toLowerCase()) &&
              !user.restaurantName.toLowerCase().includes(filters.search.toLowerCase())) {
            return false
          }
          if (filters.subscriptionStatus && user.subscriptionStatus !== filters.subscriptionStatus) {
            return false
          }
          if (filters.role && user.role !== filters.role) {
            return false
          }
          return true
        })
        
        // Apply sorting
        filteredUsers.sort((a, b) => {
          let aValue: any = a[sortBy as keyof User] || ''
          let bValue: any = b[sortBy as keyof User] || ''
          
          if (sortBy === 'createdAt' || sortBy === 'lastLoginAt') {
            aValue = new Date(aValue as string).getTime()
            bValue = new Date(bValue as string).getTime()
          }
          
          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1
          } else {
            return aValue < bValue ? 1 : -1
          }
        })
        
        setUsers(filteredUsers)
        setTotalUsers(filteredUsers.length)
        setTotalPages(Math.ceil(filteredUsers.length / usersPerPage))
        
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
    loadUsers()
  }, [currentPage, filters, sortBy, sortOrder, router])

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === users.length ? [] : users.map(user => user.id)
    )
  }

  const handleUpdateSubscription = async (userId: string, status: string) => {
    try {
      setActionLoading(userId)
      
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update local state for now
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, subscriptionStatus: status } : user
      ))
      
      console.log(`Updated user ${userId} subscription to ${status}`)
      
    } catch (error) {
      console.error('Error updating subscription:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%] animate-gradient-shift flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Users...</div>
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
            <span className="text-white">Users</span>
          </div>
          
          <Link 
            href="/admin/dashboard"
            className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
              <p className="text-white/80">Manage user accounts, subscriptions, and permissions</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{totalUsers}</div>
              <div className="text-white/80 text-sm">Total Users</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by email, name, or restaurant..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/40"
              />
            </div>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.subscriptionStatus}
                onChange={(e) => handleFilterChange('subscriptionStatus', e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
              >
                <option value="">All Subscriptions</option>
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="canceled">Canceled</option>
                <option value="past_due">Past Due</option>
              </select>
              
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                {showFilters ? 'Hide' : 'More'} Filters
              </button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-2">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-4 border border-white/20 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-white">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors">
                  Export Selected
                </button>
                <button className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors">
                  Bulk Action
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/20">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th 
                    className="p-4 text-left text-white font-medium cursor-pointer hover:bg-white/5"
                    onClick={() => handleSort('email')}
                  >
                    Email {getSortIcon('email')}
                  </th>
                  <th 
                    className="p-4 text-left text-white font-medium cursor-pointer hover:bg-white/5"
                    onClick={() => handleSort('name')}
                  >
                    Name {getSortIcon('name')}
                  </th>
                  <th 
                    className="p-4 text-left text-white font-medium cursor-pointer hover:bg-white/5"
                    onClick={() => handleSort('restaurantName')}
                  >
                    Restaurant {getSortIcon('restaurantName')}
                  </th>
                  <th 
                    className="p-4 text-left text-white font-medium cursor-pointer hover:bg-white/5"
                    onClick={() => handleSort('subscriptionStatus')}
                  >
                    Status {getSortIcon('subscriptionStatus')}
                  </th>
                  <th 
                    className="p-4 text-left text-white font-medium cursor-pointer hover:bg-white/5"
                    onClick={() => handleSort('createdAt')}
                  >
                    Joined {getSortIcon('createdAt')}
                  </th>
                  <th className="p-4 text-left text-white font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-4">
                      <div className="text-white">{user.email}</div>
                      {user.phone && <div className="text-white/60 text-sm">{user.phone}</div>}
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{user.name}</div>
                      {user.role === 'admin' && (
                        <div className="text-yellow-300 text-xs">ADMIN</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-white">{user.restaurantName}</div>
                      {user.cuisineType && (
                        <div className="text-white/60 text-sm">{user.cuisineType}</div>
                      )}
                      {user.location && (
                        <div className="text-white/60 text-sm">{user.location}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs border ${getStatusColor(user.subscriptionStatus)}`}>
                        {user.subscriptionStatus}
                      </span>
                      {user.trialEndDate && user.subscriptionStatus === 'trialing' && (
                        <div className="text-white/60 text-xs mt-1">
                          Ends: {formatDate(user.trialEndDate)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-white/80 text-sm">{formatDate(user.createdAt)}</div>
                      {user.lastLoginAt && (
                        <div className="text-white/60 text-xs">
                          Last: {formatDate(user.lastLoginAt)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors text-sm"
                        >
                          View
                        </Link>
                        {user.role !== 'admin' && (
                          <select
                            value={user.subscriptionStatus}
                            onChange={(e) => handleUpdateSubscription(user.id, e.target.value)}
                            disabled={actionLoading === user.id}
                            className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-white/40"
                          >
                            <option value="trialing">Trialing</option>
                            <option value="active">Active</option>
                            <option value="canceled">Canceled</option>
                            <option value="past_due">Past Due</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/20 flex justify-between items-center">
              <div className="text-white/80">
                Showing {users.length} of {totalUsers} users
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 