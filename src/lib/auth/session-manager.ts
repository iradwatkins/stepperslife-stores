/**
 * Centralized Session Management
 *
 * Single source of truth for:
 * - JWT token creation
 * - Auth cookie setting/clearing
 * - Session configuration
 *
 * This eliminates duplication across login, OAuth callback, and logout routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getJwtSecretEncoded } from "./jwt-secret";

/**
 * Session token payload structure
 */
export interface SessionTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Session cookie configuration
 */
export interface SessionCookieOptions {
  maxAge?: number; // in seconds
  domain?: string;
}

/**
 * Default session configuration
 */
const DEFAULT_SESSION_CONFIG = {
  COOKIE_NAME: "session_token",
  MAX_AGE: 60 * 60 * 24 * 30, // 30 days in seconds
  EXPIRATION: "30d", // JWT expiration format
  PRODUCTION_DOMAIN: ".stepperslife.com",
} as const;

/**
 * Detect if the request is from localhost
 */
export function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get("host");
  return host?.includes("localhost") ?? false;
}

/**
 * Create a JWT session token
 *
 * @param payload - User data to include in the token
 * @returns Signed JWT token string
 */
export async function createSessionToken(
  payload: SessionTokenPayload
): Promise<string> {
  const secret = getJwtSecretEncoded();

  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DEFAULT_SESSION_CONFIG.EXPIRATION)
    .sign(secret);

  return token;
}

/**
 * Set session cookie on response
 *
 * Automatically detects localhost vs production and sets appropriate domain.
 * Uses secure, httpOnly cookies with 30-day expiration.
 *
 * @param response - NextResponse to set cookie on
 * @param token - JWT token to store
 * @param request - NextRequest for localhost detection
 * @param options - Optional cookie configuration overrides
 */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  request: NextRequest,
  options?: SessionCookieOptions
): void {
  const isLocal = isLocalhost(request);
  const maxAge = options?.maxAge ?? DEFAULT_SESSION_CONFIG.MAX_AGE;
  const domain = options?.domain ?? (isLocal ? undefined : DEFAULT_SESSION_CONFIG.PRODUCTION_DOMAIN);

  response.cookies.set(DEFAULT_SESSION_CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: !isLocal, // secure in production (non-localhost)
    sameSite: "lax",
    maxAge,
    path: "/",
    domain,
  });
}

/**
 * Clear session cookies on logout
 *
 * Clears both old "auth-token" and current "session_token" cookie names
 * to handle any legacy cookies still present.
 *
 * @param response - NextResponse to clear cookies on
 * @param request - NextRequest for localhost detection
 */
export function clearSessionCookies(
  response: NextResponse,
  request: NextRequest
): void {
  const isLocal = isLocalhost(request);
  const domain = isLocal ? undefined : DEFAULT_SESSION_CONFIG.PRODUCTION_DOMAIN;

  // Clear both old and new cookie names for compatibility
  const cookieNames = ["auth-token", "session_token"];

  cookieNames.forEach((name) => {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: !isLocal,
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
      domain,
    });
  });
}

/**
 * Create session token and set cookie in one operation
 *
 * Convenience method for auth routes that need both operations.
 *
 * @param response - NextResponse to set cookie on
 * @param payload - User data for JWT payload
 * @param request - NextRequest for localhost detection
 * @param options - Optional cookie configuration overrides
 * @returns The created JWT token
 */
export async function createAndSetSession(
  response: NextResponse,
  payload: SessionTokenPayload,
  request: NextRequest,
  options?: SessionCookieOptions
): Promise<string> {
  const token = await createSessionToken(payload);
  setSessionCookie(response, token, request, options);
  return token;
}
