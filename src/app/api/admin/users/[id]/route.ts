import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/database-postgres';
import { authService, requireRole } from '../../../../../lib/auth';
import { validateInput, userIdSchema, ERROR_MESSAGES } from '../../../../../lib/validation';
import { User } from '../../../../../types/auth';

// GET /api/admin/users/[id] - Get specific user (admin only)
export const GET = requireRole(['admin'])(async (request: NextRequest, adminUser: User) => {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    // Validate user ID
    const validation = validateInput(userIdSchema, { id });
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID',
        details: validation.errors
      }, { status: 400 });
    }

    // Get user from database
    const targetUser = await db.getUserById(id);
    
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Convert to public format
    const publicUser = authService.toPublicUser(targetUser);
    
    return NextResponse.json({
      success: true,
      message: 'User retrieved successfully',
      data: { user: publicUser }
    });

  } catch (error) {
    console.error('Admin get user error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// PUT /api/admin/users/[id] - Update specific user (admin only)
export const PUT = requireRole(['admin'])(async (request: NextRequest, adminUser: User) => {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    // Validate user ID
    const validation = validateInput(userIdSchema, { id });
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID',
        details: validation.errors
      }, { status: 400 });
    }

    // Get request body
    const body = await request.json();
    const { 
      name, 
      restaurantName, 
      cuisineType, 
      location, 
      phone, 
      role, 
      subscriptionStatus, 
      emailVerified,
      onboardingCompleted 
    } = body;

    // Build updates object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (restaurantName !== undefined) updates.restaurantName = restaurantName;
    if (cuisineType !== undefined) updates.cuisineType = cuisineType;
    if (location !== undefined) updates.location = location;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (subscriptionStatus !== undefined) updates.subscriptionStatus = subscriptionStatus;
    if (emailVerified !== undefined) updates.emailVerified = emailVerified;
    if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;

    // Update user
    const updatedUser = await db.updateUser(id, updates);
    
    if (!updatedUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Convert to public format
    const publicUser = authService.toPublicUser(updatedUser);
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: { user: publicUser }
    });

  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// DELETE /api/admin/users/[id] - Delete specific user (admin only)
export const DELETE = requireRole(['admin'])(async (request: NextRequest, adminUser: User) => {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    // Validate user ID
    const validation = validateInput(userIdSchema, { id });
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID',
        details: validation.errors
      }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (id === adminUser.id) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete your own admin account'
      }, { status: 400 });
    }

    // Delete user
    const deleted = await db.deleteUser(id);
    
    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 