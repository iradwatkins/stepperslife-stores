/**
 * Centralized Password Management
 *
 * Single source of truth for:
 * - Password hashing
 * - Password verification
 * - Password strength validation
 *
 * This eliminates duplication across register, reset-password, and login routes.
 */

import bcrypt from "bcryptjs";

/**
 * Password hashing configuration
 */
const SALT_ROUNDS = 10;

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Hash a plain text password
 *
 * Uses bcrypt with 10 salt rounds for secure password storage.
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

/**
 * Verify a plain text password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength requirements
 *
 * Requirements:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 *
 * @param password - Password to validate
 * @returns Validation result with error message if invalid
 */
export function validatePasswordStrength(
  password: string
): PasswordValidationResult {
  // Check minimum length
  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  // Check for required character types
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return {
      valid: false,
      error: "Password must contain uppercase, lowercase, and numbers",
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 *
 * @param email - Email address to validate
 * @returns True if valid email format, false otherwise
 */
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
