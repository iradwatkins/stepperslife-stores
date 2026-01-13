import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Debug Session Endpoint - DEVELOPMENT ONLY
 *
 * This endpoint is for debugging session issues during development.
 * It is DISABLED in production to prevent information disclosure.
 */

const isDevelopment = process.env.NODE_ENV === "development";

export async function GET(request: NextRequest) {
  // SECURITY: Block this endpoint in production
  if (!isDevelopment) {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    if (!sessionToken) {
      return NextResponse.json({
        hasSession: false,
        message: "No session token found in cookies",
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET;

    if (!JWT_SECRET) {
      return NextResponse.json({
        hasSession: false,
        error: "JWT_SECRET not configured",
      });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);

    try {
      const { payload } = await jwtVerify(sessionToken.value, secret);

      // Only return minimal non-sensitive info, not full payload
      return NextResponse.json({
        hasSession: true,
        tokenValid: true,
        userId: payload.userId ? "present" : "missing",
        email: payload.email ? "present" : "missing",
        role: payload.role || "unknown",
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : "unknown",
      });
    } catch (error) {
      return NextResponse.json({
        hasSession: true,
        tokenValid: false,
        error: "Token verification failed",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
