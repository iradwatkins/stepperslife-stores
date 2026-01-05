/**
 * API Route Authentication Helper
 *
 * Provides authenticated user context for API routes.
 * Validates JWT session tokens and returns user information.
 */

import { NextRequest } from "next/server";
import { jwtVerify, JWTPayload } from "jose";
import { getJwtSecretEncoded } from "./jwt-secret";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResult {
  authenticated: boolean;
  user: AuthenticatedUser | null;
  error?: string;
}

/**
 * Verify authentication from request cookies
 *
 * @param request - NextRequest to extract auth token from
 * @returns AuthResult with user data if authenticated
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const token =
      request.cookies.get("session_token")?.value ||
      request.cookies.get("auth-token")?.value;

    if (!token) {
      return {
        authenticated: false,
        user: null,
        error: "No authentication token provided",
      };
    }

    const JWT_SECRET = getJwtSecretEncoded();
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Validate required fields exist
    if (!payload.userId || !payload.email) {
      return {
        authenticated: false,
        user: null,
        error: "Invalid token payload",
      };
    }

    return {
      authenticated: true,
      user: {
        userId: payload.userId as string,
        email: payload.email as string,
        name: (payload.name as string) || "",
        role: (payload.role as string) || "user",
      },
    };
  } catch (error) {
    return {
      authenticated: false,
      user: null,
      error: "Invalid or expired authentication token",
    };
  }
}

/**
 * Require authentication - throws if not authenticated
 *
 * @param request - NextRequest to verify
 * @returns AuthenticatedUser if valid
 * @throws Error if not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedUser> {
  const result = await verifyAuth(request);

  if (!result.authenticated || !result.user) {
    throw new Error(result.error || "Authentication required");
  }

  return result.user;
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "admin" || user.role === "superadmin";
}

/**
 * Check if user has organizer role
 */
export function isOrganizer(user: AuthenticatedUser): boolean {
  return user.role === "organizer" || isAdmin(user);
}
