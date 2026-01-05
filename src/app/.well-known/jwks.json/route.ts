/**
 * JWKS (JSON Web Key Set) Endpoint
 *
 * Convex fetches this endpoint to get the public keys for verifying JWTs.
 * URL: /.well-known/jwks.json
 */

import { NextResponse } from "next/server";
import { getJwks } from "@/lib/auth/jwks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jwks = await getJwks();

    return NextResponse.json(jwks, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[JWKS] Error generating JWKS:", error);
    return NextResponse.json(
      { error: "Failed to generate JWKS" },
      { status: 500 }
    );
  }
}
