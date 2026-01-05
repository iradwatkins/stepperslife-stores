import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { verifyAuth } from "@/lib/auth/api-auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/**
 * Get vendor payment information for checkout
 * GET /api/vendors/[vendorId]/payment-info
 *
 * Returns payment capability info for checkout (not sensitive account details)
 * Requires authentication to prevent enumeration attacks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    // Require authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { vendorId } = await params;

    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 }
      );
    }

    // Fetch vendor from Convex
    const vendor = await convex.query(api.vendors.getById, {
      vendorId: vendorId as Id<"vendors">,
    });

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Return only what's needed for checkout UI (hide sensitive IDs)
    return NextResponse.json({
      vendorId: vendor._id,
      vendorName: vendor.name,
      // Don't expose stripeConnectedAccountId - only expose capability flags
      acceptsCards: vendor.stripeAccountSetupComplete || false,
      acceptsCashApp: vendor.stripeCashAppEnabled || false,
      payoutsEnabled: vendor.stripePayoutsEnabled || false,
    });
  } catch (error: any) {
    console.error("[Vendor Payment Info] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch vendor payment info" },
      { status: 500 }
    );
  }
}
