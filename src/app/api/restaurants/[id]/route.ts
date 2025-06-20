import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { validateInput, ERROR_MESSAGES } from '../../../../lib/validation';
import { User } from '../../../../types/auth';
import { z } from 'zod';

const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  cuisine: z.string().min(1).max(50).optional(),
  location: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(300).optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/).optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  capacity: z.number().min(1).max(1000).optional(),
  priceRange: z.enum(['budget', 'moderate', 'upscale', 'fine-dining']).optional(),
  features: z.array(z.string()).optional(),
  operatingHours: z.record(z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    closed: z.boolean().optional()
  })).optional(),
  socialMedia: z.object({
    instagram: z.string().url().optional(),
    facebook: z.string().url().optional(),
    twitter: z.string().url().optional()
  }).optional(),
  status: z.enum(['active', 'inactive']).optional()
});

// Mock restaurant data (same as in main route)
const mockRestaurants = [
  {
    id: 'rest_001',
    userId: 'user_001',
    name: 'Mario\'s Italian Kitchen',
    cuisine: 'Italian',
    location: 'New York, NY',
    address: '123 Little Italy St, New York, NY 10013',
    phone: '+1 (212) 555-0123',
    website: 'https://marios-kitchen.com',
    description: 'Authentic Italian cuisine in the heart of Little Italy',
    capacity: 80,
    priceRange: 'moderate',
    features: ['outdoor-seating', 'wine-bar', 'private-dining'],
    operatingHours: {
      monday: { open: '11:00', close: '22:00' },
      tuesday: { open: '11:00', close: '22:00' },
      wednesday: { open: '11:00', close: '22:00' },
      thursday: { open: '11:00', close: '22:00' },
      friday: { open: '11:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
      sunday: { open: '12:00', close: '21:00' }
    },
    socialMedia: {
      instagram: 'https://instagram.com/marios_kitchen',
      facebook: 'https://facebook.com/marios.kitchen.nyc'
    },
    images: ['restaurant1.jpg', 'interior1.jpg', 'food1.jpg'],
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// GET /api/restaurants/[id] - Get specific restaurant
export const GET = requireAuth(async (request: NextRequest, user: User) => {
  try {
    // Extract restaurant ID from URL
    const url = new URL(request.url);
    const restaurantId = url.pathname.split('/').pop();
    
    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant ID is required'
      }, { status: 400 });
    }

    // Find restaurant and verify ownership
    const restaurant = mockRestaurants.find(r => r.id === restaurantId);
    
    if (!restaurant) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant not found'
      }, { status: 404 });
    }

    // Check if user owns this restaurant (or is admin)
    if (restaurant.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant retrieved successfully',
      data: restaurant
    });

  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// PUT /api/restaurants/[id] - Update specific restaurant
export const PUT = requireAuth(async (request: NextRequest, user: User) => {
  try {
    // Extract restaurant ID from URL
    const url = new URL(request.url);
    const restaurantId = url.pathname.split('/').pop();
    
    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant ID is required'
      }, { status: 400 });
    }

    const body = await request.json();
    
    // Validate input
    const validation = validateInput(updateRestaurantSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid restaurant data',
        details: validation.errors
      }, { status: 400 });
    }

    const updateData = validation.data;
    if (!updateData) {
      return NextResponse.json({
        success: false,
        error: 'No update data provided'
      }, { status: 400 });
    }

    // Find restaurant and verify ownership
    const restaurant = mockRestaurants.find(r => r.id === restaurantId);
    
    if (!restaurant) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant not found'
      }, { status: 404 });
    }

    // Check if user owns this restaurant (or is admin)
    if (restaurant.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // In a real app, you would:
    // 1. Update the restaurant in the database
    // 2. Handle image uploads/deletions
    // 3. Validate business rules
    // 4. Send notifications if status changed
    // 5. Update search indexes

    const updatedRestaurant = {
      ...restaurant,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Mock update operation
    console.log(`Updating restaurant ${restaurantId} for user ${user.id}:`, updateData);

    return NextResponse.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: updatedRestaurant
    });

  } catch (error) {
    console.error('Update restaurant error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// DELETE /api/restaurants/[id] - Delete specific restaurant
export const DELETE = requireAuth(async (request: NextRequest, user: User) => {
  try {
    // Extract restaurant ID from URL
    const url = new URL(request.url);
    const restaurantId = url.pathname.split('/').pop();
    
    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant ID is required'
      }, { status: 400 });
    }

    // Find restaurant and verify ownership
    const restaurant = mockRestaurants.find(r => r.id === restaurantId);
    
    if (!restaurant) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant not found'
      }, { status: 404 });
    }

    // Check if user owns this restaurant (or is admin)
    if (restaurant.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // In a real app, you would:
    // 1. Check if restaurant has active orders/reservations
    // 2. Archive or soft-delete instead of hard delete
    // 3. Clean up associated data (menus, reviews, etc.)
    // 4. Cancel any active subscriptions/services
    // 5. Remove from search indexes
    // 6. Send confirmation email

    // Mock deletion operation
    console.log(`Deleting restaurant ${restaurantId} for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Restaurant deleted successfully',
      data: {
        id: restaurantId,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Delete restaurant error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 