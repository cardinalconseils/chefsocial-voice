import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database-postgres';
import { requireRole } from '../../../../lib/auth';
import { ERROR_MESSAGES } from '../../../../lib/validation';

interface AdminStats {
  totalUsers: number;
  activeTrials: number;
  paidSubscriptions: number;
  totalRevenue: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  conversionRate: number;
  averageSessionDuration: number;
  totalVoiceSessions: number;
  activeVoiceSessionsToday: number;
  totalApiCalls: number;
  apiCallsToday: number;
}

// GET /api/admin/stats - Get admin dashboard statistics
export const GET = requireRole(['admin'])(async (request: NextRequest, user) => {
  try {
    // Get user statistics from database
    const userStats = await db.getAdminStats();
    
    // Calculate conversion rate (paid subscribers / total users)
    const conversionRate = userStats.total_users > 0 
      ? (userStats.paid_subscriptions / userStats.total_users) * 100 
      : 0;
    
    // Mock revenue calculation (in a real app, this would come from Stripe)
    const totalRevenue = userStats.paid_subscriptions * 29; // Assuming $29/month
    
    // Mock voice session data (would come from actual session tracking)
    const totalVoiceSessions = userStats.total_users * 12; // Average 12 sessions per user
    const activeVoiceSessionsToday = Math.floor(userStats.total_users * 0.15); // 15% daily active
    
    // Mock API call data
    const totalApiCalls = totalVoiceSessions * 25; // Average 25 API calls per session
    const apiCallsToday = activeVoiceSessionsToday * 25;
    
    // Mock average session duration (in minutes)
    const averageSessionDuration = 8.5;
    
    const stats: AdminStats = {
      totalUsers: parseInt(userStats.total_users),
      activeTrials: parseInt(userStats.active_trials),
      paidSubscriptions: parseInt(userStats.paid_subscriptions),
      totalRevenue,
      newUsersToday: parseInt(userStats.new_users_today),
      newUsersThisWeek: parseInt(userStats.new_users_this_week),
      newUsersThisMonth: parseInt(userStats.new_users_this_month),
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageSessionDuration,
      totalVoiceSessions,
      activeVoiceSessionsToday,
      totalApiCalls,
      apiCallsToday
    };
    
    return NextResponse.json({
      success: true,
      message: 'Admin statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 