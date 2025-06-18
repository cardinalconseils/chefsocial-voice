const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for Vercel
}));

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic auth middleware (temporary - replace with proper auth)
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // For now, accept any token that starts with 'admin_'
  const token = authHeader.substring(7);
  if (!token.startsWith('admin_')) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  
  // Add admin user to request
  req.admin = { id: 'admin_1', email: 'admin@chefsocial.io', role: 'admin' };
  next();
};

// Admin Authentication Routes
app.post('/api/admin/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple admin login (replace with proper auth)
  if (email === 'admin@chefsocial.io' && password === 'admin123') {
    res.json({
      success: true,
      token: 'admin_token_12345',
      user: {
        id: 'admin_1',
        email: 'admin@chefsocial.io',
        role: 'admin',
        name: 'Admin User'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Users Management Routes
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;
  
  // Mock user data
  const mockUsers = [
    {
      id: 'user_1',
      email: 'restaurant1@example.com',
      name: 'Restaurant Owner 1',
      status: 'active',
      role: 'user',
      subscription_status: 'premium',
      created_at: '2024-01-15T10:00:00Z',
      last_login: '2024-01-18T14:30:00Z'
    },
    {
      id: 'user_2',
      email: 'restaurant2@example.com',
      name: 'Restaurant Owner 2',
      status: 'active',
      role: 'user',
      subscription_status: 'basic',
      created_at: '2024-01-16T11:00:00Z',
      last_login: '2024-01-18T09:15:00Z'
    }
  ];
  
  res.json({
    success: true,
    data: {
      users: mockUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockUsers.length,
        totalPages: Math.ceil(mockUsers.length / limit)
      }
    }
  });
});

app.put('/api/admin/users/:userId', authenticateAdmin, (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;
  
  res.json({
    success: true,
    data: {
      id: userId,
      ...updateData,
      updated_at: new Date().toISOString()
    }
  });
});

// Analytics Routes
app.get('/api/admin/analytics', authenticateAdmin, (req, res) => {
  const { period = '7d' } = req.query;
  
  // Mock analytics data
  res.json({
    success: true,
    data: {
      period,
      metrics: {
        total_users: 156,
        active_users: 89,
        new_users_this_period: 12,
        total_sessions: 1247,
        total_content_generated: 3456,
        revenue: 2340.50
      },
      growth: {
        users: 8.5,
        sessions: 12.3,
        revenue: 15.7
      }
    }
  });
});

app.get('/api/admin/usage-reports', authenticateAdmin, (req, res) => {
  const { period = '7d', userId } = req.query;
  
  res.json({
    success: true,
    data: {
      period,
      userId,
      usage: {
        voice_minutes: 1234,
        content_pieces: 567,
        api_calls: 8901,
        storage_mb: 234.5
      }
    }
  });
});

// Audit Log Routes
app.get('/api/admin/audit-log', authenticateAdmin, (req, res) => {
  const { page = 1, limit = 10, action = '', resource_type = '' } = req.query;
  
  // Mock audit log data
  const mockLogs = [
    {
      id: 'log_1',
      timestamp: '2024-01-18T14:30:00Z',
      admin_id: 'admin_1',
      admin_email: 'admin@chefsocial.io',
      action: 'user_updated',
      resource_type: 'user',
      resource_id: 'user_123',
      details: { field: 'status', old_value: 'pending', new_value: 'active' }
    },
    {
      id: 'log_2',
      timestamp: '2024-01-18T13:15:00Z',
      admin_id: 'admin_1',
      admin_email: 'admin@chefsocial.io',
      action: 'user_created',
      resource_type: 'user',
      resource_id: 'user_124',
      details: { email: 'newuser@example.com' }
    }
  ];
  
  res.json({
    success: true,
    data: {
      logs: mockLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockLogs.length,
        totalPages: Math.ceil(mockLogs.length / limit)
      }
    }
  });
});

app.post('/api/admin/audit-log', authenticateAdmin, (req, res) => {
  const logData = req.body;
  
  res.json({
    success: true,
    data: {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      admin_id: req.admin.id,
      admin_email: req.admin.email,
      ...logData
    }
  });
});

// Health check for admin API
app.get('/api/admin/health', (req, res) => {
  res.json({
    success: true,
    service: 'ChefSocial Admin API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/admin/auth/login',
      '/api/admin/users',
      '/api/admin/analytics',
      '/api/admin/usage-reports',
      '/api/admin/audit-log'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Admin API Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Admin API endpoint not found',
    path: req.originalUrl
  });
});

module.exports = app; 