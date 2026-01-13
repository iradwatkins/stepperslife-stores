/**
 * Structured Logging Utility
 *
 * Provides JSON-formatted logs with correlation IDs for request tracing.
 * Designed for production debugging and log aggregation.
 */

import { headers } from "next/headers";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  vendorId?: string;
  orderId?: string;
  paymentIntentId?: string;
  service?: string;
  [key: string]: string | number | boolean | undefined;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  correlationId: string;
  environment: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    name: string;
    stack?: string;
    code?: string;
  };
}

// Generate a unique correlation ID
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// Extract or generate correlation ID from request headers
export async function getCorrelationId(request?: Request): Promise<string> {
  // Try to get from request headers first
  if (request) {
    const correlationId = request.headers.get("x-correlation-id") ||
                          request.headers.get("x-request-id");
    if (correlationId) return correlationId;
  }

  // Try Next.js headers() for server components/routes
  try {
    const headersList = await headers();
    const correlationId = headersList.get("x-correlation-id") ||
                          headersList.get("x-request-id");
    if (correlationId) return correlationId;
  } catch {
    // headers() not available in this context
  }

  // Generate new one
  return generateCorrelationId();
}

// Get client IP for logging
function getClientIp(request?: Request): string {
  if (!request) return "unknown";

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

// Environment detection
const environment = process.env.NODE_ENV || "development";
const isProduction = environment === "production";
const isDevelopment = environment === "development";

class Logger {
  private service: string;
  private defaultContext: LogContext;

  constructor(service: string, defaultContext: LogContext = {}) {
    this.service = service;
    this.defaultContext = defaultContext;
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const correlationId = context?.correlationId || this.defaultContext.correlationId || "no-correlation-id";

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      correlationId,
      environment,
    };

    // Merge contexts, filtering out undefined values
    const mergedContext = { ...this.defaultContext, ...context };
    const cleanContext: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(mergedContext)) {
      if (value !== undefined && key !== "correlationId") {
        cleanContext[key] = value;
      }
    }
    if (Object.keys(cleanContext).length > 0) {
      entry.context = cleanContext;
    }

    // Add error details if present
    if (error) {
      entry.error = {
        message: error.message,
        name: error.name,
        code: (error as any).code,
      };
      // Only include stack in development
      if (!isProduction) {
        entry.error.stack = error.stack;
      }
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    const jsonLog = JSON.stringify(entry);

    // In production, output pure JSON for log aggregation
    if (isProduction) {
      switch (entry.level) {
        case "error":
          console.error(jsonLog);
          break;
        case "warn":
          console.warn(jsonLog);
          break;
        default:
          console.log(jsonLog);
      }
    } else {
      // In development, output both human-readable and JSON
      const prefix = `[${entry.service}]`;
      const levelBadge = entry.level.toUpperCase().padEnd(5);
      const humanReadable = `${prefix} ${levelBadge} ${entry.message}`;

      switch (entry.level) {
        case "error":
          console.error(humanReadable, entry.context || "", entry.error || "");
          break;
        case "warn":
          console.warn(humanReadable, entry.context || "");
          break;
        case "debug":
          console.debug(humanReadable, entry.context || "");
          break;
        default:
          console.log(humanReadable, entry.context || "");
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (isProduction) return; // Skip debug in production
    this.output(this.formatLog("debug", message, context));
  }

  info(message: string, context?: LogContext): void {
    this.output(this.formatLog("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.output(this.formatLog("warn", message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.output(this.formatLog("error", message, context, err));
  }

  // Create a child logger with additional context
  child(additionalContext: LogContext): Logger {
    return new Logger(this.service, {
      ...this.defaultContext,
      ...additionalContext,
    });
  }
}

// Create named loggers for different services
export function createLogger(service: string, context?: LogContext): Logger {
  return new Logger(service, context);
}

// Pre-configured loggers for common services
export const loggers = {
  stripe: createLogger("Stripe"),
  paypal: createLogger("PayPal"),
  auth: createLogger("Auth"),
  webhook: createLogger("Webhook"),
  order: createLogger("Order"),
  vendor: createLogger("Vendor"),
  api: createLogger("API"),
};

/**
 * Request logging middleware helper
 * Creates a logger with request context
 */
export async function createRequestLogger(
  service: string,
  request: Request
): Promise<Logger> {
  const correlationId = await getCorrelationId(request);
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  return createLogger(service, {
    correlationId,
    clientIp,
    userAgent,
    method,
    path,
  });
}

/**
 * Add correlation ID header to response
 */
export function addCorrelationHeader(
  response: Response,
  correlationId: string
): Response {
  response.headers.set("x-correlation-id", correlationId);
  return response;
}

/**
 * Log request duration
 */
export function logDuration(
  logger: Logger,
  operation: string,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime;
  logger.info(`${operation} completed`, {
    ...context,
    durationMs: duration,
  });
}

/**
 * Wrap an async function with logging
 */
export async function withLogging<T>(
  logger: Logger,
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const startTime = Date.now();
  logger.debug(`${operation} started`, context);

  try {
    const result = await fn();
    logDuration(logger, operation, startTime, context);
    return result;
  } catch (error) {
    logger.error(`${operation} failed`, error, {
      ...context,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}
