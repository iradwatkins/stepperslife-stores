import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_ENVIRONMENT = process.env.STRIPE_ENVIRONMENT || "test";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!STRIPE_SECRET_KEY) {
  console.error("[Stripe] CRITICAL: STRIPE_SECRET_KEY is not set!");
}

if (!CONVEX_URL) {
  console.error("[Convex] CRITICAL: CONVEX_URL is not set!");
}

// Initialize Stripe client
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

// Initialize Convex client
const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * Create a Stripe Connect Express Account for an organizer
 * POST /api/stripe/create-connect-account
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, refreshUrl, returnUrl } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Create Express Connect account
    const account = await stripe.accounts.create({
      type: "express",
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      settings: {
        payouts: {
          schedule: {
            interval: "manual", // Organizer controls when they get paid
          },
        },
      },
    });


    // Save account ID to Convex
    try {
      // Set Convex auth (this will use the current user's session)
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        convex.setAuth(authHeader);
      }

      await convex.mutation(api.users.mutations.connectStripeAccount, {
        stripeConnectedAccountId: account.id,
      });

    } catch (convexError: any) {
      console.error("[Stripe Connect] Failed to save to Convex:", convexError);
      // Don't fail the request - account was created, they can retry onboarding
    }

    // Create account link for onboarding
    const defaultRefreshUrl = `${process.env.NEXT_PUBLIC_APP_URL}/organizer/onboarding/refresh`;
    const defaultReturnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/organizer/onboarding/return`;

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl || defaultRefreshUrl,
      return_url: returnUrl || defaultReturnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({
      accountId: account.id,
      accountLinkUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error("[Stripe Connect] Account creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}

/**
 * Get account link for existing account (refresh onboarding)
 * PUT /api/stripe/create-connect-account
 */
export async function PUT(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { accountId, refreshUrl, returnUrl } = body;

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Create new account link
    const defaultRefreshUrl = `${process.env.NEXT_PUBLIC_APP_URL}/organizer/onboarding/refresh`;
    const defaultReturnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/organizer/onboarding/return`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || defaultRefreshUrl,
      return_url: returnUrl || defaultReturnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({
      accountLinkUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error("[Stripe Connect] Account link creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account link" },
      { status: 500 }
    );
  }
}
