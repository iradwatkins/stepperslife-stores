import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexClient as convex } from "@/lib/auth/convex-client";
import { verifyPassword } from "@/lib/auth/password-utils";
import { createAndSetSession } from "@/lib/auth/session-manager";
import {
  checkRateLimit,
  getClientIp,
  rateLimiters,
  createRateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 attempts per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${clientIp}`, rateLimiters.auth);

    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit.retryAfter || 60);
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Get user from Convex
    const user = await convex.query(api.users.queries.getUserByEmail, {
      email: email.toLowerCase(),
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password using centralized utility
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Create session token and set cookie using centralized utility
    await createAndSetSession(
      response,
      {
        userId: user._id,
        email: user.email,
        name: user.name || user.email,
        role: user.role || "user",
      },
      request
    );

    return response;
  } catch (error) {
    console.error("[Login] Login error:", error);
    console.error("[Login] Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        error: "Internal server error",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
