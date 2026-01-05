import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("[Stripe] CRITICAL: STRIPE_SECRET_KEY is not set!");
}

// Initialize Stripe client
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

/**
 * Check Stripe Connect account status
 * GET /api/stripe/account-status?accountId=acct_xxx
 */
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    // Check if account is complete
    const isComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled &&
      (!account.requirements?.currently_due || account.requirements.currently_due.length === 0);

    return NextResponse.json({
      accountId: account.id,
      isComplete: isComplete,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      },
      capabilities: {
        cardPayments: account.capabilities?.card_payments,
        transfers: account.capabilities?.transfers,
      },
    });
  } catch (error: any) {
    console.error("[Stripe Connect] Account status error:", error);

    // Check if account doesn't exist
    if (error.code === "resource_missing") {
      return NextResponse.json(
        { error: "Stripe account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to retrieve account status" },
      { status: 500 }
    );
  }
}
