import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { randomUUID } from "crypto";

/** Generate or extract request ID for tracking */
function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") || `paypal-wh-${randomUUID()}`;
}

/** PayPal webhook event structure */
interface PayPalWebhookEvent {
  id: string; // Unique event ID from PayPal for idempotency
  event_type: string;
  resource: {
    id?: string;
    custom_id?: string;
  };
}

/** Type-safe error message extraction */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.NODE_ENV === "production"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * Verify PayPal webhook signature
 * https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  // If no webhook ID configured, reject in production
  if (!PAYPAL_WEBHOOK_ID) {
    console.error("[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured");
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    // Allow unverified in development with warning
    console.warn("[PayPal Webhook] WARNING: Processing unverified webhook in development mode");
    return true;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error("[PayPal Webhook] PayPal credentials not configured");
    return false;
  }

  try {
    // Get headers required for verification
    const transmissionId = request.headers.get("paypal-transmission-id");
    const transmissionTime = request.headers.get("paypal-transmission-time");
    const certUrl = request.headers.get("paypal-cert-url");
    const authAlgo = request.headers.get("paypal-auth-algo");
    const transmissionSig = request.headers.get("paypal-transmission-sig");

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      console.error("[PayPal Webhook] Missing required headers for verification");
      return false;
    }

    // Get access token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      console.error("[PayPal Webhook] Failed to get access token");
      return false;
    }

    const { access_token } = await tokenResponse.json();

    // Verify the webhook signature
    const verifyResponse = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyResponse.ok) {
      console.error("[PayPal Webhook] Verification request failed");
      return false;
    }

    const verification = await verifyResponse.json();
    return verification.verification_status === "SUCCESS";
  } catch (error) {
    console.error("[PayPal Webhook] Verification error:", error);
    return false;
  }
}

/**
 * PayPal Webhook Handler
 * POST /api/webhooks/paypal
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const body = await request.text();

    // Verify webhook signature before processing
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error(`[PayPal Webhook] [${requestId}] Invalid webhook signature - rejecting request`);
      return NextResponse.json(
        { error: "Invalid webhook signature", requestId },
        { status: 401 }
      );
    }

    const event: PayPalWebhookEvent = JSON.parse(body);

    // Log webhook event for debugging
    console.log(`[PayPal Webhook] [${requestId}] Received event: ${event.event_type} (ID: ${event.id})`);

    // Idempotency check - prevent duplicate event processing
    const isProcessed = await convex.query(api.webhookEvents.queries.isEventProcessed, {
      eventId: event.id,
    });

    if (isProcessed) {
      console.log(`[PayPal Webhook] [${requestId}] Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true, requestId });
    }

    // Extract orderId from custom_id if available (for tracking)
    let orderId: string | undefined;
    try {
      if (event.resource?.custom_id) {
        const metadata = JSON.parse(event.resource.custom_id);
        orderId = metadata.orderId;
      }
    } catch {
      // custom_id may not be valid JSON, that's okay
    }

    // Handle different event types
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        await handlePaymentCaptureCompleted(event);
        break;

      case "PAYMENT.CAPTURE.DENIED":
        await handlePaymentCaptureDenied(event);
        break;

      case "PAYMENT.CAPTURE.REFUNDED":
        await handlePaymentRefunded(event);
        break;

      case "CHECKOUT.ORDER.APPROVED":
        await handleCheckoutOrderApproved(event);
        break;

      case "PAYMENT.SALE.COMPLETED":
        // Alternative payment completion event (may be sent for some payment flows)
        console.log("[PayPal Webhook] Sale completed:", event.resource?.id);
        // Process similar to PAYMENT.CAPTURE.COMPLETED
        await handlePaymentCaptureCompleted(event);
        break;

      case "CUSTOMER.DISPUTE.CREATED":
        await handleDisputeCreated(event);
        break;

      case "CUSTOMER.DISPUTE.RESOLVED":
        await handleDisputeResolved(event);
        break;

      default:
        console.log(`[PayPal Webhook] [${requestId}] Unhandled event type: ${event.event_type}`);
    }

    // Mark event as processed for idempotency
    await convex.mutation(api.webhookEvents.mutations.markEventProcessed, {
      eventId: event.id,
      eventType: event.event_type,
      provider: "paypal",
      orderId,
    });

    console.log(`[PayPal Webhook] [${requestId}] Successfully processed event ${event.id}`);
    return NextResponse.json({ received: true, requestId });
  } catch (error: unknown) {
    console.error(`[PayPal Webhook] [${requestId}] Error:`, getErrorMessage(error));
    return NextResponse.json(
      { error: "Webhook processing failed", requestId },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment capture
 */
