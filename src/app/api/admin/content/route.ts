import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth';
import { validateInput, paginationSchema, ERROR_MESSAGES } from '../../../../lib/validation';
import { User } from '../../../../types/auth';

interface ContentItem {
  id: string;
  type: 'recipe' | 'menu' | 'description' | 'instruction';
  userId: string;
  userName: string;
  restaurantName: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  flags: string[];
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  moderationScore?: number; // 0-100, higher = more likely to need review
  language: string;
  wordCount: number;
}

// GET /api/admin/content - List content for review (admin only)
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
    const type = searchParams.get('type');
    const flagged = searchParams.get('flagged') === 'true';
    const userId = searchParams.get('userId');
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined;
    
    // Mock content data (in a real app, this would come from a content moderation table)
    const mockContent: ContentItem[] = [
      {
        id: 'content_001',
        type: 'recipe',
        userId: 'user_001',
        userName: 'Chef Mario',
        restaurantName: 'Mario\'s Italian Kitchen',
        title: 'Spicy Arrabbiata Pasta',
        content: 'A classic Italian pasta dish with a fiery tomato sauce. Heat olive oil in a large pan, add garlic and red pepper flakes. Add crushed tomatoes, salt, and simmer for 15 minutes. Toss with cooked pasta and fresh basil.',
        status: 'pending',
        flags: ['spicy-content'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        moderationScore: 25,
        language: 'en',
        wordCount: 45
      },
      {
        id: 'content_002',
        type: 'menu',
        userId: 'user_002',
        userName: 'Chef Sarah',
        restaurantName: 'Sarah\'s Bistro',
        title: 'Weekend Brunch Menu',
        content: 'Avocado Toast - $12\nFrench Toast - $14\nBenedict - $16\nSmoked Salmon Bagel - $18\nFresh Fruit Bowl - $10',
        status: 'approved',
        flags: [],
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        reviewedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        reviewedBy: user.email,
        moderationScore: 5,
        language: 'en',
        wordCount: 25
      },
      {
        id: 'content_003',
        type: 'recipe',
        userId: 'user_003',
        userName: 'Chef Chen',
        restaurantName: 'Golden Dragon',
        title: 'Kung Pao Chicken',
        content: 'Traditional Sichuan dish with chicken, peanuts, and dried chilies. The sauce contains soy sauce, rice vinegar, and sugar. Be careful with the spice level - this dish can be very hot!',
        status: 'flagged',
        flags: ['allergen-warning', 'spice-warning'],
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        moderationScore: 65,
        language: 'en',
        wordCount: 35
      },
      {
        id: 'content_004',
        type: 'instruction',
        userId: 'user_004',
        userName: 'Chef Emma',
        restaurantName: 'Emma\'s Farm Table',
        title: 'Knife Safety Guidelines',
        content: 'Always keep knives sharp - dull knives are more dangerous. Cut away from your body. Use a cutting board. Store knives properly in a knife block or magnetic strip.',
        status: 'approved',
        flags: [],
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        reviewedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        reviewedBy: user.email,
        moderationScore: 15,
        language: 'en',
        wordCount: 30
      },
      {
        id: 'content_005',
        type: 'description',
        userId: 'user_005',
        userName: 'Chef Alex',
        restaurantName: 'The Modern Kitchen',
        title: 'Restaurant Atmosphere',
        content: 'Our restaurant offers a cozy, intimate dining experience with dim lighting and soft jazz music. Perfect for date nights and special occasions.',
        status: 'pending',
        flags: [],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        moderationScore: 10,
        language: 'en',
        wordCount: 25
      }
    ];
    
    // Apply filters
    let filteredContent = mockContent;
    
    if (status) {
      filteredContent = filteredContent.filter(item => item.status === status);
    }
    
    if (type) {
      filteredContent = filteredContent.filter(item => item.type === type);
    }
    
    if (flagged) {
      filteredContent = filteredContent.filter(item => item.flags.length > 0);
    }
    
    if (userId) {
      filteredContent = filteredContent.filter(item => item.userId === userId);
    }
    
    if (minScore !== undefined) {
      filteredContent = filteredContent.filter(item => (item.moderationScore || 0) >= minScore);
    }
    
    // Sort by moderation score (highest first) and creation date
    filteredContent.sort((a, b) => {
      const scoreA = a.moderationScore || 0;
      const scoreB = b.moderationScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // Apply pagination
    const total = filteredContent.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedContent = filteredContent.slice(offset, offset + limit);
    
    // Calculate summary statistics
    const pendingCount = filteredContent.filter(item => item.status === 'pending').length;
    const flaggedCount = filteredContent.filter(item => item.status === 'flagged').length;
    const approvedCount = filteredContent.filter(item => item.status === 'approved').length;
    const rejectedCount = filteredContent.filter(item => item.status === 'rejected').length;
    const highRiskCount = filteredContent.filter(item => (item.moderationScore || 0) >= 50).length;
    
    return NextResponse.json({
      success: true,
      message: 'Content retrieved successfully',
      data: {
        content: paginatedContent,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        summary: {
          pendingCount,
          flaggedCount,
          approvedCount,
          rejectedCount,
          highRiskCount,
          totalWords: filteredContent.reduce((sum, item) => sum + item.wordCount, 0)
        }
      }
    });

  } catch (error) {
    console.error('Admin list content error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// PUT /api/admin/content/[id] - Review content item (admin only)
export const PUT = requireRole(['admin'])(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    const { action, reason } = body; // action: 'approve' | 'reject' | 'flag'
    
    // Extract content ID from URL
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Content ID is required'
      }, { status: 400 });
    }
    
    if (!action || !['approve', 'reject', 'flag'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Valid action is required (approve, reject, or flag)'
      }, { status: 400 });
    }
    
    // In a real app, you would:
    // 1. Find the content item in the database
    // 2. Update its status and review information
    // 3. Log the moderation action
    // 4. Possibly notify the content creator
    
    const reviewedAt = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged';
    
    // Log the moderation action
    console.log(`Admin ${user.email} ${action}ed content ${id}${reason ? ` with reason: ${reason}` : ''}`);
    
    return NextResponse.json({
      success: true,
      message: `Content ${action}ed successfully`,
      data: {
        id,
        status: newStatus,
        reviewedAt,
        reviewedBy: user.email,
        reason
      }
    });

  } catch (error) {
    console.error('Admin review content error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// POST /api/admin/content/bulk - Bulk content actions (admin only)
export const POST = requireRole(['admin'])(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    const { contentIds, action, reason } = body;
    
    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Content IDs array is required'
      }, { status: 400 });
    }
    
    if (!action || !['approve', 'reject', 'flag'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Valid action is required (approve, reject, or flag)'
      }, { status: 400 });
    }
    
    // In a real app, you would process each content ID
    const reviewedAt = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged';
    
    // Log the bulk moderation action
    console.log(`Admin ${user.email} bulk ${action}ed ${contentIds.length} content items${reason ? ` with reason: ${reason}` : ''}`);
    
    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        processedCount: contentIds.length,
        status: newStatus,
        reviewedAt,
        reviewedBy: user.email,
        reason
      }
    });

  } catch (error) {
    console.error('Admin bulk content action error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 