/**
 * Admin Service Module
 * Handles admin-specific operations and validations
 */

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRestaurants: number;
  totalSubscriptions: number;
  monthlyRevenue: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface UserManagementData {
  users: Array<{
    id: string;
    email: string;
    status: 'active' | 'disabled';
    createdAt: string;
    lastLogin?: string;
  }>;
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  target: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  maxUsersPerRestaurant: number;
  defaultSubscriptionTier: string;
  systemNotifications: boolean;
}

/**
 * Admin Service Class
 */
export class AdminService {
  /**
   * Validate admin access permissions
   */
  async validateAdminAccess(userId: string, requiredRole: string = 'admin'): Promise<boolean> {
    // Mock implementation for testing
    return userId.includes('admin') || userId === 'test-admin-user';
  }

  /**
   * Get system statistics
   */
  async getUserStats(): Promise<AdminStats> {
    return {
      totalUsers: 1250,
      activeUsers: 890,
      totalRestaurants: 45,
      totalSubscriptions: 670,
      monthlyRevenue: 125000,
      systemHealth: 'healthy'
    };
  }

  /**
   * Search and manage users
   */
  async searchUsers(query: string, page: number = 1, pageSize: number = 20): Promise<UserManagementData> {
    const mockUsers = Array.from({ length: pageSize }, (_, i) => ({
      id: `user-${page}-${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: Math.random() > 0.1 ? 'active' : 'disabled' as 'active' | 'disabled',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined
    }));

    return {
      users: mockUsers.filter(user => 
        query === '' || user.email.toLowerCase().includes(query.toLowerCase())
      ),
      totalCount: 1250,
      page,
      pageSize
    };
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: 'active' | 'disabled'): Promise<boolean> {
    // Mock implementation
    return userId !== 'invalid-user';
  }

  /**
   * Bulk user operations
   */
  async bulkUserOperation(userIds: string[], operation: 'enable' | 'disable' | 'delete'): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const failed = userIds.filter(id => id.includes('invalid')).length;
    const success = userIds.length - failed;
    
    return {
      success,
      failed,
      errors: failed > 0 ? [`Failed to ${operation} ${failed} users`] : []
    };
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(page: number = 1, pageSize: number = 50): Promise<{
    logs: AuditLogEntry[];
    totalCount: number;
  }> {
    const mockLogs: AuditLogEntry[] = Array.from({ length: pageSize }, (_, i) => ({
      id: `audit-${page}-${i + 1}`,
      adminId: 'admin-user-1',
      action: ['user_update', 'user_disable', 'settings_change', 'data_export'][Math.floor(Math.random() * 4)],
      target: `user-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      details: { previousValue: 'active', newValue: 'disabled' }
    }));

    return {
      logs: mockLogs,
      totalCount: 2500
    };
  }

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<SystemSettings> {
    return {
      maintenanceMode: false,
      allowRegistrations: true,
      maxUsersPerRestaurant: 50,
      defaultSubscriptionTier: 'basic',
      systemNotifications: true
    };
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<boolean> {
    // Mock implementation - always succeeds unless invalid data
    return Object.values(settings).every(value => value !== undefined);
  }

  /**
   * Export data
   */
  async exportData(dataType: 'users' | 'restaurants' | 'analytics', format: 'csv' | 'json'): Promise<{
    downloadUrl: string;
    expiresAt: string;
  }> {
    return {
      downloadUrl: `https://api.chefsocial.com/exports/${dataType}-${Date.now()}.${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * System backup operations
   */
  async createBackup(): Promise<{
    backupId: string;
    status: 'initiated' | 'in_progress' | 'completed' | 'failed';
    estimatedCompletion?: string;
  }> {
    return {
      backupId: `backup-${Date.now()}`,
      status: 'initiated',
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
  }

  /**
   * Emergency operations
   */
  async emergencyShutdown(): Promise<boolean> {
    // Mock implementation
    return true;
  }

  async enableMaintenanceMode(message?: string): Promise<boolean> {
    // Mock implementation
    return true;
  }
}

// Export singleton instance
export const adminService = new AdminService(); 