async function handlePaymentCaptureCompleted(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const customId = resource?.custom_id;

  if (!customId) {
    console.log("[PayPal Webhook] No custom_id in payment capture");
    return;
  }

  try {
    const metadata = JSON.parse(customId);
    const orderId = metadata.orderId;

    if (orderId) {
      await convex.mutation(api.orders.mutations.markOrderPaid, {
        orderId: orderId as Id<"orders">,
        paymentIntentId: resource.id ?? "",
      });
      console.log(`[PayPal Webhook] Order ${orderId} marked as paid`);
    }
  } catch (error: unknown) {
    console.error("[PayPal Webhook] Failed to process payment capture:", getErrorMessage(error));
  }
}

/**
 * Handle denied payment capture
 */
async function handlePaymentCaptureDenied(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const customId = resource?.custom_id;

  console.log("[PayPal Webhook] Payment capture denied:", resource?.id);

  if (!customId) {
    console.log("[PayPal Webhook] No custom_id in denied payment capture");
    return;
  }

  try {
    const metadata = JSON.parse(customId);
    const orderId = metadata.orderId;

    if (orderId) {
      await convex.mutation(api.orders.mutations.markOrderFailed, {
        orderId: orderId as Id<"orders">,
        reason: "PayPal payment capture denied",
      });
      console.log(`[PayPal Webhook] Order ${orderId} marked as failed`);
    }
  } catch (error: unknown) {
    console.error("[PayPal Webhook] Failed to process denied payment:", getErrorMessage(error));
  }
}

/**
 * Handle refunded payment
 */
async function handlePaymentRefunded(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const customId = resource?.custom_id;

  console.log("[PayPal Webhook] Payment refunded:", resource?.id);

  if (!customId) {
    console.log("[PayPal Webhook] No custom_id in refunded payment - attempting lookup by PayPal order ID");
    // Try to find order by PayPal capture ID (resource.id might be the capture)
    // PayPal refund webhooks may not include custom_id, so we need to use the capture ID
    return;
  }

  try {
    const metadata = JSON.parse(customId);
    const orderId = metadata.orderId;
    const paypalOrderId = metadata.paypalOrderId;

    if (paypalOrderId) {
      // Use PayPal order ID to find and refund the order
      const result = await convex.mutation(api.orders.mutations.markOrderRefundedByPaypalId, {
        paypalOrderId: paypalOrderId,
        refundReason: "PayPal refund processed",
      });

      if (result.success) {
        console.log(`[PayPal Webhook] Order refunded via PayPal order ID ${paypalOrderId}`);
        if (result.inventoryReleased) {
          console.log(`[PayPal Webhook] Released ${result.inventoryReleased} tickets to inventory`);
        }
      } else {
        console.warn(`[PayPal Webhook] Failed to process refund: ${result.error}`);
      }
    } else if (orderId) {
      // Fallback: use orderId from metadata to mark as refunded
      // This requires a different approach since markOrderRefundedByPaypalId expects paypalOrderId
      console.log(`[PayPal Webhook] Refund received for order ${orderId} - manual processing may be required`);
    }
  } catch (error: unknown) {
    console.error("[PayPal Webhook] Failed to process refunded payment:", getErrorMessage(error));
  }
}

/**
 * Handle checkout order approved
 * This is triggered when a buyer approves the payment but before capture
 */
async function handleCheckoutOrderApproved(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const paypalOrderId = resource?.id;

  console.log("[PayPal Webhook] Order approved:", paypalOrderId);

  // Log the approval event for tracking purposes
  // The actual payment processing happens in PAYMENT.CAPTURE.COMPLETED
  // This event is useful for:
  // 1. Updating UI to show "payment approved, processing..."
  // 2. Reserving inventory if not done at order creation
  // 3. Analytics tracking

  if (paypalOrderId) {
    console.log(`[PayPal Webhook] PayPal order ${paypalOrderId} approved by buyer, awaiting capture`);
    // Note: No mutation needed here - capture happens client-side or via capture-order API
  }
}

/**
 * Handle dispute created
 * This is triggered when a buyer opens a dispute/chargeback
 */
