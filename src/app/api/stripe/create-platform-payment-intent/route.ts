import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

// Generate idempotency key to prevent duplicate payments
function generateIdempotencyKey(userId: string, amount: number, productType: string): string {
  const data = `${userId}-${amount}-${productType}-${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!STRIPE_SECRET_KEY) {
  console.error("[Stripe Platform] CRITICAL: STRIPE_SECRET_KEY is not set!");
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
 * Platform Payment Types
 * These are payments where 100% goes to the platform (no split)
 */
export type PlatformProductType =
  | "CREDITS" // Organizer credit purchases for prepay model
  | "SUBSCRIPTION" // Monthly/annual platform subscriptions
  | "PROMOTION" // Event promotion/advertising purchases
  | "PREMIUM_FEATURE"; // One-time premium feature purchases

/**
 * Create a Payment Intent for Platform Products (100% to Platform)
 * POST /api/stripe/create-platform-payment-intent
 *
 * This route handles payments that go entirely to the platform:
 * - Credit purchases (for prepay ticket model)
 * - Premium subscriptions
 * - Event promotions/advertising
 *
 * Payment methods: Card + Cash App Pay (via Stripe)
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
    const {
      amount, // Total amount in cents
      currency = "usd",
      productType, // 'CREDITS' | 'SUBSCRIPTION' | 'PROMOTION' | 'PREMIUM_FEATURE'
      userId, // User making the purchase
      metadata = {}, // Additional metadata
      // Credit-specific fields
      ticketQuantity, // For credit purchases: number of ticket credits
      pricePerTicket, // For credit purchases: price per ticket in cents
      // Subscription-specific fields
      subscriptionPlan, // For subscriptions: plan name
      // Promotion-specific fields
      eventId, // For promotions: which event is being promoted
      promotionType, // For promotions: 'FEATURED' | 'HOMEPAGE' | 'CATEGORY'
    } = body;

    // Validation
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: "Amount is required and must be at least $0.50 (50 cents)" },
        { status: 400 }
      );
    }

    // Validate currency - only USD is supported
    if (currency && currency.toLowerCase() !== "usd") {
      return NextResponse.json(
        { error: "Only USD currency is supported" },
        { status: 400 }
      );
    }

    if (!productType) {
      return NextResponse.json(
        { error: "Product type is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate product type
    const validProductTypes: PlatformProductType[] = [
      "CREDITS",
      "SUBSCRIPTION",
      "PROMOTION",
      "PREMIUM_FEATURE",
    ];
    if (!validProductTypes.includes(productType)) {
      return NextResponse.json(
        { error: `Invalid product type. Must be one of: ${validProductTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Build metadata based on product type
    const paymentMetadata: Record<string, string> = {
      productType,
      userId,
      chargeType: "PLATFORM", // Identifies this as a platform (non-split) payment
      ...metadata,
    };

    // Add product-specific metadata
    if (productType === "CREDITS") {
      if (ticketQuantity) paymentMetadata.ticketQuantity = ticketQuantity.toString();
      if (pricePerTicket) paymentMetadata.pricePerTicket = pricePerTicket.toString();
    } else if (productType === "SUBSCRIPTION") {
      if (subscriptionPlan) paymentMetadata.subscriptionPlan = subscriptionPlan;
    } else if (productType === "PROMOTION") {
      if (eventId) paymentMetadata.eventId = eventId;
      if (promotionType) paymentMetadata.promotionType = promotionType;
    }

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = generateIdempotencyKey(userId, amount, productType);

    // Create Payment Intent for platform (no connected account, no split)
    // Explicitly enable Card and Cash App Pay
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amount,
        currency: currency,
        // Explicitly enable Card and Cash App Pay
        // Note: Cash App Pay must be enabled in Stripe Dashboard first
        payment_method_types: ["card", "cashapp"],
        metadata: paymentMetadata,
        // Optional: Add description for customer's statement
        description: getPaymentDescription(productType, ticketQuantity),
      },
      {
        idempotencyKey: idempotencyKey,
      }
    );

    // For credit purchases, create a pending transaction record
    if (productType === "CREDITS" && ticketQuantity && pricePerTicket) {
      try {
        await convex.mutation(api.credits.mutations.createPendingCreditPurchase, {
          organizerId: userId,
          ticketsPurchased: ticketQuantity,
          amountPaid: amount,
          pricePerTicket: pricePerTicket,
          stripePaymentIntentId: paymentIntent.id,
        });
      } catch (convexError: any) {
        console.error("[Stripe Platform] Failed to create pending credit purchase:", convexError);
        // Don't fail the payment intent creation, just log the error
        // The webhook will handle the final confirmation
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      productType: productType,
      chargeType: "PLATFORM",
    });
  } catch (error: any) {
    console.error("[Stripe Platform Payment] Creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}

/**
 * Get a human-readable payment description
 */
function getPaymentDescription(
  productType: PlatformProductType,
  ticketQuantity?: number
): string {
  switch (productType) {
    case "CREDITS":
      return `SteppersLife - ${ticketQuantity || ""} Ticket Credits`.trim();
    case "SUBSCRIPTION":
      return "SteppersLife - Premium Subscription";
    case "PROMOTION":
      return "SteppersLife - Event Promotion";
    case "PREMIUM_FEATURE":
      return "SteppersLife - Premium Feature";
    default:
      return "SteppersLife - Purchase";
  }
}

/**
 * Check payment status
 * GET /api/stripe/create-platform-payment-intent?paymentIntentId=xxx
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
    const paymentIntentId = searchParams.get("paymentIntentId");

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment Intent ID is required" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return NextResponse.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      productType: paymentIntent.metadata?.productType,
      metadata: paymentIntent.metadata,
    });
  } catch (error: any) {
    console.error("[Stripe Platform Payment] Retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve payment intent" },
      { status: 500 }
    );
  }
}
