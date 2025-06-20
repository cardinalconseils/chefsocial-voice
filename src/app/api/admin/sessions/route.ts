import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth';
import { validateInput, paginationSchema, ERROR_MESSAGES } from '../../../../lib/validation';
import { User } from '../../../../types/auth';

interface VoiceSession {
  id: string;
  userId: string;
  userName: string;
  restaurantName: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  status: 'active' | 'completed' | 'failed';
  transcriptLength?: number;
  apiCallsCount: number;
  costEstimate: number; // in cents
  language: string;
  deviceType: 'web' | 'mobile' | 'api';
}

// GET /api/admin/sessions - List voice sessions (admin only)
export const GET = requireRole(['admin'])(async (request: NextRequest, user: User) => {
  try {
    const { searchParams } = request.nextUrl;
    
    // Validate pagination parameters
    const paginationValidation = validateInput(paginationSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    if (!paginationValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors
      }, { status: 400 });
    }

    const { page = 1, limit = 10 } = paginationValidation.data || {};
    
    // Get filter parameters
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Mock voice sessions data (in a real app, this would come from a sessions table)
    const mockSessions: VoiceSession[] = [
      {
        id: 'session_001',
        userId: 'user_001',
        userName: 'Chef Mario',
        restaurantName: 'Mario\'s Italian Kitchen',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        endTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        duration: 30,
        status: 'completed',
        transcriptLength: 1250,
        apiCallsCount: 15,
        costEstimate: 75, // $0.75
        language: 'en',
        deviceType: 'web'
      },
      {
        id: 'session_002',
        userId: 'user_002',
        userName: 'Chef Sarah',
        restaurantName: 'Sarah\'s Bistro',
        startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        status: 'active',
        apiCallsCount: 8,
        costEstimate: 40, // $0.40
        language: 'en',
        deviceType: 'mobile'
      },
      {
        id: 'session_003',
        userId: 'user_003',
        userName: 'Chef Chen',
        restaurantName: 'Golden Dragon',
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        endTime: new Date(Date.now() - 2.8 * 60 * 60 * 1000).toISOString(),
        duration: 12,
        status: 'failed',
        transcriptLength: 0,
        apiCallsCount: 3,
        costEstimate: 15, // $0.15
        language: 'en',
        deviceType: 'api'
      },
      {
        id: 'session_004',
        userId: 'user_004',
        userName: 'Chef Emma',
        restaurantName: 'Emma\'s Farm Table',
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        endTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
        duration: 25,
        status: 'completed',
        transcriptLength: 980,
        apiCallsCount: 12,
        costEstimate: 60, // $0.60
        language: 'en',
        deviceType: 'web'
      }
    ];
    
    // Apply filters
    let filteredSessions = mockSessions;
    
    if (status) {
      filteredSessions = filteredSessions.filter(session => session.status === status);
    }
    
    if (userId) {
      filteredSessions = filteredSessions.filter(session => session.userId === userId);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      filteredSessions = filteredSessions.filter(session => new Date(session.startTime) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      filteredSessions = filteredSessions.filter(session => new Date(session.startTime) <= end);
    }
    
    // Apply pagination
    const total = filteredSessions.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedSessions = filteredSessions.slice(offset, offset + limit);
    
    // Calculate summary statistics
    const activeSessions = filteredSessions.filter(s => s.status === 'active').length;
    const completedSessions = filteredSessions.filter(s => s.status === 'completed').length;
    const failedSessions = filteredSessions.filter(s => s.status === 'failed').length;
    const totalCost = filteredSessions.reduce((sum, s) => sum + s.costEstimate, 0);
    const totalApiCalls = filteredSessions.reduce((sum, s) => sum + s.apiCallsCount, 0);
    
    return NextResponse.json({
      success: true,
      message: 'Voice sessions retrieved successfully',
      data: {
        sessions: paginatedSessions,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        summary: {
          activeSessions,
          completedSessions,
          failedSessions,
          totalCost,
          totalApiCalls,
          averageDuration: completedSessions > 0 
            ? Math.round(filteredSessions
                .filter(s => s.duration)
                .reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Admin list sessions error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 