async function handleDisputeCreated(event: PayPalWebhookEvent) {
  const resource = event.resource as {
    id?: string;
    reason?: string;
    dispute_amount?: { value?: string; currency_code?: string };
    disputed_transactions?: Array<{
      seller_transaction_id?: string;
      buyer?: { email?: string };
      custom?: string;
    }>;
    seller_response_due_date?: string;
  };

  const disputeId = resource?.id;
  if (!disputeId) {
    console.error("[PayPal Webhook] Dispute created but no dispute ID");
    return;
  }

  console.log("[PayPal Webhook] Dispute created:", disputeId);

  // Extract dispute details
  const disputeReason = resource?.reason || "unknown";
  const disputeAmount = resource?.dispute_amount?.value;
  const currency = resource?.dispute_amount?.currency_code || "USD";
  const transactionId = resource?.disputed_transactions?.[0]?.seller_transaction_id;
  const buyerEmail = resource?.disputed_transactions?.[0]?.buyer?.email;
  const customData = resource?.disputed_transactions?.[0]?.custom;
  const responseDueDate = resource?.seller_response_due_date;

  // Try to extract paypalOrderId from custom data
  let paypalOrderId: string | undefined;
  if (customData) {
    try {
      const parsed = JSON.parse(customData);
      paypalOrderId = parsed.paypalOrderId;
    } catch {
      // Not JSON, that's okay
    }
  }

  console.log(`[PayPal Webhook] Dispute details:`, {
    disputeId,
    reason: disputeReason,
    amount: disputeAmount,
    transactionId,
    buyerEmail,
    paypalOrderId,
  });

  // Create dispute record in database
  try {
    const amountCents = disputeAmount
      ? Math.round(parseFloat(disputeAmount) * 100)
      : 0;

    const result = await convex.mutation(
      api.paymentDisputes.mutations.createDispute,
      {
        disputeId,
        provider: "paypal",
        transactionId,
        paypalOrderId,
        reason: disputeReason,
        amountCents,
        currency,
        buyerEmail,
        responseDeadline: responseDueDate
          ? new Date(responseDueDate).getTime()
          : undefined,
      }
    );

    if (result.success) {
      console.log(
        `[PayPal Webhook] Dispute ${disputeId} recorded in database`
      );
    } else {
      console.error(
        `[PayPal Webhook] Failed to record dispute: ${result.alreadyExists ? "already exists" : "error"}`
      );
    }
  } catch (error) {
    console.error("[PayPal Webhook] Error creating dispute record:", error);
  }

  console.warn(
    `[PayPal Webhook] DISPUTE ALERT: PayPal dispute ${disputeId} created for transaction ${transactionId}. Amount: $${disputeAmount}. Reason: ${disputeReason}`
  );
}

/**
 * Handle dispute resolved
 * This is triggered when a dispute is resolved (won or lost)
 */
async function handleDisputeResolved(event: PayPalWebhookEvent) {
  const resource = event.resource as {
    id?: string;
    dispute_outcome?: {
      outcome_code?: string;
      outcome_reason?: string;
    };
  };

  const disputeId = resource?.id;
  if (!disputeId) {
    console.error("[PayPal Webhook] Dispute resolved but no dispute ID");
    return;
  }

  const outcomeCode = resource?.dispute_outcome?.outcome_code || "unknown";
  const outcomeReason = resource?.dispute_outcome?.outcome_reason;

  console.log(
    "[PayPal Webhook] Dispute resolved:",
    disputeId,
    "Outcome:",
    outcomeCode
  );

  // Outcomes can be:
  // - RESOLVED_BUYER_FAVOUR: Buyer won, funds returned to buyer
  // - RESOLVED_SELLER_FAVOUR: Seller won, funds kept by seller
  // - RESOLVED_WITH_PAYOUT: Partial resolution

  try {
    const result = await convex.mutation(
      api.paymentDisputes.mutations.resolveDispute,
      {
        disputeId,
        outcomeCode,
        outcomeReason,
      }
    );

    if (result.success) {
      console.log(
        `[PayPal Webhook] Dispute ${disputeId} marked as ${result.status} in database`
      );
    } else {
      console.error(
        `[PayPal Webhook] Failed to resolve dispute: ${result.error}`
      );
    }
  } catch (error) {
    console.error("[PayPal Webhook] Error resolving dispute:", error);
  }

  if (outcomeCode === "RESOLVED_BUYER_FAVOUR") {
    console.warn(
      `[PayPal Webhook] Dispute ${disputeId} resolved in BUYER's favor - funds returned to buyer`
    );
  } else if (outcomeCode === "RESOLVED_SELLER_FAVOUR") {
    console.log(
      `[PayPal Webhook] Dispute ${disputeId} resolved in SELLER's favor - funds retained`
    );
  } else {
    console.log(
      `[PayPal Webhook] Dispute ${disputeId} resolved with outcome: ${outcomeCode}`
    );
  }
}
