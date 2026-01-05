/**
 * In-memory rate limiter using sliding window algorithm
 * Suitable for single-server deployments (Coolify self-hosted)
 *
 * For multi-server deployments, consider using Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup(windowMs: number) {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.firstRequest > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Prevent timer from blocking process exit
  cleanupTimer.unref?.();
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with success status and rate limit info
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const { windowMs, maxRequests } = config;

  startCleanup(windowMs);

  const entry = rateLimitStore.get(identifier);

  // First request or window expired
  if (!entry || now - entry.firstRequest >= windowMs) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstRequest: now,
    });

    return {
      success: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Within window
  if (entry.count < maxRequests) {
    entry.count += 1;
    rateLimitStore.set(identifier, entry);

    return {
      success: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.firstRequest + windowMs,
    };
  }

  // Rate limited
  const retryAfter = Math.ceil((entry.firstRequest + windowMs - now) / 1000);

  return {
    success: false,
    remaining: 0,
    resetAt: entry.firstRequest + windowMs,
    retryAfter,
  };
}

/**
 * Get client IP from request headers
 * Works with Cloudflare, nginx, and direct connections
 */
export function getClientIp(request: Request): string {
  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Standard proxy headers
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Get the first IP in the chain (original client)
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp;

  // Fallback
  return "unknown";
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // Auth endpoints: 5 attempts per minute (strict for login/register)
  auth: { windowMs: 60 * 1000, maxRequests: 5 },

  // Password reset: 3 attempts per 15 minutes (very strict)
  passwordReset: { windowMs: 15 * 60 * 1000, maxRequests: 3 },

  // Magic link: 3 attempts per 10 minutes
  magicLink: { windowMs: 10 * 60 * 1000, maxRequests: 3 },

  // API endpoints: 100 requests per minute (general)
  api: { windowMs: 60 * 1000, maxRequests: 100 },

  // Strict endpoints: 10 requests per minute
  strict: { windowMs: 60 * 1000, maxRequests: 10 },
};

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: `Please try again in ${retryAfter} seconds`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  resetAt: number
): Response {
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  return response;
}
