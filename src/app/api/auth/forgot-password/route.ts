import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { sendPostalEmail } from "@/lib/email/client";
import { randomBytes, createHash } from "crypto";
import { convexClient as convex } from "@/lib/auth/convex-client";
import { getBaseUrl } from "@/lib/constants/app-config";
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
    const rateLimit = checkRateLimit(`password-reset:${clientIp}`, rateLimiters.passwordReset);

    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit.retryAfter || 900);
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await convex.query(api.users.queries.getUserByEmail, { email });

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      // Still return success to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset email will be sent",
      });
    }

    // Generate secure reset token
    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store reset token
    await convex.mutation(api.auth.mutations.storePasswordResetToken, {
      userId: user._id,
      tokenHash: hashedToken,
      expiry,
    });

    // Send reset email using centralized base URL
    const baseUrl = getBaseUrl(request);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPostalEmail({
      from: "Steppers Life Events <noreply@events.stepperslife.com>",
      to: email,
      subject: "Reset Your Password - Steppers Life Events",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
            </div>

            <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              ${user.name ? `<p style="font-size: 16px;">Hi ${user.name},</p>` : '<p style="font-size: 16px;">Hi there,</p>'}

              <p style="font-size: 16px; margin: 20px 0;">
                We received a request to reset your password for your Steppers Life Events account.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                  Reset Your Password
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                This link will expire in 1 hour for security reasons.
              </p>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>

              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                <p style="margin: 5px 0;">Steppers Life Events</p>
                <p style="margin: 5px 0;">Bringing the steppers community together</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });


    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset email will be sent",
    });
  } catch (error: any) {
    console.error("[Password Reset] Error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
