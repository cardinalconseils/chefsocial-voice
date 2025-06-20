import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { validateInput, paginationSchema, ERROR_MESSAGES } from '../../../lib/validation';
import { User } from '../../../types/auth';
import { z } from 'zod';

interface Restaurant {
  id: string;
  userId: string;
  name: string;
  cuisine: string;
  location: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  capacity?: number;
  priceRange: 'budget' | 'moderate' | 'upscale' | 'fine-dining';
  features: string[];
  operatingHours: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  images?: string[];
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

const createRestaurantSchema = z.object({
  name: z.string().min(1).max(200),
  cuisine: z.string().min(1).max(50),
  location: z.string().min(1).max(100),
  address: z.string().min(1).max(300).optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/).optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  capacity: z.number().min(1).max(1000).optional(),
  priceRange: z.enum(['budget', 'moderate', 'upscale', 'fine-dining']),
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
  }).optional()
});

const updateRestaurantSchema = createRestaurantSchema.partial();

// Mock restaurant data
const mockRestaurants: Restaurant[] = [
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
  },
  {
    id: 'rest_002',
    userId: 'user_002',
    name: 'Sarah\'s Bistro',
    cuisine: 'French',
    location: 'San Francisco, CA',
    address: '456 Union Square, San Francisco, CA 94108',
    phone: '+1 (415) 555-0456',
    website: 'https://sarahs-bistro.com',
    description: 'Classic French bistro with modern touches',
    capacity: 45,
    priceRange: 'upscale',
    features: ['brunch', 'wine-pairing', 'chef-table'],
    operatingHours: {
      monday: { closed: true, open: '', close: '' },
      tuesday: { open: '17:00', close: '22:00' },
      wednesday: { open: '17:00', close: '22:00' },
      thursday: { open: '17:00', close: '22:00' },
      friday: { open: '17:00', close: '23:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '21:00' }
    },
    status: 'active',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// GET /api/restaurants - List user's restaurants
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
    const status = searchParams.get('status');
    const cuisine = searchParams.get('cuisine');
    const location = searchParams.get('location');
    
    // Filter restaurants for current user
    let userRestaurants = mockRestaurants.filter(restaurant => restaurant.userId === user.id);
    
    // Apply additional filters
    if (status) {
      userRestaurants = userRestaurants.filter(restaurant => restaurant.status === status);
    }
    
    if (cuisine) {
      userRestaurants = userRestaurants.filter(restaurant => 
        restaurant.cuisine.toLowerCase().includes(cuisine.toLowerCase())
      );
    }
    
    if (location) {
      userRestaurants = userRestaurants.filter(restaurant => 
        restaurant.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    // Apply pagination
    const total = userRestaurants.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedRestaurants = userRestaurants.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      message: 'Restaurants retrieved successfully',
      data: {
        restaurants: paginatedRestaurants,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    });

  } catch (error) {
    console.error('List restaurants error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// POST /api/restaurants - Create new restaurant
export const POST = requireAuth(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateInput(createRestaurantSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid restaurant data',
        details: validation.errors
      }, { status: 400 });
    }

    const restaurantData = validation.data;
    if (!restaurantData) {
      return NextResponse.json({
        success: false,
        error: 'No restaurant data provided'
      }, { status: 400 });
    }

    // In a real app, you would:
    // 1. Check if user has reached restaurant limit based on subscription
    // 2. Validate unique restaurant name within user's account
    // 3. Geocode the address for location services
    // 4. Upload and process images
    // 5. Send notification to admin for review if needed

    const newRestaurant: Restaurant = {
      id: `rest_${Date.now()}`,
      userId: user.id,
      ...restaurantData,
      features: restaurantData.features || [],
      operatingHours: restaurantData.operatingHours || {
        monday: { open: '09:00', close: '21:00' },
        tuesday: { open: '09:00', close: '21:00' },
        wednesday: { open: '09:00', close: '21:00' },
        thursday: { open: '09:00', close: '21:00' },
        friday: { open: '09:00', close: '22:00' },
        saturday: { open: '09:00', close: '22:00' },
        sunday: { open: '10:00', close: '20:00' }
      },
      images: [],
      status: 'pending', // New restaurants start as pending
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Mock creation (in real app, save to database)
    console.log(`Creating restaurant for user ${user.id}:`, newRestaurant);

    return NextResponse.json({
      success: true,
      message: 'Restaurant created successfully',
      data: newRestaurant
    }, { status: 201 });

  } catch (error) {
    console.error('Create restaurant error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// PUT /api/restaurants/[id] - Update restaurant (handled in dynamic route)
// DELETE /api/restaurants/[id] - Delete restaurant (handled in dynamic route) 