import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { validateInput, ERROR_MESSAGES } from '../../../../lib/validation';
import { User } from '../../../../types/auth';
import { z } from 'zod';

interface UserSettings {
  id: string;
  userId: string;
  preferences: {
    language: 'en' | 'fr' | 'es' | 'it';
    timezone: string;
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
    theme: 'light' | 'dark' | 'auto';
  };
  notifications: {
    email: {
      marketing: boolean;
      productUpdates: boolean;
      usageAlerts: boolean;
      billingReminders: boolean;
      securityAlerts: boolean;
    };
    push: {
      enabled: boolean;
      usageAlerts: boolean;
      newFeatures: boolean;
    };
    sms: {
      enabled: boolean;
      securityAlerts: boolean;
      billingReminders: boolean;
    };
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    shareUsageData: boolean;
    allowAnalytics: boolean;
    showOnlineStatus: boolean;
  };
  voice: {
    defaultVoice: string;
    speechRate: number; // 0.5 to 2.0
    pitch: number; // 0.5 to 2.0
    volume: number; // 0.0 to 1.0
    language: string;
    quality: 'standard' | 'premium' | 'ultra';
  };
  content: {
    defaultLanguage: string;
    autoSave: boolean;
    autoSaveInterval: number; // minutes
    defaultVisibility: 'private' | 'public' | 'shared';
    enableSpellCheck: boolean;
    enableGrammarCheck: boolean;
  };
  integrations: {
    googleDrive: {
      enabled: boolean;
      folderId?: string;
    };
    dropbox: {
      enabled: boolean;
      accessToken?: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

const updateSettingsSchema = z.object({
  preferences: z.object({
    language: z.enum(['en', 'fr', 'es', 'it']).optional(),
    timezone: z.string().optional(),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'CAD']).optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional()
  }).optional(),
  notifications: z.object({
    email: z.object({
      marketing: z.boolean().optional(),
      productUpdates: z.boolean().optional(),
      usageAlerts: z.boolean().optional(),
      billingReminders: z.boolean().optional(),
      securityAlerts: z.boolean().optional()
    }).optional(),
    push: z.object({
      enabled: z.boolean().optional(),
      usageAlerts: z.boolean().optional(),
      newFeatures: z.boolean().optional()
    }).optional(),
    sms: z.object({
      enabled: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      billingReminders: z.boolean().optional()
    }).optional()
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
    shareUsageData: z.boolean().optional(),
    allowAnalytics: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional()
  }).optional(),
  voice: z.object({
    defaultVoice: z.string().optional(),
    speechRate: z.number().min(0.5).max(2.0).optional(),
    pitch: z.number().min(0.5).max(2.0).optional(),
    volume: z.number().min(0.0).max(1.0).optional(),
    language: z.string().optional(),
    quality: z.enum(['standard', 'premium', 'ultra']).optional()
  }).optional(),
  content: z.object({
    defaultLanguage: z.string().optional(),
    autoSave: z.boolean().optional(),
    autoSaveInterval: z.number().min(1).max(60).optional(),
    defaultVisibility: z.enum(['private', 'public', 'shared']).optional(),
    enableSpellCheck: z.boolean().optional(),
    enableGrammarCheck: z.boolean().optional()
  }).optional(),
  integrations: z.object({
    googleDrive: z.object({
      enabled: z.boolean().optional(),
      folderId: z.string().optional()
    }).optional(),
    dropbox: z.object({
      enabled: z.boolean().optional(),
      accessToken: z.string().optional()
    }).optional(),
    slack: z.object({
      enabled: z.boolean().optional(),
      webhookUrl: z.string().url().optional()
    }).optional()
  }).optional()
});

// Mock settings data
const getDefaultSettings = (userId: string): UserSettings => ({
  id: `settings_${userId}`,
  userId,
  preferences: {
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD',
    theme: 'light'
  },
  notifications: {
    email: {
      marketing: false,
      productUpdates: true,
      usageAlerts: true,
      billingReminders: true,
      securityAlerts: true
    },
    push: {
      enabled: true,
      usageAlerts: true,
      newFeatures: false
    },
    sms: {
      enabled: false,
      securityAlerts: false,
      billingReminders: false
    }
  },
  privacy: {
    profileVisibility: 'private',
    shareUsageData: false,
    allowAnalytics: true,
    showOnlineStatus: true
  },
  voice: {
    defaultVoice: 'en-US-Neural2-A',
    speechRate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    language: 'en-US',
    quality: 'standard'
  },
  content: {
    defaultLanguage: 'en',
    autoSave: true,
    autoSaveInterval: 5,
    defaultVisibility: 'private',
    enableSpellCheck: true,
    enableGrammarCheck: true
  },
  integrations: {
    googleDrive: {
      enabled: false
    },
    dropbox: {
      enabled: false
    },
    slack: {
      enabled: false
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// GET /api/user/settings - Get current user's settings
export const GET = requireAuth(async (request: NextRequest, user: User) => {
  try {
    // In a real app, you would fetch settings from database
    // For now, return default settings with some mock customizations
    const settings = getDefaultSettings(user.id);
    
    // Mock some user-specific customizations
    if (user.id === 'user_001') {
      settings.preferences.theme = 'dark';
      settings.voice.quality = 'premium';
      settings.notifications.email.marketing = true;
    }

    return NextResponse.json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// POST /api/user/settings - Update current user's settings
export const POST = requireAuth(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateInput(updateSettingsSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid settings data',
        details: validation.errors
      }, { status: 400 });
    }

    const updateData = validation.data;
    if (!updateData) {
      return NextResponse.json({
        success: false,
        error: 'No settings data provided'
      }, { status: 400 });
    }

    // Get current settings (in real app, from database)
    const currentSettings = getDefaultSettings(user.id);
    
    // Deep merge the updates
    const updatedSettings: UserSettings = {
      ...currentSettings,
      preferences: {
        ...currentSettings.preferences,
        ...updateData.preferences
      },
      notifications: {
        email: {
          ...currentSettings.notifications.email,
          ...updateData.notifications?.email
        },
        push: {
          ...currentSettings.notifications.push,
          ...updateData.notifications?.push
        },
        sms: {
          ...currentSettings.notifications.sms,
          ...updateData.notifications?.sms
        }
      },
      privacy: {
        ...currentSettings.privacy,
        ...updateData.privacy
      },
      voice: {
        ...currentSettings.voice,
        ...updateData.voice
      },
      content: {
        ...currentSettings.content,
        ...updateData.content
      },
      integrations: {
        googleDrive: {
          ...currentSettings.integrations.googleDrive,
          ...updateData.integrations?.googleDrive
        },
        dropbox: {
          ...currentSettings.integrations.dropbox,
          ...updateData.integrations?.dropbox
        },
        slack: {
          ...currentSettings.integrations.slack,
          ...updateData.integrations?.slack
        }
      },
      updatedAt: new Date().toISOString()
    };

    // In a real app, you would:
    // 1. Validate business rules (e.g., subscription limits for premium features)
    // 2. Update settings in database
    // 3. Invalidate relevant caches
    // 4. Update user preferences in external services
    // 5. Send confirmation email for security-related changes
    // 6. Log settings changes for audit trail

    console.log(`Updating settings for user ${user.id}:`, updateData);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
});

// DELETE /api/user/settings - Reset settings to defaults
export const DELETE = requireAuth(async (request: NextRequest, user: User) => {
  try {
    // Reset to default settings
    const defaultSettings = getDefaultSettings(user.id);

    // In a real app, you would:
    // 1. Reset settings in database
    // 2. Clear cached preferences
    // 3. Disconnect integrations safely
    // 4. Send confirmation email
    // 5. Log the reset action

    console.log(`Resetting settings to defaults for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Settings reset to defaults successfully',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Reset settings error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}); 