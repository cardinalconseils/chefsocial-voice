import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3004' : 'https://api.chefsocial.io');

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to check if we're on the client side
const isClient = typeof window !== 'undefined';

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (isClient) {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && isClient) {
      // Clear invalid token and redirect to login
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/admin/auth/login', { email, password });
    return response.data;
  },
  
  logout: () => {
    if (isClient) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
  },
  
  getCurrentUser: () => {
    if (!isClient) return null;
    const user = localStorage.getItem('admin_user');
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated: () => {
    if (!isClient) return false;
    return !!localStorage.getItem('admin_token');
  }
};

// Users API
export const usersAPI = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const response = await api.get('/api/admin/users', { params });
    return response.data;
  },
  
  updateUser: async (userId: string, data: { status?: string; role?: string; subscription_status?: string; notes?: string }) => {
    const response = await api.put(`/api/admin/users/${userId}`, data);
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  getAnalytics: async (period?: string) => {
    const response = await api.get('/api/admin/analytics', { params: { period } });
    return response.data;
  },
  
  getUsageReports: async (period?: string, userId?: string) => {
    const response = await api.get('/api/admin/usage-reports', { params: { period, userId } });
    return response.data;
  }
};

// Audit API
export const auditAPI = {
  getAuditLogs: async (params?: { page?: number; limit?: number; action?: string; resource_type?: string }) => {
    const response = await api.get('/api/admin/audit-log', { params });
    return response.data;
  },
  
  createAuditLog: async (data: { action: string; resource_type: string; resource_id?: string; details?: object }) => {
    const response = await api.post('/api/admin/audit-log', data);
    return response.data;
  }
};

export default api;