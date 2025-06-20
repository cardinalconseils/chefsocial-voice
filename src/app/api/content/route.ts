import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { validateInput, paginationSchema, ERROR_MESSAGES } from '../../../lib/validation';
import { User } from '../../../types/auth';
import { z } from 'zod';

interface ContentItem {
  id: string;
  userId: string;
  type: 'recipe' | 'menu' | 'description' | 'instruction' | 'marketing';
  title: string;
  content: string;
  tags: string[];
  category?: string;
  language: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'public' | 'shared';
  metadata: {
    wordCount: number;
    estimatedReadTime: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cookingTime?: string;
    servings?: number;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

const createContentSchema = z.object({
  type: z.enum(['recipe', 'menu', 'description', 'instruction', 'marketing']),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).optional(),
  category: z.string().max(50).optional(),
  language: z.string().default('en'),
  status: z.enum(['draft', 'published']).default('draft'),
  visibility: z.enum(['private', 'public', 'shared']).default('private'),
  metadata: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    cookingTime: z.string().optional(),
    servings: z.number().min(1).max(100).optional()
  }).optional()
});

const updateContentSchema = createContentSchema.partial();

// Mock content data
const mockContent: ContentItem[] = [
  {
    id: 'content_001',
    userId: 'user_001',
    type: 'recipe',
    title: 'Classic Margherita Pizza',
    content: 'Ingredients:\n- 500g pizza dough\n- 200ml tomato sauce\n- 200g fresh mozzarella\n- Fresh basil leaves\n- Extra virgin olive oil\n- Salt and pepper\n\nInstructions:\n1. Preheat oven to 250°C\n2. Roll out pizza dough\n3. Spread tomato sauce evenly\n4. Add torn mozzarella\n5. Bake for 10-12 minutes\n6. Garnish with fresh basil',
    tags: ['pizza', 'italian', 'vegetarian', 'classic'],
    category: 'main-course',
    language: 'en',
    status: 'published',
    visibility: 'public',
    metadata: {
      wordCount: 67,
      estimatedReadTime: 1,
      difficulty: 'medium',
      cookingTime: '25 minutes',
      servings: 4
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'content_002',
    userId: 'user_001',
    type: 'menu',
    title: 'Weekend Brunch Specials',
    content: 'APPETIZERS\n- Avocado Toast with Poached Egg - $14\n- Smoked Salmon Bagel - $16\n- Fresh Fruit Bowl - $10\n\nMAIN COURSES\n- Classic Benedict - $18\n- French Toast Stack - $15\n- Shakshuka - $16\n- Breakfast Burrito - $14\n\nBEVERAGES\n- Fresh Orange Juice - $6\n- Coffee - $4\n- Mimosa - $8',
    tags: ['brunch', 'weekend', 'specials'],
    category: 'menu',
    language: 'en',
    status: 'published',
    visibility: 'public',
    metadata: {
      wordCount: 45,
      estimatedReadTime: 1
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'content_003',
    userId: 'user_002',
    type: 'description',
    title: 'Restaurant Atmosphere',
    content: 'Step into our cozy bistro where rustic charm meets modern elegance. Exposed brick walls adorned with local artwork create an intimate atmosphere, while soft jazz music sets the perfect mood for a memorable dining experience. Our open kitchen allows guests to witness the culinary artistry that goes into each dish.',
    tags: ['atmosphere', 'ambiance', 'bistro'],
    category: 'marketing',
    language: 'en',
    status: 'draft',
    visibility: 'private',
    metadata: {
      wordCount: 52,
      estimatedReadTime: 1
    },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// GET /api/content - List user's content
export const GET = requireAuth(async (request: NextRequest, user: User) => {
  try {
    const { searchParams } = request.nextUrl;
    
    // Validate pagination
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
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const visibility = searchParams.get('visibility');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',');
    const search = searchParams.get('search');
    
    // Filter content for current user
    let userContent = mockContent.filter(content => content.userId === user.id);
    
    // Apply filters
    if (type) {
      userContent = userContent.filter(content => content.type === type);
    }
    
    if (status) {
      userContent = userContent.filter(content => content.status === status);
    }
    
    if (visibility) {
      userContent = userContent.filter(content => content.visibility === visibility);
    }
    
    if (category) {
      userContent = userContent.filter(content => content.category === category);
    }
    
    if (tags && tags.length > 0) {
      userContent = userContent.filter(content =>
        tags.some(tag => content.tags.includes(tag.trim()))
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      userContent = userContent.filter(content =>
        content.title.toLowerCase().includes(searchLower) ||
        content.content.toLowerCase().includes(searchLower) ||
        content.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by updated date (most recent first)
    userContent.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    // Apply pagination
    const total = userContent.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedContent = userContent.slice(offset, offset + limit);

    // Calculate summary statistics
    const stats = {
      total,
      byType: {
        recipe: userContent.filter(c => c.type === 'recipe').length,
        menu: userContent.filter(c => c.type === 'menu').length,
        description: userContent.filter(c => c.type === 'description').length,
        instruction: userContent.filter(c => c.type === 'instruction').length,
        marketing: userContent.filter(c => c.type === 'marketing').length
      },
      byStatus: {
        draft: userContent.filter(c => c.status === 'draft').length,
        published: userContent.filter(c => c.status === 'published').length,
        archived: userContent.filter(c => c.status === 'archived').length
      },
      totalWords: userContent.reduce((sum, c) => sum + c.metadata.wordCount, 0)
    };

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
        stats
      }
    });

  } catch (error) {
    console.error('List content error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// POST /api/content - Create new content
export const POST = requireAuth(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateInput(createContentSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid content data',
        details: validation.errors
      }, { status: 400 });
    }

    const contentData = validation.data;
    if (!contentData) {
      return NextResponse.json({
        success: false,
        error: 'No content data provided'
      }, { status: 400 });
    }

    // Calculate metadata
    const wordCount = contentData.content.split(/\s+/).length;
    const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute

    const newContent: ContentItem = {
      id: `content_${Date.now()}`,
      userId: user.id,
      type: contentData.type,
      title: contentData.title,
      content: contentData.content,
      tags: contentData.tags || [],
      category: contentData.category,
      language: contentData.language || 'en',
      status: contentData.status || 'draft',
      visibility: contentData.visibility || 'private',
      metadata: {
        wordCount,
        estimatedReadTime,
        ...contentData.metadata
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: contentData.status === 'published' ? new Date().toISOString() : undefined
    };

    // In a real app, you would:
    // 1. Check user's content limits based on subscription
    // 2. Run content moderation/safety checks
    // 3. Generate SEO-friendly slugs
    // 4. Process and optimize any images
    // 5. Index content for search
    // 6. Send notifications if published publicly

    console.log(`Creating content for user ${user.id}:`, newContent);

    return NextResponse.json({
      success: true,
      message: 'Content created successfully',
      data: newContent
    }, { status: 201 });

  } catch (error) {
    console.error('Create content error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 