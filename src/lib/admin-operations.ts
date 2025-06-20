import { db } from './database-postgres';
import { User, SubscriptionStatus, UserRole } from '../types/auth';
import { Pool } from 'pg';

// Get database client pool for direct queries
let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('PostgreSQL connection string not found');
  }
  
  pool = new Pool({ connectionString });
  return pool;
}

// Admin-specific types
export interface AdminStats {
  totalUsers: number;
  activeTrials: number;
  paidSubscriptions: number;
  totalRevenue: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  trialConversionRate: number;
}

export interface UserSearchFilters {
  email?: string;
  restaurantName?: string;
  subscriptionStatus?: SubscriptionStatus;
  role?: UserRole;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'email' | 'restaurantName' | 'subscriptionStatus';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: User[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Admin Operations Class
export class AdminOperations {
  
  // ===== USER MANAGEMENT =====
  
  /**
   * Get paginated list of users with search and filters
   */
  static async getUserList(
    pagination: PaginationOptions,
    filters: UserSearchFilters = {}
  ): Promise<UserListResponse> {
    try {
      const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      // Build WHERE clause based on filters
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.email) {
        whereConditions.push(`email ILIKE $${paramIndex}`);
        queryParams.push(`%${filters.email}%`);
        paramIndex++;
      }

      if (filters.restaurantName) {
        whereConditions.push(`restaurant_name ILIKE $${paramIndex}`);
        queryParams.push(`%${filters.restaurantName}%`);
        paramIndex++;
      }

      if (filters.subscriptionStatus) {
        whereConditions.push(`subscription_status = $${paramIndex}`);
        queryParams.push(filters.subscriptionStatus);
        paramIndex++;
      }

      if (filters.role) {
        whereConditions.push(`role = $${paramIndex}`);
        queryParams.push(filters.role);
        paramIndex++;
      }

      if (filters.dateFrom) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        queryParams.push(new Date(filters.dateFrom));
        paramIndex++;
      }

      if (filters.dateTo) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        queryParams.push(new Date(filters.dateTo));
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Convert camelCase to snake_case for database columns
      const dbSortBy = sortBy === 'createdAt' ? 'created_at' 
                     : sortBy === 'restaurantName' ? 'restaurant_name'
                     : sortBy === 'subscriptionStatus' ? 'subscription_status'
                     : sortBy;

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const countResult = await getPool().query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated users
      const usersQuery = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const usersResult = await getPool().query(usersQuery, queryParams);
      const users = usersResult.rows.map((row: any) => db.mapRowToUser(row));

      const totalPages = Math.ceil(total / limit);

      return {
        users,
        total,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      console.error('Error getting user list:', error);
      throw new Error('Failed to retrieve user list');
    }
  }

  /**
   * Get user by ID with additional admin details
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      return await db.getUserById(userId);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Update user information (admin only)
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      // Sanitize updates - remove sensitive fields that shouldn't be updated via admin
      const safeUpdates = { ...updates };
      delete safeUpdates.passwordHash;
      delete safeUpdates.id;
      delete safeUpdates.createdAt;

      return await db.updateUser(userId, safeUpdates);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update subscription status
   */
  static async updateSubscriptionStatus(
    userId: string, 
    status: SubscriptionStatus
  ): Promise<User | null> {
    try {
      return await db.updateUser(userId, { subscriptionStatus: status });
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw new Error('Failed to update subscription status');
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      return await db.deleteUser(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // ===== ANALYTICS & STATISTICS =====

  /**
   * Get comprehensive admin statistics
   */
  static async getAdminStats(): Promise<AdminStats> {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Execute multiple queries in parallel
      const pool = getPool();
      const [
        totalUsersResult,
        activeTrialsResult,
        paidSubscriptionsResult,
        newUsersTodayResult,
        newUsersWeekResult,
        newUsersMonthResult,
        trialUsersResult,
        convertedUsersResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'trialing'"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active'"),
        pool.query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1', [todayStart]),
        pool.query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1', [weekAgo]),
        pool.query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1', [monthAgo]),
        pool.query("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'trialing' AND trial_start_date IS NOT NULL"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active' AND trial_start_date IS NOT NULL")
      ]);

      const totalUsers = parseInt(totalUsersResult.rows[0].count);
      const activeTrials = parseInt(activeTrialsResult.rows[0].count);
      const paidSubscriptions = parseInt(paidSubscriptionsResult.rows[0].count);
      const newUsersToday = parseInt(newUsersTodayResult.rows[0].count);
      const newUsersThisWeek = parseInt(newUsersWeekResult.rows[0].count);
      const newUsersThisMonth = parseInt(newUsersMonthResult.rows[0].count);
      const trialUsers = parseInt(trialUsersResult.rows[0].count);
      const convertedUsers = parseInt(convertedUsersResult.rows[0].count);

      // Calculate conversion rate
      const trialConversionRate = trialUsers > 0 ? (convertedUsers / trialUsers) * 100 : 0;

      // Calculate estimated revenue (basic calculation - can be enhanced with actual billing data)
      const monthlyPrice = 29; // Assuming $29/month subscription
      const totalRevenue = paidSubscriptions * monthlyPrice;

      return {
        totalUsers,
        activeTrials,
        paidSubscriptions,
        totalRevenue,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        trialConversionRate: Math.round(trialConversionRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw new Error('Failed to retrieve admin statistics');
    }
  }

  /**
   * Get user growth data for charts
   */
  static async getUserGrowthData(days: number = 30): Promise<Array<{date: string, users: number}>> {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as users
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      const result = await getPool().query(query);
      return result.rows.map(row => ({
        date: row.date,
        users: parseInt(row.users)
      }));
    } catch (error) {
      console.error('Error getting user growth data:', error);
      throw new Error('Failed to retrieve user growth data');
    }
  }

  /**
   * Get subscription status distribution
   */
  static async getSubscriptionDistribution(): Promise<Array<{status: string, count: number}>> {
    try {
      const query = `
        SELECT 
          subscription_status as status,
          COUNT(*) as count
        FROM users 
        GROUP BY subscription_status
        ORDER BY count DESC
      `;

      const result = await getPool().query(query);
      return result.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error('Error getting subscription distribution:', error);
      throw new Error('Failed to retrieve subscription distribution');
    }
  }

  // ===== UTILITY FUNCTIONS =====

  /**
   * Verify admin permissions
   */
  static async verifyAdminUser(userId: string): Promise<boolean> {
    try {
      const user = await db.getUserById(userId);
      return user?.role === 'admin';
    } catch (error) {
      console.error('Error verifying admin user:', error);
      return false;
    }
  }

  /**
   * Search users by email or restaurant name
   */
  static async searchUsers(searchTerm: string, limit: number = 10): Promise<User[]> {
    try {
      const query = `
        SELECT * FROM users 
        WHERE email ILIKE $1 OR restaurant_name ILIKE $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await getPool().query(query, [`%${searchTerm}%`, limit]);
      return result.rows.map(row => db.mapRowToUser(row));
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }
} 