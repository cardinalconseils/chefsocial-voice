import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.chefsocial.io';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response?.status === 401) {
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
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },
  
  getCurrentUser: () => {
    const user = localStorage.getItem('admin_user');
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated: () => {
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