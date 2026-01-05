import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";
import { verifyAuth } from "@/lib/auth/api-auth";

// Generate idempotency key to prevent duplicate payments
function generateIdempotencyKey(orderId: string, amount: number): string {
  const data = `${orderId}-${amount}-${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
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
 * Create a Payment Intent with Stripe Connect split payments
 * POST /api/stripe/create-payment-intent
 *
 * Supports both charge patterns:
 * - DIRECT CHARGE: Payment goes to organizer's account, platform takes application_fee
 * - DESTINATION CHARGE: Payment goes to platform, then transfers to organizer (with application_fee)
 *
 * The charge pattern is determined by the useDirectCharge parameter.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: "Authentication required to create payment" },
        { status: 401 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      eventId, // Event ID to fetch payment config
      amount, // Total amount in cents
      currency = "usd",
      connectedAccountId, // Optional: can override from payment config
      platformFee, // Platform fee in cents
      orderId,
      orderNumber,
      metadata = {},
      useDirectCharge = false, // Default to DESTINATION CHARGE for platform control
    } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Valid positive amount is required" },
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

    // Determine which connected account to use
    let stripeAccountId = connectedAccountId;
    let organizerId: string | undefined;
    let settlementAmount = 0;

    // If eventId provided, fetch payment config from Convex
    if (eventId && !connectedAccountId) {
      try {
        const paymentConfig = await convex.query(api.paymentConfig.queries.getEventPaymentConfig, {
          eventId,
        });

        if (!paymentConfig?.stripeConnectAccountId) {
          return NextResponse.json(
            { error: "Event does not have Stripe Connect configured" },
            { status: 400 }
          );
        }

        if (paymentConfig.paymentModel !== "CREDIT_CARD") {
          return NextResponse.json(
            { error: "Event is not configured for credit card payments" },
            { status: 400 }
          );
        }

        stripeAccountId = paymentConfig.stripeConnectAccountId;

        // Get organizer ID for debt settlement
        const event = await convex.query(api.events.queries.getEventById, { eventId });
        organizerId = event?.organizerId;

        // Check organizer's platform debt and calculate settlement
        if (organizerId && platformFee > 0) {
          try {
            const debt = await convex.query(api.platformDebt.queries.getDebtByOrganizerId, {
              organizerId,
            });

            if (debt?.hasDebt && debt.remainingDebtCents > 0) {
              // Cap settlement at 100% of normal platform fee (so customer sees at most 2x fee)
              const maxSettlement = platformFee;
              settlementAmount = Math.min(debt.remainingDebtCents, maxSettlement);
              console.log(
                `[Stripe] Debt settlement: organizer ${organizerId} owes $${(debt.remainingDebtCents / 100).toFixed(2)}, settling $${(settlementAmount / 100).toFixed(2)} from this order`
              );
            }
          } catch (debtError) {
            // Don't fail the payment if debt check fails, just log and continue
            console.warn("[Stripe] Failed to check organizer debt:", debtError);
          }
        }
      } catch (convexError: any) {
        console.error("[Stripe Connect] Failed to fetch payment config:", convexError);
        return NextResponse.json(
          { error: "Failed to retrieve payment configuration" },
          { status: 500 }
        );
      }
    }

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "No Stripe Connect account available for this event" },
        { status: 400 }
      );
    }

    // Total platform fee includes normal fee + debt settlement
    const totalPlatformFee = platformFee + settlementAmount;

    // Create Payment Intent based on charge pattern
    let paymentIntent;

    // Generate idempotency key to prevent duplicate payments on retry
    const idempotencyKey = orderId
      ? generateIdempotencyKey(orderId, amount)
      : generateIdempotencyKey(crypto.randomUUID(), amount);

    // Metadata includes settlement info for webhook processing
    const paymentMetadata = {
      orderId: orderId || "",
      orderNumber: orderNumber || "",
      eventId: eventId || "",
      organizerId: organizerId || "",
      settlementAmount: settlementAmount.toString(), // Debt settlement amount in cents
      chargeType: "SPLIT", // Identifies this as a split payment (ticket sales)
      ...metadata,
    };

    if (useDirectCharge) {
      // DIRECT CHARGE Pattern
      // Payment goes directly to organizer's connected account
      // Platform takes application_fee_amount

      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amount,
          currency: currency,
          application_fee_amount: totalPlatformFee, // Platform's cut (includes debt settlement)
          metadata: {
            ...paymentMetadata,
            chargePattern: "DIRECT",
          },
          // Explicitly enable Card and Cash App Pay for ticket purchases
          // Note: Cash App Pay must be enabled in Stripe Dashboard first
          payment_method_types: ["card", "cashapp"],
        },
        {
          stripeAccount: stripeAccountId, // Charge on organizer's account
          idempotencyKey: idempotencyKey, // Prevent duplicate charges
        }
      );
    } else {
      // DESTINATION CHARGE Pattern (Default)
      // Payment goes to platform first, then automatically transfers to organizer
      // Platform keeps application_fee_amount

      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amount,
          currency: currency,
          application_fee_amount: totalPlatformFee, // Platform's cut (includes debt settlement)
          transfer_data: {
            destination: stripeAccountId, // Organizer's account
          },
          metadata: {
            ...paymentMetadata,
            chargePattern: "DESTINATION",
          },
          // Explicitly enable Card and Cash App Pay for ticket purchases
          // Note: Cash App Pay must be enabled in Stripe Dashboard first
          payment_method_types: ["card", "cashapp"],
        },
        {
          idempotencyKey: idempotencyKey, // Prevent duplicate charges
        }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      chargePattern: useDirectCharge ? "DIRECT" : "DESTINATION",
    });
  } catch (error: any) {
    console.error("[Stripe Payment Intent] Creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}

/**
 * Confirm payment status
 * GET /api/stripe/create-payment-intent?paymentIntentId=xxx
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
      return NextResponse.json({ error: "Payment Intent ID is required" }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return NextResponse.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      metadata: paymentIntent.metadata,
    });
  } catch (error: any) {
    console.error("[Stripe Payment Intent] Retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve payment intent" },
      { status: 500 }
    );
  }
}
