// Admin Types
export interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  admin: Admin;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  restaurant_name: string;
  cuisine_type?: string;
  status: 'active' | 'suspended' | 'canceled';
  role: 'user' | 'admin';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
  trial_end_date?: string;
  created_at: string;
  last_login_at?: string;
}

export interface UsersResponse {
  success: boolean;
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Analytics Types
export interface Analytics {
  totalUsers: number;
  activeSubscriptions: number;
  newUsers: number;
  contentGenerated: number;
  revenue: {
    activeSubscriptions: number;
    monthlyRecurringRevenue: number;
  };
  period: string;
}

export interface AnalyticsResponse {
  success: boolean;
  analytics: Analytics;
}

// Usage Report Types
export interface UserUsage {
  user_id: string;
  total_content: number;
  instagram_posts: number;
  tiktok_posts: number;
  facebook_posts: number;
  avg_viral_score: number;
  first_use: string;
  last_use: string;
  user: {
    email: string;
    name: string;
    restaurant_name: string;
    subscription_status: string;
  } | null;
}

export interface UsageReportsResponse {
  success: boolean;
  usage: UserUsage[];
  period: string;
  summary: {
    totalUsers: number;
    totalContent: number;
    avgViralScore: string;
  };
}

// Audit Log Types
export interface AuditLog {
  id: number;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
}

export interface AuditLogsResponse {
  success: boolean;
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
  };
}

// API Error Types
export interface APIError {
  error: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Component Props Types
export interface DashboardStats {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface FilterOptions {
  search?: string;
  status?: string;
  period?: string;
  page?: number;
  limit?: number;
}