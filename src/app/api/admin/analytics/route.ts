import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth';
import { ERROR_MESSAGES } from '../../../../lib/validation';
import { User } from '../../../../types/auth';

interface AnalyticsData {
  userGrowth: {
    daily: Array<{ date: string; newUsers: number; totalUsers: number }>;
    weekly: Array<{ week: string; newUsers: number; totalUsers: number }>;
    monthly: Array<{ month: string; newUsers: number; totalUsers: number }>;
  };
  usage: {
    dailyActiveUsers: Array<{ date: string; activeUsers: number }>;
    sessionsPerUser: Array<{ date: string; averageSessions: number }>;
    apiCallsPerDay: Array<{ date: string; apiCalls: number }>;
  };
  revenue: {
    daily: Array<{ date: string; revenue: number; subscriptions: number }>;
    monthly: Array<{ month: string; revenue: number; subscriptions: number }>;
    conversionRates: Array<{ month: string; conversionRate: number }>;
  };
  geographic: {
    countries: Array<{ country: string; users: number; percentage: number }>;
    cities: Array<{ city: string; users: number; percentage: number }>;
  };
  deviceTypes: Array<{ type: string; users: number; percentage: number }>;
  topFeatures: Array<{ feature: string; usage: number; percentage: number }>;
}

// GET /api/admin/analytics - Get platform analytics (admin only)
export const GET = requireRole(['admin'])(async (request: NextRequest, user: User) => {
  try {
    const { searchParams } = request.nextUrl;
    const timeRange = searchParams.get('timeRange') || '30d'; // 7d, 30d, 90d, 1y
    const metric = searchParams.get('metric'); // specific metric to focus on
    
    // Generate mock analytics data (in a real app, this would come from analytics service)
    const now = new Date();
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    
    // User Growth Data
    const userGrowthDaily = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(now.getTime() - (daysCount - 1 - i) * 24 * 60 * 60 * 1000);
      const baseUsers = 50 + i * 2;
      const newUsers = Math.floor(Math.random() * 8) + 2;
      return {
        date: date.toISOString().split('T')[0],
        newUsers,
        totalUsers: baseUsers + newUsers
      };
    });
    
    // Usage Data
    const dailyActiveUsers = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(now.getTime() - (daysCount - 1 - i) * 24 * 60 * 60 * 1000);
      const activeUsers = Math.floor(Math.random() * 40) + 20;
      return {
        date: date.toISOString().split('T')[0],
        activeUsers
      };
    });
    
    const sessionsPerUser = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(now.getTime() - (daysCount - 1 - i) * 24 * 60 * 60 * 1000);
      const averageSessions = Math.round((Math.random() * 3 + 2) * 10) / 10;
      return {
        date: date.toISOString().split('T')[0],
        averageSessions
      };
    });
    
    const apiCallsPerDay = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(now.getTime() - (daysCount - 1 - i) * 24 * 60 * 60 * 1000);
      const apiCalls = Math.floor(Math.random() * 1000) + 500;
      return {
        date: date.toISOString().split('T')[0],
        apiCalls
      };
    });
    
    // Revenue Data
    const revenueDaily = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(now.getTime() - (daysCount - 1 - i) * 24 * 60 * 60 * 1000);
      const subscriptions = Math.floor(Math.random() * 5) + 1;
      const revenue = subscriptions * 29; // $29 per subscription
      return {
        date: date.toISOString().split('T')[0],
        revenue,
        subscriptions
      };
    });
    
    // Geographic Data
    const countries = [
      { country: 'United States', users: 45, percentage: 45 },
      { country: 'Canada', users: 15, percentage: 15 },
      { country: 'United Kingdom', users: 12, percentage: 12 },
      { country: 'Australia', users: 8, percentage: 8 },
      { country: 'Germany', users: 7, percentage: 7 },
      { country: 'France', users: 6, percentage: 6 },
      { country: 'Other', users: 7, percentage: 7 }
    ];
    
    const cities = [
      { city: 'New York', users: 18, percentage: 18 },
      { city: 'Los Angeles', users: 12, percentage: 12 },
      { city: 'Toronto', users: 10, percentage: 10 },
      { city: 'London', users: 9, percentage: 9 },
      { city: 'Chicago', users: 8, percentage: 8 },
      { city: 'Sydney', users: 7, percentage: 7 },
      { city: 'Other', users: 36, percentage: 36 }
    ];
    
    // Device Types
    const deviceTypes = [
      { type: 'Desktop', users: 60, percentage: 60 },
      { type: 'Mobile', users: 35, percentage: 35 },
      { type: 'Tablet', users: 5, percentage: 5 }
    ];
    
    // Top Features
    const topFeatures = [
      { feature: 'Voice Recipe Creation', usage: 85, percentage: 85 },
      { feature: 'Menu Planning', usage: 72, percentage: 72 },
      { feature: 'Inventory Management', usage: 68, percentage: 68 },
      { feature: 'Cost Calculation', usage: 55, percentage: 55 },
      { feature: 'Nutrition Analysis', usage: 42, percentage: 42 },
      { feature: 'Recipe Sharing', usage: 38, percentage: 38 }
    ];
    
    const analytics: AnalyticsData = {
      userGrowth: {
        daily: userGrowthDaily,
        weekly: [], // Would aggregate daily data
        monthly: [] // Would aggregate daily data
      },
      usage: {
        dailyActiveUsers,
        sessionsPerUser,
        apiCallsPerDay
      },
      revenue: {
        daily: revenueDaily,
        monthly: [], // Would aggregate daily data
        conversionRates: [] // Would calculate from user data
      },
      geographic: {
        countries,
        cities
      },
      deviceTypes,
      topFeatures
    };
    
    // Filter by specific metric if requested
    if (metric) {
      const filteredAnalytics: any = {};
      if (metric === 'userGrowth') filteredAnalytics.userGrowth = analytics.userGrowth;
      if (metric === 'usage') filteredAnalytics.usage = analytics.usage;
      if (metric === 'revenue') filteredAnalytics.revenue = analytics.revenue;
      if (metric === 'geographic') filteredAnalytics.geographic = analytics.geographic;
      if (metric === 'devices') filteredAnalytics.deviceTypes = analytics.deviceTypes;
      if (metric === 'features') filteredAnalytics.topFeatures = analytics.topFeatures;
      
      return NextResponse.json({
        success: true,
        message: `${metric} analytics retrieved successfully`,
        data: filteredAnalytics,
        timeRange,
        generatedAt: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Analytics data retrieved successfully',
      data: analytics,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 