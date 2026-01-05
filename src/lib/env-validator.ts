/**
 * Environment Variable Validator
 * Validates that all required environment variables are set
 * Call this at application startup to fail fast if configuration is missing
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_CONVEX_URL',
  'JWT_SECRET',
  'AUTH_SECRET',
  'NEXTAUTH_URL',
  'AUTH_GOOGLE_CLIENT_ID',
  'AUTH_GOOGLE_CLIENT_SECRET',
  'POSTAL_API_KEY', // Self-hosted email via Postal (postal.toolboxhosting.com)
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const;

const optionalEnvVars = [
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'STRIPE_WEBHOOK_SECRET',
  'CONVEX_DEPLOY_KEY', // Only needed for deployment, not local dev
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Skip validation during build phase (only validate at runtime)
  // Next.js sets NEXT_PHASE during build
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  if (isBuildPhase) {
    return { valid: true, warnings: [], isBuildPhase: true };
  }

  // Check required variables
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  for (const key of optionalEnvVars) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  // Fail if required variables are missing (only at runtime, not during build)
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\n` +
      `Please set these in your .env.local file or environment configuration.`
    );
  }

  // Warn about optional variables in development
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `Optional environment variables not set:\n${warnings.map(k => `  - ${k}`).join('\n')}`
    );
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret === 'your-secret-key-change-this-in-production') {
      throw new Error(
        'JWT_SECRET is using the default insecure value. ' +
        'Please set a strong random secret in production.'
      );
    }
    if (jwtSecret.length < 32) {
      throw new Error(
        `JWT_SECRET must be at least 32 characters long for security. Current length: ${jwtSecret.length}`
      );
    }
  }

  // Validate AUTH_SECRET strength
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret && authSecret.length < 32) {
    throw new Error(
      `AUTH_SECRET must be at least 32 characters long for security. Current length: ${authSecret.length}`
    );
  }

  // Validate API key formats
  // Postal API key format validation (not strictly required as Postal keys vary)
  const postalKey = process.env.POSTAL_API_KEY;
  if (postalKey && postalKey.length < 10) {
    throw new Error('POSTAL_API_KEY appears to be too short (invalid format)');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && !stripeKey.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY must start with "sk_" (invalid format)');
  }

  const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (stripePublicKey && !stripePublicKey.startsWith('pk_')) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with "pk_" (invalid format)');
  }

  // Log successful validation in development
  if (process.env.NODE_ENV === 'development') {
    if (warnings.length > 0) {
      console.warn(`${warnings.length} optional variable(s) not set`);
    }
  }

  return {
    valid: true,
    warnings,
  };
}

// Export typed environment variables for better IDE support
export const env = {
  CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL!,
  JWT_SECRET: process.env.JWT_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NODE_ENV: process.env.NODE_ENV,
} as const;
