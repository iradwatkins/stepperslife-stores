import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route for Convex storage uploads
 *
 * The self-hosted Convex backend returns relative upload URLs like /api/storage/upload?token=xxx
 * This route proxies those requests to the actual Convex backend
 */

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://convex.toolboxhosting.com";

export async function POST(request: NextRequest) {
  try {
    // Get the token from query params
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing upload token" },
        { status: 400 }
      );
    }

    // Get the content type and body
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const body = await request.arrayBuffer();

    // Forward the request to Convex backend
    const convexUploadUrl = `${CONVEX_URL}/api/storage/upload?token=${token}`;

    const response = await fetch(convexUploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Storage Proxy] Upload failed:", response.status, errorText);
      return NextResponse.json(
        { error: "Upload failed", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Storage Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
