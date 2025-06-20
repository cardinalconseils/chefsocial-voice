import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { validateInput, ERROR_MESSAGES } from '../../../../lib/validation';
import { User } from '../../../../types/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  restaurantName: z.string().min(1).max(200).optional(),
  cuisine: z.string().min(1).max(50).optional(),
  location: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  preferences: z.object({
    language: z.enum(['en', 'fr', 'es', 'it']).optional(),
    notifications: z.boolean().optional(),
    publicProfile: z.boolean().optional()
  }).optional()
});

// GET /api/user/profile - Get current user's profile
export const GET = requireAuth(async (request: NextRequest, user: User) => {
  try {
    // In a real app, you would fetch additional profile data from the database
    // For now, we'll return the user data with some mock additional fields
    
    const profileData = {
      id: user.id,
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      restaurantName: user.restaurantName || '',
      role: user.role,
      subscription: user.subscriptionStatus,
      createdAt: user.createdAt,
      
      // Additional profile fields (would come from a profiles table)
      cuisine: 'Italian', // Mock data
      location: 'New York, NY',
      phone: '+1 (555) 123-4567',
      bio: 'Passionate chef with 10+ years of experience in Italian cuisine.',
      website: 'https://example-restaurant.com',
      
      // User preferences
      preferences: {
        language: 'en',
        notifications: true,
        publicProfile: false
      },
      
      // Usage statistics
      stats: {
        totalRecipes: 25,
        totalMenus: 8,
        voiceMinutesUsed: 145,
        lastActive: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profileData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// PUT /api/user/profile - Update current user's profile
export const PUT = requireAuth(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateInput(updateProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid profile data',
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

    // In a real app, you would:
    // 1. Update the users table with basic info
    // 2. Update/create a user_profiles table with extended info
    // 3. Handle file uploads for profile pictures
    // 4. Validate business rules (e.g., unique restaurant names)

    // Mock update operation
    console.log(`Updating profile for user ${user.id}:`, updateData);

    // Return updated profile data
    const updatedProfile = {
      id: user.id,
      email: user.email,
      displayName: updateData.displayName || user.name,
      restaurantName: updateData.restaurantName || user.restaurantName,
      role: user.role,
      subscription: user.subscriptionStatus,
      
      // Updated fields
      cuisine: updateData.cuisine || 'Italian',
      location: updateData.location || 'New York, NY',
      phone: updateData.phone || '+1 (555) 123-4567',
      bio: updateData.bio || 'Passionate chef with 10+ years of experience.',
      website: updateData.website || 'https://example-restaurant.com',
      preferences: {
        ...updateData.preferences,
        language: updateData.preferences?.language || 'en',
        notifications: updateData.preferences?.notifications ?? true,
        publicProfile: updateData.preferences?.publicProfile ?? false
      },
      
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 