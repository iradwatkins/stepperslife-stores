/**
 * Google OAuth Initiation Route
 *
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen
 *
 * Uses stateless OAuth flow with encrypted state parameter to avoid
 * cookie issues with cross-site redirects (SameSite restrictions).
 */

import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, encryptOAuthState } from "@/lib/auth/google-oauth";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  try {
    // Generate nonce for CSRF protection
    const nonce = randomBytes(16).toString("hex");

    // Get callback URL from query params (optional)
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/organizer/events";

    // Create timestamp for expiration check
    const timestamp = Date.now();

    // Encrypt the state data (callbackUrl, nonce, timestamp) into a single state parameter
    const encryptedState = encryptOAuthState({
      callbackUrl,
      nonce,
      timestamp,
    });

    // Generate the Google OAuth URL with the encrypted state
    const googleAuthUrl = getGoogleAuthUrl(encryptedState);

    return NextResponse.redirect(googleAuthUrl);
  } catch (error: any) {
    console.error("[Google OAuth] Initiation error:", error.message);
    return NextResponse.json({ error: "Failed to initiate Google OAuth" }, { status: 500 });
  }
}
