/**
 * Centralized JWT Secret Management
 *
 * This ensures all auth routes use the same JWT secret for creating and verifying tokens.
 * CRITICAL: The secret MUST be consistent across all operations.
 */

/**
 * Get the JWT secret from environment variables
 * Always checks in this order: JWT_SECRET, AUTH_SECRET, NEXTAUTH_SECRET, then fallback
 */
export function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "development-secret-change-in-production"
  );
}

/**
 * Get the JWT secret as an encoded buffer for jose library
 */
export function getJwtSecretEncoded(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

/**
 * Validate that JWT secret is properly configured
 */
export function validateJwtSecret(): { valid: boolean; error?: string } {
  const secret = getJwtSecret();

  if (!process.env.JWT_SECRET && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    return {
      valid: false,
      error: "No JWT secret configured in environment variables. Please set JWT_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET.",
    };
  }

  if (secret.includes("development-secret") || secret.includes("change-this")) {
    console.warn("[JWT Secret] WARNING: Using development secret in production!");
  }

  return { valid: true };
}
