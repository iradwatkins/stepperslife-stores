import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: Prevent directory traversal
    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Check if this looks like a Convex storage ID
    // Convex storage IDs look like: kg2abc123...
    if (filename.startsWith("kg2") || filename.startsWith("kd7") || filename.startsWith("jd7")) {
      try {
        // Try to get the image URL from Convex
        const imageUrl = await convex.query(api.upload.getImageUrlQuery, {
          storageId: filename as Id<"_storage">
        });

        if (imageUrl) {
          // Redirect to the Convex storage URL
          return NextResponse.redirect(imageUrl, { status: 302 });
        }
      } catch {
        // Not a valid storage ID, fall through to 404
      }
    }

    // Legacy .jpg file requests - these are from the old VPS system
    // and no longer supported on Vercel
    return NextResponse.json(
      {
        error: "Image not found",
        message: "This image was stored on a legacy system. Please re-upload the product image to use cloud storage.",
        migrationRequired: true
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("[Product Image] Error serving image:", error);
    return NextResponse.json(
      {
        error: "Failed to load image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
