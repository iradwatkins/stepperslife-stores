import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session-manager";

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  // Clear session cookies using centralized utility
  clearSessionCookies(response, request);

  return response;
}
