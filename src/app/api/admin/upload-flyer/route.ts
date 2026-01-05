import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { jwtVerify } from "jose";
import { getJwtSecretEncoded } from "@/lib/auth/jwt-secret";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const JWT_SECRET = getJwtSecretEncoded();

// Calculate file hash for duplicate detection
async function calculateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Verify user is authenticated and is an admin or organizer
async function verifyAuth(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const token = request.cookies.get("session_token")?.value || request.cookies.get("auth-token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    // Allow admin and organizer roles to upload flyers
    if (role !== "admin" && role !== "organizer") return null;
    return { userId: payload.userId as string, role };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Calculate file hash for identification
    const fileHash = await calculateFileHash(buffer);

    // Optimize image with sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(1200, null, {
        // Resize width to 1200px, maintain aspect ratio
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({
        quality: 85, // Good quality while reducing file size
        progressive: true,
      })
      .toBuffer();

    // Get upload URL from Convex
    const uploadUrl = await convex.mutation(api.upload.generateUploadUrl);

    // Upload to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
      },
      body: optimizedBuffer as unknown as BodyInit,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Convex upload failed: ${uploadResponse.statusText}`);
    }

    const { storageId } = await uploadResponse.json();

    // Get the public URL for the uploaded file
    const imageUrl = await convex.mutation(api.upload.getImageUrl, { storageId });

    // Calculate sizes for reporting
    const originalSize = buffer.length;
    const optimizedSize = optimizedBuffer.length;
    const savedBytes = originalSize - optimizedSize;
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      storageId,
      hash: fileHash,
      originalSize,
      optimizedSize,
      savedBytes,
      savedPercent: `${savedPercent}%`,
      url: imageUrl,
    });
  } catch (error) {
    console.error("Flyer upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload flyer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
