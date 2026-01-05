import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

// Generate idempotency key to prevent duplicate payments
function generateIdempotencyKey(orderId: string, amount: number): string {
  const data = `food-${orderId}-${amount}-${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("[Stripe Food Order] CRITICAL: STRIPE_SECRET_KEY is not set!");
}

// Initialize Stripe client
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

/**
 * Create a Payment Intent for Food Orders
 * POST /api/stripe/create-food-order-payment
 *
 * This route handles payments for restaurant food orders.
 * Payment methods: Card + Cash App Pay (via Stripe)
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      console.error("[Stripe Food Order] Stripe not initialized - missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Payment system is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      amount, // Total amount in cents
      currency = "usd",
      orderId, // Convex order ID
      orderNumber, // Human-readable order number
      restaurantId,
      restaurantName,
      customerName,
      customerEmail,
      metadata = {},
    } = body;

    // Validation
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: "Amount is required and must be at least $0.50 (50 cents)" },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Build metadata
    const paymentMetadata: Record<string, string> = {
      chargeType: "FOOD_ORDER",
      orderId: orderId || "",
      orderNumber: orderNumber || "",
      restaurantId: restaurantId || "",
      restaurantName: restaurantName || "",
      customerName: customerName || "",
      customerEmail: customerEmail || "",
      ...metadata,
    };

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = generateIdempotencyKey(orderId, amount);

    // Create Payment Intent
    // Explicitly enable Card and Cash App Pay
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amount,
        currency: currency,
        // Enable Card and Cash App Pay
        // Note: Cash App Pay must be enabled in Stripe Dashboard
        payment_method_types: ["card", "cashapp"],
        metadata: paymentMetadata,
        description: `${restaurantName || "SteppersLife"} - Food Order ${orderNumber || ""}`.trim(),
        // Optional: receipt email
        receipt_email: customerEmail || undefined,
      },
      {
        idempotencyKey: idempotencyKey,
      }
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      chargeType: "FOOD_ORDER",
    });
  } catch (error: any) {
    console.error("[Stripe Food Order] Creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}

/**
 * Check payment status
 * GET /api/stripe/create-food-order-payment?paymentIntentId=xxx
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
      metadata: paymentIntent.metadata,
    });
  } catch (error: any) {
    console.error("[Stripe Food Order] Retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve payment intent" },
      { status: 500 }
    );
  }
}
