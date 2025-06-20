import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth';
import { ERROR_MESSAGES } from '../../../../lib/validation';
import { User } from '../../../../types/auth';

interface SystemSettings {
  general: {
    platformName: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    trialDuration: number; // in days
    maxUsersPerTrial: number;
  };
  api: {
    rateLimit: {
      enabled: boolean;
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    keys: {
      openaiEnabled: boolean;
      stripeEnabled: boolean;
      livekitEnabled: boolean;
      twilioEnabled: boolean;
    };
  };
  features: {
    voiceProcessing: boolean;
    recipeGeneration: boolean;
    menuPlanning: boolean;
    inventoryTracking: boolean;
    nutritionAnalysis: boolean;
    costCalculation: boolean;
  };
  billing: {
    currency: string;
    trialPrice: number;
    monthlyPrice: number;
    yearlyPrice: number;
    yearlyDiscount: number; // percentage
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    webhookUrl?: string;
    slackWebhook?: string;
  };
  security: {
    passwordMinLength: number;
    sessionTimeout: number; // in minutes
    maxLoginAttempts: number;
    requireEmailVerification: boolean;
    twoFactorEnabled: boolean;
  };
}

// Mock settings data (in a real app, this would be stored in database)
const defaultSettings: SystemSettings = {
  general: {
    platformName: 'ChefSocial Voice',
    maintenanceMode: false,
    registrationEnabled: true,
    trialDuration: 14,
    maxUsersPerTrial: 1000
  },
  api: {
    rateLimit: {
      enabled: true,
      requestsPerMinute: 100,
      requestsPerHour: 1000
    },
    keys: {
      openaiEnabled: true,
      stripeEnabled: true,
      livekitEnabled: true,
      twilioEnabled: false
    }
  },
  features: {
    voiceProcessing: true,
    recipeGeneration: true,
    menuPlanning: true,
    inventoryTracking: false,
    nutritionAnalysis: true,
    costCalculation: true
  },
  billing: {
    currency: 'USD',
    trialPrice: 0,
    monthlyPrice: 29,
    yearlyPrice: 290,
    yearlyDiscount: 17 // ~2 months free
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    webhookUrl: '',
    slackWebhook: ''
  },
  security: {
    passwordMinLength: 8,
    sessionTimeout: 60, // 1 hour
    maxLoginAttempts: 5,
    requireEmailVerification: true,
    twoFactorEnabled: false
  }
};

// GET /api/admin/settings - Get system settings (admin only)
export const GET = requireRole(['admin'])(async (request: NextRequest, user: User) => {
  try {
    const { searchParams } = request.nextUrl;
    const section = searchParams.get('section'); // specific section to retrieve
    
    if (section) {
      // Return specific section
      const sectionData = (defaultSettings as any)[section];
      if (!sectionData) {
        return NextResponse.json({
          success: false,
          error: 'Invalid settings section'
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        message: `${section} settings retrieved successfully`,
        data: { [section]: sectionData }
      });
    }
    
    // Return all settings
    return NextResponse.json({
      success: true,
      message: 'System settings retrieved successfully',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Admin get settings error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// PUT /api/admin/settings - Update system settings (admin only)
export const PUT = requireRole(['admin'])(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    const { section, settings } = body;
    
    if (!section || !settings) {
      return NextResponse.json({
        success: false,
        error: 'Section and settings are required'
      }, { status: 400 });
    }
    
    // Validate section exists
    if (!(section in defaultSettings)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid settings section'
      }, { status: 400 });
    }
    
    // In a real app, you would:
    // 1. Validate the settings against a schema
    // 2. Update the database
    // 3. Potentially restart services if needed
    // 4. Log the change for audit purposes
    
    // For now, we'll just simulate the update
    const updatedSettings = {
      ...defaultSettings,
      [section]: {
        ...(defaultSettings as any)[section],
        ...settings
      }
    };
    
    // Log the change (in a real app, this would go to an audit log)
    console.log(`Admin ${user.email} updated ${section} settings:`, settings);
    
    return NextResponse.json({
      success: true,
      message: `${section} settings updated successfully`,
      data: { [section]: updatedSettings[section as keyof SystemSettings] }
    });

  } catch (error) {
    console.error('Admin update settings error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// POST /api/admin/settings/reset - Reset settings to defaults (admin only)
export const POST = requireRole(['admin'])(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    const { section } = body;
    
    if (section && !(section in defaultSettings)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid settings section'
      }, { status: 400 });
    }
    
    // Log the reset action
    console.log(`Admin ${user.email} reset ${section || 'all'} settings to defaults`);
    
    if (section) {
      return NextResponse.json({
        success: true,
        message: `${section} settings reset to defaults`,
        data: { [section]: (defaultSettings as any)[section] }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'All settings reset to defaults',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Admin reset settings error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 