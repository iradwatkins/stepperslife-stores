"use node";

/**
 * PRODUCTION-GRADE ACTIVATION CODE SECURITY
 *
 * Implements secure activation codes with:
 * - 8 alphanumeric characters (1.7 trillion possibilities vs 10k for 4 digits)
 * - SHA-256 hashing (codes stored hashed, never plain text)
 * - 48-hour expiry
 * - Designed for rate limiting integration
 *
 * NOTE: Uses Node.js runtime for crypto module
 */

import crypto from "crypto";

/**
 * Generate a cryptographically secure 8-character alphanumeric activation code
 *
 * Format: XXXX-XXXX (2 groups of 4 for readability)
 * Character set: A-Z, 0-9 (excluding ambiguous chars: 0, O, I, 1)
 *
 * Entropy: 32^8 = 1,099,511,627,776 possibilities (1.7 trillion)
 * vs 4-digit: 10^4 = 10,000 possibilities
 *
 * Security improvement: 109,951,162x harder to brute force
 */
export function generateActivationCode(): string {
  // Character set excluding ambiguous characters (0/O, 1/I)
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 chars

  let code = "";

  // Generate 8 random characters using crypto.randomBytes for security
  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.randomBytes(1)[0] % charset.length;
    code += charset[randomIndex];

    // Add hyphen after 4th character for readability: XXXX-XXXX
    if (i === 3) code += "-";
  }

  return code;
}

/**
 * Hash an activation code using SHA-256
 *
 * Codes are NEVER stored in plain text in the database.
 * This prevents rainbow table attacks and protects codes even if DB is compromised.
 *
 * @param code - The plain text activation code (e.g., "ABCD-1234")
 * @returns SHA-256 hash of the code
 */
export function hashActivationCode(code: string): string {
  // Normalize code (uppercase, remove hyphens) before hashing
  const normalized = code.toUpperCase().replace(/-/g, "");

  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Verify an activation code against its hash
 *
 * @param plainCode - The code entered by the user
 * @param storedHash - The hashed code from the database
 * @returns true if the code matches, false otherwise
 */
export function verifyActivationCode(plainCode: string, storedHash: string): boolean {
  const hashedInput = hashActivationCode(plainCode);

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(hashedInput), Buffer.from(storedHash));
}

/**
 * Calculate activation code expiry timestamp
 *
 * Codes expire after 48 hours to prevent indefinite validity
 *
 * @returns Timestamp (ms) when the code should expire
 */
export function getActivationCodeExpiry(): number {
  const EXPIRY_HOURS = 48;
  return Date.now() + EXPIRY_HOURS * 60 * 60 * 1000;
}

/**
 * Check if an activation code has expired
 *
 * @param expiryTimestamp - The expiry timestamp from the database
 * @returns true if expired, false if still valid
 */
export function isActivationCodeExpired(expiryTimestamp: number | undefined): boolean {
  if (!expiryTimestamp) return false; // Old codes without expiry are still valid
  return Date.now() > expiryTimestamp;
}

/**
 * Format an activation code for display (adds hyphen if missing)
 *
 * @param code - The activation code
 * @returns Formatted code: XXXX-XXXX
 */
export function formatActivationCode(code: string): string {
  const normalized = code.toUpperCase().replace(/-/g, "");
  if (normalized.length !== 8) return code; // Return as-is if invalid length

  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}
