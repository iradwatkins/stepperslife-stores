import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convexClient as convex } from "@/lib/auth/convex-client";
import { getJwtSecretEncoded } from "@/lib/auth/jwt-secret";

const JWT_SECRET = getJwtSecretEncoded();

/**
 * Check if the current authenticated user has an instructor profile.
 * Used by the wizard to redirect existing instructors to their dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("session_token")?.value ||
      request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { hasProfile: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as Id<"users">;

    if (!userId) {
      return NextResponse.json(
        { hasProfile: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Check for existing instructor profile
    const instructorProfile = await convex.query(
      api.instructors.queries.getByUserId,
      { userId }
    );

    if (instructorProfile && instructorProfile.isActive) {
      return NextResponse.json({
        hasProfile: true,
        profile: {
          id: instructorProfile._id,
          name: instructorProfile.name,
          slug: instructorProfile.slug,
          verified: instructorProfile.verified,
        },
      });
    }

    return NextResponse.json({ hasProfile: false });
  } catch (error) {
    console.error("[Instructor Check Profile] Error:", error);
    return NextResponse.json(
      { hasProfile: false, error: "Failed to check profile" },
      { status: 500 }
    );
  }
}
