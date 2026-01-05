/**
 * Payment API Validation Schemas
 *
 * Zod schemas for validating payment API requests
 * Ensures type safety and data integrity
 */

import { z } from 'zod';
import { LIMITS, CURRENCIES } from '../constants/payment';

/**
 * PayPal Create Order Request Schema
 */
export const paypalCreateOrderSchema = z.object({
  amount: z
    .number()
    .int('Amount must be an integer (cents)')
    .min(LIMITS.MIN_PAYMENT_AMOUNT_CENTS, `Amount must be at least ${LIMITS.MIN_PAYMENT_AMOUNT_CENTS} cents`)
    .max(LIMITS.MAX_PAYMENT_AMOUNT_CENTS, `Amount cannot exceed ${LIMITS.MAX_PAYMENT_AMOUNT_CENTS} cents`),
  currency: z
    .enum(CURRENCIES.SUPPORTED)
    .default(CURRENCIES.DEFAULT)
    .optional(),
  orderId: z
    .string()
    .min(1, 'Order ID cannot be empty')
    .optional(),
  description: z
    .string()
    .max(127, 'Description cannot exceed 127 characters')
    .optional(),
});

export type PayPalCreateOrderRequest = z.infer<typeof paypalCreateOrderSchema>;

/**
 * PayPal Capture Order Request Schema
 */
export const paypalCaptureOrderSchema = z.object({
  orderID: z
    .string()
    .min(1, 'PayPal Order ID is required'),
  convexOrderId: z
    .string()
    .optional(),
});

export type PayPalCaptureOrderRequest = z.infer<typeof paypalCaptureOrderSchema>;

/**
 * Square Credit Purchase Request Schema
 */
export const squareCreditPurchaseSchema = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required'),
  credits: z
    .number()
    .int('Credits must be an integer')
    .min(LIMITS.MIN_CREDIT_PURCHASE, `Minimum purchase is ${LIMITS.MIN_CREDIT_PURCHASE} credits`)
    .max(LIMITS.MAX_CREDIT_PURCHASE, `Maximum purchase is ${LIMITS.MAX_CREDIT_PURCHASE} credits`),
  sourceId: z
    .string()
    .min(1, 'Payment source ID is required'),
  verificationToken: z
    .string()
    .optional(),
});

export type SquareCreditPurchaseRequest = z.infer<typeof squareCreditPurchaseSchema>;

/**
 * PayPal Credit Purchase Request Schema
 */
export const paypalCreditPurchaseSchema = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required'),
  credits: z
    .number()
    .int('Credits must be an integer')
    .min(LIMITS.MIN_CREDIT_PURCHASE, `Minimum purchase is ${LIMITS.MIN_CREDIT_PURCHASE} credits`)
    .max(LIMITS.MAX_CREDIT_PURCHASE, `Maximum purchase is ${LIMITS.MAX_CREDIT_PURCHASE} credits`),
  orderID: z
    .string()
    .min(1, 'PayPal Order ID is required'),
});

export type PayPalCreditPurchaseRequest = z.infer<typeof paypalCreditPurchaseSchema>;

/**
 * Generic Webhook Event Schema
 */
export const webhookEventSchema = z.object({
  event_type: z.string().optional(),
  type: z.string().optional(),
  id: z.string().optional(),
  resource: z.record(z.string(), z.unknown()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

/**
 * Validate request body against schema
 * Returns parsed data or throws validation error
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatValidationError(error: z.ZodError): string {
  const firstError = error.issues[0];
  if (firstError) {
    return `${firstError.path.join('.')}: ${firstError.message}`;
  }
  return 'Validation failed';
}
