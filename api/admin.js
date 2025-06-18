// ChefSocial Admin API with License Management and Stripe Integration
const Stripe = require('stripe');

// Initialize Stripe with secret key (use environment variable in production)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

// Mock database for development (replace with actual database in production)
let mockUsers = [
  {
    id: 'user_1',
    name: 'John Doe',
    email: 'john@restaurant.com',
    restaurantName: 'John\'s Bistro',
    subscriptionStatus: 'trialing',
    trialStartDate: '2024-01-01T00:00:00Z',
    trialEndDate: '2024-01-15T00:00:00Z',
    monthlyAmount: 7900,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-10T10:30:00Z',
    stripeCustomerId: 'cus_test_123',
    stripeSubscriptionId: null
  },
  {
    id: 'user_2',
    name: 'Jane Smith',
    email: 'jane@foodplace.com',
    restaurantName: 'Jane\'s Kitchen',
    subscriptionStatus: 'active',
    trialStartDate: '2023-12-01T00:00:00Z',
    trialEndDate: '2023-12-15T00:00:00Z',
    subscriptionStartDate: '2023-12-15T00:00:00Z',
    lastPaymentDate: '2024-01-01T00:00:00Z',
    nextPaymentDate: '2024-02-01T00:00:00Z',
    monthlyAmount: 7900,
    paymentMethodLast4: '4242',
    createdAt: '2023-12-01T00:00:00Z',
    lastLoginAt: '2024-01-09T15:45:00Z',
    stripeCustomerId: 'cus_test_456',
    stripeSubscriptionId: 'sub_test_789'
  }
];

let mockActivity = [
  {
    id: 'activity_1',
    type: 'trial_started',
    userId: 'user_1',
    userName: 'John Doe',
    userEmail: 'john@restaurant.com',
    timestamp: '2024-01-01T00:00:00Z'
  },
  {
    id: 'activity_2',
    type: 'subscription_created',
    userId: 'user_2',
    userName: 'Jane Smith',
    userEmail: 'jane@foodplace.com',
    amount: 7900,
    timestamp: '2023-12-15T00:00:00Z'
  },
  {
    id: 'activity_3',
    type: 'payment_succeeded',
    userId: 'user_2',
    userName: 'Jane Smith',
    userEmail: 'jane@foodplace.com',
    amount: 7900,
    timestamp: '2024-01-01T00:00:00Z'
  }
];

// Helper functions
const calculateStats = () => {
  const totalUsers = mockUsers.length;
  const activeTrials = mockUsers.filter(u => u.subscriptionStatus === 'trialing').length;
  const activeSubscriptions = mockUsers.filter(u => u.subscriptionStatus === 'active').length;
  const cancelledSubscriptions = mockUsers.filter(u => u.subscriptionStatus === 'cancelled').length;
  
  const totalRevenue = mockActivity
    .filter(a => a.type === 'payment_succeeded')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  
  const monthlyRecurringRevenue = activeSubscriptions * 7900; // $79/month in cents
  
  const trialConversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;
  const churnRate = totalUsers > 0 ? (cancelledSubscriptions / totalUsers) * 100 : 0;
  
  return {
    totalUsers,
    activeTrials,
    activeSubscriptions,
    cancelledSubscriptions,
    totalRevenue,
    monthlyRecurringRevenue,
    trialConversionRate,
    churnRate
  };
};

const addActivity = (type, userId, amount = null, metadata = null) => {
  const user = mockUsers.find(u => u.id === userId);
  if (user) {
    mockActivity.unshift({
      id: `activity_${Date.now()}`,
      type,
      userId,
      userName: user.name,
      userEmail: user.email,
      amount,
      timestamp: new Date().toISOString(),
      metadata
    });
  }
};

