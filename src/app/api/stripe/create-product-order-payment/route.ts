import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

// Generate idempotency key to prevent duplicate payments
function generateIdempotencyKey(orderId: string, amount: number): string {
  const data = `product-order-${orderId}-${amount}-${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("[Stripe Product Order] CRITICAL: STRIPE_SECRET_KEY is not set!");
}

// Initialize Stripe client
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

/**
 * Create a Payment Intent for Product Orders with Split Payment
 * POST /api/stripe/create-product-order-payment
 *
 * This route handles payments for marketplace product orders.
 * Supports split payments via Stripe Connect:
 * - Platform fee (commission) goes to SteppersLife
 * - Remaining amount transfers to vendor's connected account
 *
 * Payment methods: Card + Cash App Pay (via Stripe)
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      console.error("[Stripe Product Order] Stripe not initialized - missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Payment system is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      amount, // Total amount in cents
      currency = "usd",
      orderId, // Convex order ID (optional - can be created after payment)
      orderNumber, // Human-readable order number (optional)
      vendorId, // Vendor Convex ID
      vendorName,
      vendorStripeAccountId, // Vendor's Stripe Connect account ID
      commissionPercent, // Platform commission percentage (e.g., 15)
      customerName,
      customerEmail,
      items, // Array of order items for metadata
      metadata = {},
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

    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 }
      );
    }

    // Calculate application fee (platform commission)
    // Commission is calculated on subtotal (before tax/shipping)
    const applicationFeeAmount = Math.round(amount * (commissionPercent / 100));

    // Build metadata for tracking
    const paymentMetadata: Record<string, string> = {
      chargeType: "PRODUCT_ORDER",
      vendorId: vendorId || "",
      vendorName: vendorName || "",
      orderId: orderId || "",
      orderNumber: orderNumber || "",
      customerName: customerName || "",
      customerEmail: customerEmail || "",
      commissionPercent: String(commissionPercent || 0),
      applicationFee: String(applicationFeeAmount),
      itemCount: String(items?.length || 0),
      ...metadata,
    };

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = generateIdempotencyKey(orderId || vendorId, amount);

    // Build payment intent options
    const paymentIntentOptions: Stripe.PaymentIntentCreateParams = {
      amount: amount,
      currency: currency,
      // Enable automatic payment methods - Stripe will determine which methods are available
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: paymentMetadata,
      description: `${vendorName || "SteppersLife Marketplace"} - Product Order${orderNumber ? ` #${orderNumber}` : ""}`.trim(),
      receipt_email: customerEmail || undefined,
    };

    // If vendor has a REAL Stripe Connect account, set up split payment
    // Real Stripe accounts start with 'acct_' and are typically 20+ characters
    // Test/fake accounts like 'acct_test_xxx' should be skipped
    const isRealStripeAccount = vendorStripeAccountId &&
      vendorStripeAccountId.startsWith('acct_') &&
      !vendorStripeAccountId.includes('_test_') &&
      vendorStripeAccountId.length >= 20;

    if (isRealStripeAccount) {
      // Split payment: platform keeps commission, vendor gets rest
      paymentIntentOptions.application_fee_amount = applicationFeeAmount;
      paymentIntentOptions.transfer_data = {
        destination: vendorStripeAccountId,
      };
    }
    // If no real Stripe account, platform receives full amount
    // Vendor will be paid out manually via vendorPayouts

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentOptions,
      {
        idempotencyKey: idempotencyKey,
      }
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      chargeType: "PRODUCT_ORDER",
      splitPayment: isRealStripeAccount,
      applicationFeeAmount: isRealStripeAccount ? applicationFeeAmount : 0,
      vendorReceives: isRealStripeAccount ? amount - applicationFeeAmount : 0,
    });
  } catch (error: any) {
    console.error("[Stripe Product Order] Creation error:", {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw?.message,
    });

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      if (error.message?.includes("destination")) {
        return NextResponse.json(
          { error: "Vendor payment account is not properly configured. Please contact support." },
          { status: 400 }
        );
      }
      // Return the actual Stripe error for debugging
      return NextResponse.json(
        { error: `Stripe error: ${error.message}`, code: error.code },
        { status: 400 }
      );
    }

    if (error.type === "StripeConnectionError" || error.type === "StripeAPIError") {
      return NextResponse.json(
        { error: `Stripe connection issue: ${error.message}`, type: error.type },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create payment intent", type: error.type },
      { status: 500 }
    );
  }
}

/**
 * Check payment status
 * GET /api/stripe/create-product-order-payment?paymentIntentId=xxx
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
      applicationFeeAmount: paymentIntent.application_fee_amount,
      metadata: paymentIntent.metadata,
    });
  } catch (error: any) {
    console.error("[Stripe Product Order] Retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve payment intent" },
      { status: 500 }
    );
  }
}
