/**
 * Payment Utility Functions
 *
 * Shared utilities for payment processing to reduce code duplication
 * and ensure consistent behavior across payment APIs
 *
 * Note: As of the Stripe-only migration, all payments go through Stripe
 * (Card + Cash App Pay) or Cash (physical USD at door)
 */

import { PRICING, CURRENCIES } from '../constants/payment';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PaymentAmount {
  cents: number;
  dollars: string;
  currency: string;
}

export interface PaymentError {
  message: string;
  code?: string;
  details?: unknown;
}

// ============================================================================
// Amount Conversion Utilities
// ============================================================================

/**
 * Convert cents to dollars with proper formatting
 */
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Calculate credit purchase amount
 */
export function calculateCreditAmount(credits: number): number {
  return credits * PRICING.PRICE_PER_TICKET_CENTS;
}

/**
 * Create payment amount object
 */
export function createPaymentAmount(
  cents: number,
  currency: string = CURRENCIES.DEFAULT
): PaymentAmount {
  return {
    cents,
    dollars: centsToDollars(cents),
    currency,
  };
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
}

/**
 * Create standardized payment error object
 */
export function createPaymentError(
  message: string,
  code?: string,
  details?: unknown
): PaymentError {
  return {
    message,
    code,
    details,
  };
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('timeout');
  }
  return false;
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Log payment event with structured data
 */
export function logPaymentEvent(
  prefix: string,
  event: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const requestId = generateRequestId();

  console.log(
    JSON.stringify({
      timestamp,
      requestId,
      prefix,
      event,
      ...data,
    })
  );
}

/**
 * Log payment error with context
 */
export function logPaymentError(
  prefix: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = extractErrorMessage(error);

  console.error(
    JSON.stringify({
      timestamp,
      prefix,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    })
  );
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate payment amount is within acceptable range
 */
export function isValidPaymentAmount(cents: number): boolean {
  return (
    Number.isInteger(cents) &&
    cents > 0 &&
    cents <= 10000000 // $100,000 max
  );
}

/**
 * Validate credit amount
 */
export function isValidCreditAmount(credits: number): boolean {
  return Number.isInteger(credits) && credits >= 100 && credits <= 10000;
}

/**
 * Validate currency code
 */
export function isValidCurrency(currency: string): boolean {
  return CURRENCIES.SUPPORTED.includes(currency as any);
}

// ============================================================================
// Idempotency Utilities
// ============================================================================

/**
 * Generate idempotency key from request data
 * Useful for preventing duplicate payments
 */
export function generateIdempotencyKey(data: Record<string, unknown>): string {
  // Use Web Crypto API for browser compatibility
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  // Simple hash alternative for browser environments
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// Response Formatting
// ============================================================================

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): { success: true; data: T; message?: string } {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  details?: unknown
): { success: false; error: string; details?: unknown } {
  const response: { success: false; error: string; details?: unknown } = {
    success: false,
    error,
  };

  if (details !== undefined) {
    response.details = details;
  }

  return response;
}

// ============================================================================
// Environment Validation
// ============================================================================

/**
 * Validate required environment variables are set
 */
export function validatePaymentEnvironment(): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_CONVEX_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
