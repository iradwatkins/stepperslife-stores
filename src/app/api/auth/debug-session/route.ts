import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    if (!sessionToken) {
      return NextResponse.json({
        error: "No session token found",
        hasSession: false,
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET;
    const secret = new TextEncoder().encode(JWT_SECRET);

    try {
      const { payload } = await jwtVerify(sessionToken.value, secret);

      return NextResponse.json({
        hasSession: true,
        payload: payload,
        tokenLength: sessionToken.value.length,
      });
    } catch (error) {
      return NextResponse.json({
        hasSession: true,
        error: "Invalid token",
        errorDetails: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
