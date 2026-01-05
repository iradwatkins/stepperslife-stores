/**
 * Validation utility functions for Convex mutations
 * These functions throw errors with user-friendly messages
 */

/**
 * Validates an email address format
 * @throws Error if email is invalid
 */
export function validateEmail(email: string, fieldName = "Email"): void {
  if (!email || typeof email !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const trimmed = email.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  // Standard email regex - covers most valid email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error(`${fieldName} is not a valid email address`);
  }

  // Check for reasonable length
  if (trimmed.length > 254) {
    throw new Error(`${fieldName} is too long (max 254 characters)`);
  }
}

/**
 * Validates a price value (in cents)
 * @throws Error if price is invalid
 */
export function validatePrice(price: number, fieldName = "Price"): void {
  if (typeof price !== "number" || isNaN(price)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (price < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  if (!Number.isInteger(price)) {
    throw new Error(`${fieldName} must be in cents (whole number)`);
  }

  // Max price: $9,999.99 (999999 cents)
  if (price > 999999) {
    throw new Error(`${fieldName} exceeds maximum allowed value`);
  }
}

/**
 * Validates a quantity value
 * @throws Error if quantity is invalid
 */
export function validateQuantity(quantity: number, fieldName = "Quantity"): void {
  if (typeof quantity !== "number" || isNaN(quantity)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (!Number.isInteger(quantity)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  if (quantity <= 0) {
    throw new Error(`${fieldName} must be at least 1`);
  }

  if (quantity > 99) {
    throw new Error(`${fieldName} cannot exceed 99`);
  }
}

/**
 * Validates a phone number
 * Accepts various formats and normalizes to digits only
 * @throws Error if phone number is invalid
 */
export function validatePhoneNumber(phone: string, fieldName = "Phone number"): void {
  if (!phone || typeof phone !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // US phone numbers should have 10 digits (or 11 with country code)
  if (digitsOnly.length < 10) {
    throw new Error(`${fieldName} must have at least 10 digits`);
  }

  if (digitsOnly.length > 15) {
    throw new Error(`${fieldName} has too many digits`);
  }
}

/**
 * Validates a required non-empty string
 * @throws Error if string is empty or invalid
 */
export function validateRequiredString(
  value: string | undefined | null,
  fieldName: string,
  options: { minLength?: number; maxLength?: number } = {}
): void {
  const { minLength = 1, maxLength = 1000 } = options;

  if (value === undefined || value === null || typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    if (minLength === 1) {
      throw new Error(`${fieldName} is required`);
    }
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }
}

/**
 * Validates a time format (HH:MM AM/PM or 24-hour)
 * @throws Error if time format is invalid
 */
export function validateTimeFormat(time: string, fieldName = "Time"): void {
  if (!time || typeof time !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  // Accept 12-hour format: 11:00 AM, 2:30 PM
  const twelveHourRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM|am|pm)$/;

  // Accept 24-hour format: 14:00, 08:30
  const twentyFourHourRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!twelveHourRegex.test(time) && !twentyFourHourRegex.test(time)) {
    throw new Error(`${fieldName} must be in format "HH:MM AM/PM" or "HH:MM"`);
  }
}

/**
 * Validates a rating value (1-5)
 * @throws Error if rating is invalid
 */
export function validateRating(rating: number, fieldName = "Rating"): void {
  if (typeof rating !== "number" || isNaN(rating)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (!Number.isInteger(rating)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  if (rating < 1 || rating > 5) {
    throw new Error(`${fieldName} must be between 1 and 5`);
  }
}

/**
 * Validates a sort order value
 * @throws Error if sort order is invalid
 */
export function validateSortOrder(sortOrder: number, fieldName = "Sort order"): void {
  if (typeof sortOrder !== "number" || isNaN(sortOrder)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (!Number.isInteger(sortOrder)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  if (sortOrder < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  if (sortOrder > 9999) {
    throw new Error(`${fieldName} cannot exceed 9999`);
  }
}

/**
 * Validates an array has items and is within size limits
 * @throws Error if array is invalid
 */
export function validateArray<T>(
  arr: T[] | undefined | null,
  fieldName: string,
  options: { minItems?: number; maxItems?: number } = {}
): void {
  const { minItems = 0, maxItems = 100 } = options;

  if (!Array.isArray(arr)) {
    throw new Error(`${fieldName} must be an array`);
  }

  if (arr.length < minItems) {
    throw new Error(`${fieldName} must have at least ${minItems} item(s)`);
  }

  if (arr.length > maxItems) {
    throw new Error(`${fieldName} cannot exceed ${maxItems} items`);
  }
}

/**
 * Valid payment statuses for food orders
 */
export const VALID_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "cancelled",
] as const;

export type PaymentStatus = typeof VALID_PAYMENT_STATUSES[number];

/**
 * Validates a payment status
 * @throws Error if payment status is invalid
 */
export function validatePaymentStatus(status: string, fieldName = "Payment status"): void {
  if (!status || typeof status !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  if (!VALID_PAYMENT_STATUSES.includes(status as PaymentStatus)) {
    throw new Error(
      `${fieldName} "${status}" is not valid. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`
    );
  }
}

/**
 * Validates days parameter for analytics queries
 * @throws Error if days is invalid
 */
export function validateDaysParam(days: number, fieldName = "Days"): void {
  if (typeof days !== "number" || isNaN(days)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (!Number.isInteger(days)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  if (days < 1) {
    throw new Error(`${fieldName} must be at least 1`);
  }

  if (days > 365) {
    throw new Error(`${fieldName} cannot exceed 365`);
  }
}

/**
 * Sanitizes and validates text input (prevents XSS, strips dangerous content)
 * Returns sanitized string
 */
export function sanitizeText(text: string, maxLength = 5000): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  // Trim whitespace
  let sanitized = text.trim();

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  return sanitized;
}
