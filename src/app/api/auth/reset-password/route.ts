import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { createHash } from "crypto";
import { convexClient as convex } from "@/lib/auth/convex-client";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password-utils";
import {
  checkRateLimit,
  getClientIp,
  rateLimiters,
  createRateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting - 3 attempts per 15 minutes
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`reset-password:${clientIp}`, rateLimiters.passwordReset);

    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit.retryAfter || 900);
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    // Validate password strength using centralized utility
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Hash the token to compare with database
    const hashedToken = createHash("sha256").update(token).digest("hex");

    // Hash the new password using centralized utility
    const passwordHash = await hashPassword(password);

    // Verify token and update password
    const result = await convex.mutation(api.auth.mutations.resetPassword, {
      tokenHash: hashedToken,
      passwordHash,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Invalid or expired reset token" },
        { status: 400 }
      );
    }


    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: any) {
    console.error("[Password Reset] Error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
