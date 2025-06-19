import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../lib/database';
import { authService, requireAuth, requireRole } from '../../../lib/auth';
import { validateInput, userProfileUpdateSchema, userIdSchema, ERROR_MESSAGES } from '../../../lib/validation';

// GET /api/user - Get current user profile
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const publicUser = authService.toPublicUser(user);
    
    return NextResponse.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: publicUser
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// PUT /api/user - Update current user profile
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    
    // Validate the update data
    const validation = validateInput(userProfileUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    const updateData = validation.data!;

    // Update user in database
    const updatedUser = database.updateUser(user.id, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    if (!updatedUser) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.USER_NOT_FOUND
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: authService.toPublicUser(updatedUser)
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// DELETE /api/user - Delete current user account
export const DELETE = requireAuth(async (request: NextRequest, user) => {
  try {
    // TODO: Implement user account deletion
    // This should include:
    // 1. Cancel Stripe subscription
    // 2. Delete user data
    // 3. Revoke all tokens
    // 4. Optionally anonymize data for legal compliance
    
    // For now, return not implemented
    return NextResponse.json({
      success: false,
      error: 'Account deletion not yet implemented',
      message: 'Please contact support to delete your account'
    }, { status: 501 });

  } catch (error) {
    console.error('Delete user account error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 