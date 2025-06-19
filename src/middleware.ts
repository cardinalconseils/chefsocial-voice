import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMITS = {
  // Users: 100 requests per minute
  user: {
    requests: 100,
    windowMs: 60 * 1000 // 1 minute
  },
  // Admins: 1000 requests per minute (detected by header)
  admin: {
    requests: 1000,
    windowMs: 60 * 1000 // 1 minute
  },
  // Anonymous users: 20 requests per minute
  anonymous: {
    requests: 20,
    windowMs: 60 * 1000 // 1 minute
  },
  // Auth endpoints: stricter limits
  auth: {
    requests: 10,
    windowMs: 60 * 1000 // 1 minute
  }
};

// In-memory rate limiting store (Edge Runtime compatible)
// Note: This resets on server restart, which is fine for development
const rateStore = new Map<string, { requests: number; windowStart: number }>();

// Rate limiting service
class RateLimitService {
  checkRateLimit(key: string, limit: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    try {
      const now = Date.now();
      const rateLimitData = rateStore.get(key);
      
      if (!rateLimitData) {
        // First request for this key
        rateStore.set(key, { requests: 1, windowStart: now });
        return {
          allowed: true,
          remaining: limit - 1,
          resetTime: now + windowMs
        };
      }

      const { requests, windowStart } = rateLimitData;
      const windowEnd = windowStart + windowMs;

      if (now > windowEnd) {
        // Window has expired, reset counter
        rateStore.set(key, { requests: 1, windowStart: now });
        return {
          allowed: true,
          remaining: limit - 1,
          resetTime: now + windowMs
        };
      }

      if (requests >= limit) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowEnd
        };
      }

      // Increment counter
      rateStore.set(key, { requests: requests + 1, windowStart });
      return {
        allowed: true,
        remaining: limit - requests - 1,
        resetTime: windowEnd
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + windowMs
      };
    }
  }

  getClientIdentifier(request: NextRequest): string {
    // Try to get IP from various headers (for production with load balancer)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || 'unknown';
    
    return clientIp;
  }

  getUserTier(request: NextRequest): 'admin' | 'user' | 'anonymous' {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return 'anonymous';
      }

      // For Edge Runtime, we can't decode JWT here
      // We'll just treat authenticated requests as 'user' tier
      // Actual user role verification happens in API routes
      return 'user';
    } catch (error) {
      return 'anonymous';
    }
  }

  getRateLimitConfig(tier: string, isAuthEndpoint: boolean = false) {
    if (isAuthEndpoint) return RATE_LIMITS.auth;
    return RATE_LIMITS[tier as keyof typeof RATE_LIMITS] || RATE_LIMITS.anonymous;
  }

  // Cleanup old entries to prevent memory leaks
  cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, data] of rateStore.entries()) {
      if (now - data.windowStart > maxAge) {
        rateStore.delete(key);
      }
    }
  }
}

const rateLimitService = new RateLimitService();

// Cleanup every 5 minutes
setInterval(() => {
  rateLimitService.cleanup();
}, 5 * 60 * 1000);

// Main middleware function
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip rate limiting for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Apply rate limiting to API routes only
  if (pathname.startsWith('/api/')) {
    return applyRateLimit(request);
  }

  // Continue without rate limiting for other routes
  return NextResponse.next();
}

function applyRateLimit(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  
  try {
    // Get client identifier
    const clientId = rateLimitService.getClientIdentifier(request);
    
    // Get user tier (simplified for Edge Runtime)
    const userTier = rateLimitService.getUserTier(request);
    
    // Check if this is an auth endpoint
    const isAuthEndpoint = pathname.startsWith('/api/auth');
    
    // Get rate limit configuration
    const config = rateLimitService.getRateLimitConfig(userTier, isAuthEndpoint);
    
    // Create rate limit key
    const rateLimitKey = `${userTier}:${clientId}:${isAuthEndpoint ? 'auth' : 'api'}`;
    
    // Check rate limit
    const result = rateLimitService.checkRateLimit(
      rateLimitKey,
      config.requests,
      config.windowMs
    );
    
    // Create response
    const response = result.allowed ? NextResponse.next() : new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${Math.ceil(config.windowMs / 1000)} seconds.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      }),
      { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', config.requests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    response.headers.set('X-RateLimit-Policy', `${config.requests};w=${config.windowMs / 1000}`);
    
    if (!result.allowed) {
      response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
      console.warn(`Rate limit exceeded for ${rateLimitKey} on ${pathname}`);
    }
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to continue
    return NextResponse.next();
  }
}

// Configuration for Next.js middleware
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (internal API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 