// Main serverless function
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pathname } = new URL(req.url, 'https://example.com');
    const pathParts = pathname.split('/').filter(Boolean);
    const route = pathParts.slice(2).join('/'); // Remove 'api' and 'admin'

    console.log('Admin API Route:', route, 'Method:', req.method);

    // Authentication check for protected routes
    const protectedRoutes = ['stats', 'users', 'activity', 'settings', 'stripe'];
    const isProtected = protectedRoutes.some(protected => route.startsWith(protected));
    
    if (isProtected && route !== 'auth/login') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const token = authHeader.substring(7);
      if (!token.startsWith('admin_') && token !== 'admin123') {
        return res.status(401).json({ error: 'Invalid admin token' });
      }
    }

    switch (route) {
      case '':
      case 'auth/login':
        if (req.method === 'POST') {
          const { email, password } = req.body || {};
          
          if (email === 'admin@chefsocial.io' && password === 'admin123') {
            return res.status(200).json({
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
            return res.status(401).json({
              success: false,
              error: 'Invalid credentials'
            });
          }
        }
        break;

      case 'stats':
        if (req.method === 'GET') {
          const stats = calculateStats();
          return res.status(200).json({
            success: true,
            data: stats
          });
        }
        break;

      case 'users':
        if (req.method === 'GET') {
          const { page = 1, limit = 10, search = '', status = '' } = req.query;
          
          let filteredUsers = mockUsers;
          
          // Filter by search
          if (search) {
            filteredUsers = filteredUsers.filter(user => 
              user.name.toLowerCase().includes(search.toLowerCase()) ||
              user.email.toLowerCase().includes(search.toLowerCase()) ||
              user.restaurantName.toLowerCase().includes(search.toLowerCase())
            );
          }
          
          // Filter by status
          if (status) {
            filteredUsers = filteredUsers.filter(user => user.subscriptionStatus === status);
          }
          
          // Pagination
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + parseInt(limit);
          const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
          
          // Calculate trial days remaining for each user
          const usersWithTrialInfo = paginatedUsers.map(user => {
            let trialDaysRemaining = 0;
            if (user.subscriptionStatus === 'trialing' && user.trialEndDate) {
              const trialEnd = new Date(user.trialEndDate);
              const now = new Date();
              trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
            }
            
            return {
              ...user,
              trialDaysRemaining
            };
          });
          
          return res.status(200).json({
            success: true,
            data: {
              users: usersWithTrialInfo,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filteredUsers.length,
                pages: Math.ceil(filteredUsers.length / limit)
              }
            }
          });
        }
        break;

      case 'users/action':
        if (req.method === 'POST') {
          const { userId, action } = req.body || {};
          
          const user = mockUsers.find(u => u.id === userId);
          if (!user) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          switch (action) {
            case 'extend_trial':
              if (user.subscriptionStatus === 'trialing') {
                const currentTrialEnd = new Date(user.trialEndDate);
                currentTrialEnd.setDate(currentTrialEnd.getDate() + 7); // Extend by 7 days
                user.trialEndDate = currentTrialEnd.toISOString();
                
                addActivity('trial_extended', userId, null, { days: 7 });
                
                return res.status(200).json({
                  success: true,
                  message: 'Trial extended by 7 days',
                  user: user
                });
              } else {
                return res.status(400).json({ error: 'User is not on trial' });
              }
              
            case 'cancel_subscription':
              if (user.subscriptionStatus === 'active') {
                user.subscriptionStatus = 'cancelled';
                addActivity('subscription_cancelled', userId);
                
                return res.status(200).json({
                  success: true,
                  message: 'Subscription cancelled',
                  user: user
                });
              } else {
                return res.status(400).json({ error: 'User does not have active subscription' });
              }
              
            case 'reactivate_subscription':
              if (user.subscriptionStatus === 'cancelled') {
                user.subscriptionStatus = 'active';
                addActivity('subscription_reactivated', userId);
                
                return res.status(200).json({
                  success: true,
                  message: 'Subscription reactivated',
                  user: user
                });
              } else {
                return res.status(400).json({ error: 'User subscription is not cancelled' });
              }
              
            case 'send_reminder':
              addActivity('reminder_sent', userId);
              
              return res.status(200).json({
                success: true,
                message: 'Reminder sent to user'
              });
              
            default:
              return res.status(400).json({ error: 'Invalid action' });
          }
        }
        break;

      case 'activity':
        if (req.method === 'GET') {
          const { page = 1, limit = 20 } = req.query;
          
          // Pagination
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + parseInt(limit);
          const paginatedActivity = mockActivity.slice(startIndex, endIndex);
          
          return res.status(200).json({
            success: true,
            data: {
              activities: paginatedActivity,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: mockActivity.length,
                pages: Math.ceil(mockActivity.length / limit)
              }
            }
          });
        }
        break;

      case 'settings':
        if (req.method === 'GET') {
          return res.status(200).json({
            success: true,
            data: {
              trialLengthDays: 14,
              extensionDays: 7,
              monthlyPriceCents: 7900,
              gracePeriodDays: 3,
              reminderDays: [7, 3, 1],
              emailNotificationsEnabled: true,
              webhookUrl: 'https://chefsocial-voice.vercel.app/api/admin/stripe/webhook'
            }
          });
        } else if (req.method === 'PUT') {
          // In a real implementation, you would update settings here
          return res.status(200).json({
            success: true,
            message: 'Settings updated successfully'
          });
        }
        break;

      case 'stripe/webhook':
        if (req.method === 'POST') {
          try {
            const sig = req.headers['stripe-signature'];
            let event;

            try {
              event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
            } catch (err) {
              console.error('Webhook signature verification failed:', err.message);
              return res.status(400).json({ error: 'Webhook signature verification failed' });
            }

            // Handle the event
            switch (event.type) {
              case 'customer.subscription.created':
                const subscriptionCreated = event.data.object;
                console.log('Subscription created:', subscriptionCreated.id);
                // Update user subscription status
                break;

              case 'customer.subscription.updated':
                const subscriptionUpdated = event.data.object;
                console.log('Subscription updated:', subscriptionUpdated.id);
                break;

              case 'customer.subscription.deleted':
                const subscriptionDeleted = event.data.object;
                console.log('Subscription deleted:', subscriptionDeleted.id);
                break;

              case 'invoice.payment_succeeded':
                const invoicePaymentSucceeded = event.data.object;
                console.log('Payment succeeded:', invoicePaymentSucceeded.id);
                break;

              case 'invoice.payment_failed':
                const invoicePaymentFailed = event.data.object;
                console.log('Payment failed:', invoicePaymentFailed.id);
                break;

              default:
                console.log(`Unhandled event type ${event.type}`);
            }

            return res.status(200).json({ received: true });
          } catch (error) {
            console.error('Webhook error:', error);
            return res.status(500).json({ error: 'Webhook processing failed' });
          }
        }
        break;

      case 'stripe/create-customer':
        if (req.method === 'POST') {
          try {
            const { email, name, restaurantName, metadata = {} } = req.body || {};
            
            const customer = await stripe.customers.create({
              email,
              name,
              metadata: {
                restaurant_name: restaurantName,
                ...metadata
              }
            });
            
            return res.status(200).json({
              success: true,
              customer: {
                id: customer.id,
                email: customer.email,
                name: customer.name
              }
            });
          } catch (error) {
            console.error('Create customer error:', error);
            return res.status(500).json({ 
              error: 'Failed to create customer',
              message: error.message 
            });
          }
        }
        break;

      default:
        return res.status(404).json({ 
          error: 'Admin endpoint not found',
          path: route,
          availableEndpoints: [
            'POST /auth/login',
            'GET /stats',
            'GET /users',
            'POST /users/action',
            'GET /activity',
            'GET /settings',
            'PUT /settings',
            'POST /stripe/webhook',
            'POST /stripe/create-customer'
          ]
        });
    }

    return res.status(404).json({ error: 'Route not found' });

  } catch (error) {
    console.error('Admin API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}; 