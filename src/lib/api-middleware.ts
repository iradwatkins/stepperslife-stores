/**
 * API Middleware Utilities
 *
 * Combines rate limiting, circuit breaker, and logging for API routes.
 * Provides a consistent pattern for all payment and protected endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  rateLimiters,
  createRateLimitResponse,
  addRateLimitHeaders,
} from "./rate-limit";
import {
  canRequest,
  recordSuccess,
  recordFailure,
  circuitBreakers,
  createCircuitOpenResponse,
  isCircuitBreakerError,
  type CircuitState,
} from "./circuit-breaker";
import {
  createRequestLogger,
  generateCorrelationId,
  addCorrelationHeader,
  type LogContext,
} from "./logger";

export interface ApiMiddlewareOptions {
  // Rate limiting
  rateLimit?: keyof typeof rateLimiters | false;
  rateLimitKey?: string; // Custom key prefix (e.g., "user:123")

  // Circuit breaker
  circuitBreaker?: keyof typeof circuitBreakers | false;

  // Logging
  service: string;
  operation: string;
}

export interface ApiContext {
  correlationId: string;
  clientIp: string;
  startTime: number;
  logger: ReturnType<typeof import("./logger").createLogger>;
}

/**
 * Create standardized API context with logging and correlation
 */
export async function createApiContext(
  request: NextRequest,
  options: ApiMiddlewareOptions
): Promise<ApiContext> {
  const correlationId = request.headers.get("x-correlation-id") ||
                        request.headers.get("x-request-id") ||
                        generateCorrelationId();
  const clientIp = getClientIp(request);
  const logger = await createRequestLogger(options.service, request);

  return {
    correlationId,
    clientIp,
    startTime: Date.now(),
    logger: logger.child({ correlationId }),
  };
}

/**
 * Apply rate limiting to a request
 * Returns null if allowed, Response if rate limited
 */
export function applyRateLimit(
  request: NextRequest,
  options: ApiMiddlewareOptions,
  context: ApiContext
): Response | null {
  if (options.rateLimit === false) return null;

  const rateLimiterKey = options.rateLimit || "api";
  const config = rateLimiters[rateLimiterKey];
  const identifier = options.rateLimitKey
    ? `${options.rateLimitKey}:${context.clientIp}`
    : context.clientIp;

  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    context.logger.warn("Rate limit exceeded", {
      rateLimiter: rateLimiterKey,
      retryAfter: result.retryAfter,
    });
    return createRateLimitResponse(result.retryAfter!);
  }

  return null;
}

/**
 * Check if circuit breaker allows the request
 * Returns null if allowed, Response if circuit is open
 */
export function checkCircuitBreaker(
  options: ApiMiddlewareOptions,
  context: ApiContext
): Response | null {
  if (options.circuitBreaker === false) return null;

  const breaker = options.circuitBreaker
    ? circuitBreakers[options.circuitBreaker]
    : null;

  if (!breaker) return null;

  if (!canRequest(breaker.name, breaker)) {
    context.logger.warn("Circuit breaker open", {
      circuit: breaker.name,
    });
    return createCircuitOpenResponse(breaker.name);
  }

  return null;
}

/**
 * Record circuit breaker result
 */
export function recordCircuitResult(
  options: ApiMiddlewareOptions,
  success: boolean,
  error?: Error
): void {
  if (options.circuitBreaker === false) return;

  const breaker = options.circuitBreaker
    ? circuitBreakers[options.circuitBreaker]
    : null;

  if (!breaker) return;

  if (success) {
    recordSuccess(breaker.name, breaker);
  } else if (error && isCircuitBreakerError(error)) {
    recordFailure(breaker.name, breaker, error);
  }
}

/**
 * Create success response with standard headers
 */
export function createSuccessResponse(
  data: unknown,
  context: ApiContext,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  addCorrelationHeader(response, context.correlationId);

  const duration = Date.now() - context.startTime;
  context.logger.info("Request completed", { durationMs: duration, status });

  return response;
}

/**
 * Create error response with standard headers and logging
 */
export function createErrorResponse(
  error: unknown,
  context: ApiContext,
  options: ApiMiddlewareOptions,
  defaultMessage: string = "An error occurred"
): NextResponse {
  const err = error instanceof Error ? error : new Error(String(error));
  const duration = Date.now() - context.startTime;

  // Record circuit breaker failure if applicable
  recordCircuitResult(options, false, err);

  // Determine status code
  let status = 500;
  let message = defaultMessage;
  let code: string | undefined;

  if ((err as any).statusCode) {
    status = (err as any).statusCode;
  } else if ((err as any).status) {
    status = (err as any).status;
  } else if ((err as any).code === "CIRCUIT_OPEN") {
    status = 503;
    message = "Service temporarily unavailable";
    code = "CIRCUIT_OPEN";
  }

  // Don't expose internal error messages in production
  if (process.env.NODE_ENV === "production" && status >= 500) {
    message = defaultMessage;
  } else {
    message = err.message || defaultMessage;
  }

  context.logger.error("Request failed", err, {
    durationMs: duration,
    status,
    code: (err as any).code,
  });

  const response = NextResponse.json(
    {
      error: message,
      code,
      correlationId: context.correlationId,
    },
    { status }
  );

  addCorrelationHeader(response, context.correlationId);
  return response;
}

/**
 * Wrap an API handler with middleware
 * Applies rate limiting, circuit breaker, and logging automatically
 */
export function withApiMiddleware<T>(
  options: ApiMiddlewareOptions,
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = await createApiContext(request, options);

    try {
      // Apply rate limiting
      const rateLimitResponse = applyRateLimit(request, options, context);
      if (rateLimitResponse) {
        return rateLimitResponse as NextResponse;
      }

      // Check circuit breaker
      const circuitResponse = checkCircuitBreaker(options, context);
      if (circuitResponse) {
        return circuitResponse as NextResponse;
      }

      // Log request start
      context.logger.debug(`${options.operation} started`);

      // Execute handler
      const response = await handler(request, context);

      // Record circuit breaker success
      recordCircuitResult(options, true);

      return response;
    } catch (error) {
      return createErrorResponse(error, context, options, `${options.operation} failed`);
    }
  };
}

/**
 * Extract common payment request fields for logging
 */
export function extractPaymentContext(body: any): LogContext {
  return {
    orderId: body.orderId,
    vendorId: body.vendorId,
    amount: body.amount,
    currency: body.currency || "usd",
    customerEmail: body.customerEmail,
  };
}
