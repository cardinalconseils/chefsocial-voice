import { z } from 'zod';

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email is too long');

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Name validation schema  
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Restaurant name validation schema
export const restaurantNameSchema = z
  .string()
  .min(1, 'Restaurant name is required')
  .max(100, 'Restaurant name is too long');

// Phone validation schema (optional)
export const phoneSchema = z
  .string()
  .optional()
  .refine((phone: string | undefined) => {
    if (!phone) return true; // Optional field
    return /^\+?[\d\s\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 7;
  }, 'Invalid phone number format');

// Location validation schema (optional)
export const locationSchema = z
  .string()
  .max(200, 'Location is too long')
  .optional();

// Cuisine type validation schema (optional)
export const cuisineTypeSchema = z
  .string()
  .max(50, 'Cuisine type is too long')
  .optional();

// Login request validation
export const loginRequestSchema = z.object({
  action: z.literal('login'),
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

// Registration request validation
export const registerRequestSchema = z.object({
  action: z.literal('register'),
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  restaurantName: restaurantNameSchema,
  cuisineType: cuisineTypeSchema,
  location: locationSchema,
  phone: phoneSchema,
  marketingConsent: z.boolean().optional().default(false)
});

// Auth request validation (union of login and register)
export const authRequestSchema = z.discriminatedUnion('action', [
  loginRequestSchema,
  registerRequestSchema
]);

// Refresh token request validation
export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// User profile update validation
export const userProfileUpdateSchema = z.object({
  name: nameSchema.optional(),
  restaurantName: restaurantNameSchema.optional(),
  cuisineType: cuisineTypeSchema,
  location: locationSchema,
  phone: phoneSchema,
  marketingConsent: z.boolean().optional()
}).refine(
  (data: Record<string, any>) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one field must be provided for update' }
);

// User ID validation
export const userIdSchema = z.string()
  .min(1, 'User ID is required')
  .regex(/^user_\d+_[a-zA-Z0-9]+$/, 'Invalid user ID format');

// Role validation
export const roleSchema = z.enum(['user', 'admin', 'moderator']);

// Subscription status validation
export const subscriptionStatusSchema = z.enum([
  'trialing', 'active', 'past_due', 'canceled', 'unpaid'
]);

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
});

// Rate limiting validation helpers
export const rateLimitKeySchema = z.string().min(1).max(255);

// Generic ID validation
export const idSchema = z.string().min(1, 'ID is required');

// Validation utility functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}

// Sanitization helpers
export function sanitizeString(input: string | undefined | null): string {
  if (!input) return '';
  return input.trim().replace(/\s+/g, ' ');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Password strength validation
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  if (password.length >= 12) score += 1;
  
  return { score, feedback };
}

// Common error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  INVALID_PHONE: 'Please enter a valid phone number',
  MAX_LENGTH_EXCEEDED: 'Input is too long',
  INVALID_FORMAT: 'Invalid format',
  USER_EXISTS: 'A user with this email already exists',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again.'
} as const; 