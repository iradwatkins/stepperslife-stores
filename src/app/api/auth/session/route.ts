/**
 * Session Route - NextAuth Compatibility Layer
 *
 * GET /api/auth/session
 * Returns current user session in NextAuth-compatible format
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convexClient as convex } from "@/lib/auth/convex-client";
import { getJwtSecretEncoded } from "@/lib/auth/jwt-secret";

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("session_token")?.value || request.cookies.get("auth-token")?.value;

    if (!token) {
      // Return empty session (not an error) for unauthenticated state
      return NextResponse.json({}, { status: 200 });
    }

    const JWT_SECRET = getJwtSecretEncoded();

    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Get fresh user data from Convex
    const user = await convex.query(api.users.queries.getUserByIdPublic, {
      userId: payload.userId as Id<"users">,
    });

    if (!user) {
      // Return empty session if user not found
      return NextResponse.json({}, { status: 200 });
    }

    // Return NextAuth-compatible session format
    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }, { status: 200 });
  } catch (error) {
    console.error("[Auth /session] Error:", error);
    // Return empty session on error (not an error response)
    return NextResponse.json({}, { status: 200 });
  }
}
