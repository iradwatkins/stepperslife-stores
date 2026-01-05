/**
 * Google OAuth Callback Route
 *
 * GET /api/auth/callback/google
 * Handles OAuth callback from Google and creates/signs in user
 *
 * Uses stateless OAuth with encrypted state parameter - no cookies needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { completeGoogleOAuth, decryptOAuthState } from "@/lib/auth/google-oauth";
import { api } from "@/convex/_generated/api";
import { convexClient as convex } from "@/lib/auth/convex-client";
import { createAndSetSession } from "@/lib/auth/session-manager";
import { getBaseUrl } from "@/lib/constants/app-config";

export async function GET(request: NextRequest) {
  // Get base URL early for all redirects (prevents localhost issues)
  const baseUrl = getBaseUrl(request);

  try {
    // Get OAuth code and state from query params
    const code = request.nextUrl.searchParams.get("code");
    const encryptedState = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // Check for errors from Google
    if (error) {
      console.error("[Google OAuth] Error from Google:", error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    // Validate required params
    if (!code || !encryptedState) {
      console.error("[Google OAuth] Missing required params");
      return NextResponse.redirect(new URL("/login?error=missing_params", baseUrl));
    }

    // Decrypt and verify the state parameter
    const stateData = decryptOAuthState(encryptedState);
    if (!stateData) {
      console.error("[Google OAuth] Failed to decrypt state or state expired");
      return NextResponse.redirect(new URL("/login?error=invalid_state", baseUrl));
    }

    // Get callback URL from decrypted state
    const callbackUrl = stateData.callbackUrl || "/organizer/events";

    // Exchange code for user info
    const googleUser = await completeGoogleOAuth(code);

    // Create or update user in Convex
    const userId = await convex.mutation(api.users.mutations.upsertUserFromGoogle, {
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      image: googleUser.picture,
    });

    // Fetch the complete user data to get role
    const user = await convex.query(api.users.queries.getUserById, { userId });

    const response = NextResponse.redirect(new URL(callbackUrl, baseUrl));

    // Create session token and set cookie using centralized utility
    await createAndSetSession(
      response,
      {
        userId: userId,
        email: googleUser.email,
        name: googleUser.name,
        role: user?.role || "user",
      },
      request
    );

    return response;
  } catch (error: any) {
    console.error("[Google OAuth] Callback error:", error.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }
}
