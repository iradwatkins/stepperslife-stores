import { NextRequest, NextResponse } from "next/server";
import { convexClient as convex } from "@/lib/auth/convex-client";
import { api } from "@/convex/_generated/api";
import {
  checkRateLimit,
  getClientIp,
  createRateLimitResponse,
} from "@/lib/rate-limit";

// Very strict rate limiting for admin setup - 1 attempt per 5 minutes
const adminSetupRateLimit = { windowMs: 5 * 60 * 1000, maxRequests: 1 };

// IP allowlist for production (add your admin IPs here)
const ALLOWED_IPS = process.env.ADMIN_SETUP_ALLOWED_IPS?.split(",") || [];

/**
 * Admin setup endpoint - ONE TIME USE
 * Updates specific users to admin role using a secret key
 *
 * Security measures:
 * - Very strict rate limiting (1 attempt per 5 minutes per IP)
 * - Optional IP allowlist in production
 * - Audit logging of all attempts
 * - Uses env variable for secret key validation
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const timestamp = new Date().toISOString();

  // Rate limiting - 1 attempt per 5 minutes
  const rateLimit = checkRateLimit(`admin-setup:${clientIp}`, adminSetupRateLimit);
  if (!rateLimit.success) {
    console.warn(`[AdminSetup] Rate limit exceeded - IP: ${clientIp}, Time: ${timestamp}`);
    return createRateLimitResponse(rateLimit.retryAfter || 300);
  }

  // IP allowlist check (only if configured)
  if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIp)) {
    console.warn(`[AdminSetup] IP not in allowlist - IP: ${clientIp}, Time: ${timestamp}`);
    // Return generic 404 to avoid revealing endpoint exists
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { secretKey, email } = body;

    if (!secretKey || !email) {
      console.warn(`[AdminSetup] Missing fields - IP: ${clientIp}, Time: ${timestamp}`);
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Audit log the attempt (before validation)
    console.log(`[AdminSetup] Attempt - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);

    // Call the bootstrapAdmin mutation
    const result = await convex.mutation(api.users.mutations.bootstrapAdmin, {
      email: email.toLowerCase(),
      secretKey,
    });

    // Log successful setup
    console.log(`[AdminSetup] SUCCESS - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);

    return NextResponse.json(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log failed attempt
    console.error(`[AdminSetup] FAILED - IP: ${clientIp}, Time: ${timestamp}, Error: ${errorMessage}`);

    // Return generic error to avoid leaking information
    return NextResponse.json(
      { error: "Setup failed" },
      { status: 400 }
    );
  }
}
