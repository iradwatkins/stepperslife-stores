import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexClient as convex } from "@/lib/auth/convex-client";
import {
  hashPassword,
  validatePasswordStrength,
  validateEmailFormat,
} from "@/lib/auth/password-utils";
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
    const rateLimit = checkRateLimit(`register:${clientIp}`, rateLimiters.auth);

    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit.retryAfter || 60);
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Please provide all required fields" }, { status: 400 });
    }

    if (!validateEmailFormat(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    // Check if user already exists
    try {
      const existingUser = await convex.query(api.users.queries.getUserByEmail, {
        email: email.toLowerCase(),
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
    } catch {
      // User not found - this is expected, continue with registration
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user in Convex
    const userId = await convex.mutation(api.users.mutations.createUser, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: "user",
    });

    if (!userId) {
      return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
    }

    // Initialize credits for the new user (non-blocking)
    try {
      await convex.mutation(api.credits.mutations.initializeCredits, {
        organizerId: userId,
      });
    } catch {
      // Non-fatal - credits can be initialized later
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully! Please log in.",
        userId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register] Error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
