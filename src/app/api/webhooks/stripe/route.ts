import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { randomUUID } from "crypto";

/** Type-safe error message extraction */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Generate or extract request ID for tracking */
function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") || `stripe-wh-${randomUUID()}`;
}

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!STRIPE_SECRET_KEY) {
  console.error("[Stripe Webhook] CRITICAL: STRIPE_SECRET_KEY is not set!");
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.error("[Stripe Webhook] WARNING: STRIPE_WEBHOOK_SECRET is not set!");
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
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles the following events:
 * - checkout.session.completed: Payment succeeded
 * - payment_intent.succeeded: Payment intent succeeded
 * - payment_intent.payment_failed: Payment failed
 * - account.updated: Connect account status changed
 * - charge.refunded: Payment was refunded
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    if (!stripe) {
      console.error(`[Stripe Webhook] [${requestId}] Stripe not configured`);
      return NextResponse.json(
        { error: "Stripe is not configured", requestId },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error(`[Stripe Webhook] [${requestId}] No signature found in request`);
      return NextResponse.json({ error: "No signature", requestId }, { status: 400 });
    }

    // Verify webhook signature - REQUIRED in production
    let event: Stripe.Event;
    const isProduction = process.env.NODE_ENV === "production";

    if (STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err: unknown) {
        console.error(`[Stripe Webhook] [${requestId}] Signature verification failed:`, getErrorMessage(err));
        return NextResponse.json(
          { error: "Webhook signature verification failed", requestId },
          { status: 400 }
        );
      }
    } else if (isProduction) {
      // Reject unverified webhooks in production
      console.error(`[Stripe Webhook] [${requestId}] CRITICAL: No webhook secret in production!`);
      return NextResponse.json(
        { error: "Webhook verification required", requestId },
        { status: 403 }
      );
    } else {
      // Parse event without verification (development only)
      console.warn(`[Stripe Webhook] [${requestId}] DEV ONLY: Processing webhook without signature verification`);
      try {
        event = JSON.parse(body) as Stripe.Event;
      } catch {
        return NextResponse.json(
          { error: "Invalid webhook payload", requestId },
          { status: 400 }
        );
      }
    }


    // Check for duplicate event processing (idempotency)
    const isProcessed = await convex.query(api.webhookEvents.queries.isEventProcessed, {
      eventId: event.id,
    });

    if (isProcessed) {
      console.log(`[Stripe Webhook] [${requestId}] Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true, requestId });
    }

    console.log(`[Stripe Webhook] [${requestId}] Processing event ${event.id} (${event.type})`);


    // Handle the event
    let orderId: string | undefined;

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        orderId = paymentIntent.metadata?.orderId;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      // Subscription lifecycle events
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
    }

    // Mark event as processed
    await convex.mutation(api.webhookEvents.mutations.markEventProcessed, {
      eventId: event.id,
      eventType: event.type,
      provider: "stripe",
      orderId,
    });

    console.log(`[Stripe Webhook] [${requestId}] Successfully processed event ${event.id}`);
    return NextResponse.json({ received: true, requestId });
  } catch (error: unknown) {
    console.error(`[Stripe Webhook] [${requestId}] Processing error:`, error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Webhook processing failed", requestId },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {

  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.warn("[Stripe Webhook] No orderId in session metadata");
    return;
  }

  try {
    // Update order status in Convex
    await convex.mutation(api.orders.mutations.markOrderPaid, {
      orderId: orderId as Id<"orders">,
      paymentIntentId: session.payment_intent as string,
    });

  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to update order ${orderId}:`, getErrorMessage(error));
  }
}

/**
 * Handle successful payment intent
 * Handles ticket orders, product orders (marketplace), and platform products
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  const chargeType = metadata?.chargeType;
  const productType = metadata?.productType;

  // Check if this is a platform product payment (100% to platform)
  if (chargeType === "PLATFORM" && productType) {
    await handlePlatformProductPayment(paymentIntent);
    return;
  }

  // Check if this is a marketplace product order
  if (chargeType === "PRODUCT_ORDER") {
    await handleProductOrderPayment(paymentIntent);
    return;
  }

  // Check if this is a food order
  if (chargeType === "FOOD_ORDER") {
    await handleFoodOrderPayment(paymentIntent);
    return;
  }

  // Otherwise, handle as a ticket order payment (split payment)
  const orderId = metadata?.orderId;
  if (!orderId) {
    console.warn("[Stripe Webhook] No orderId in payment intent metadata");
    return;
  }

  try {
    // Update order status in Convex
    await convex.mutation(api.orders.mutations.markOrderPaid, {
      orderId: orderId as Id<"orders">,
      paymentIntentId: paymentIntent.id,
    });

    // Record debt settlement if this payment included a settlement amount
    const settlementAmount = parseInt(metadata?.settlementAmount || "0", 10);
    const organizerId = metadata?.organizerId;
    const eventId = metadata?.eventId;

    if (settlementAmount > 0 && organizerId) {
      try {
        await convex.mutation(api.platformDebt.mutations.recordSettlement, {
          organizerId,
          orderId,
          eventId,
          settlementAmountCents: settlementAmount,
        });
        console.log(
          `[Stripe Webhook] Recorded debt settlement for organizer ${organizerId}: $${(settlementAmount / 100).toFixed(2)}`
        );
      } catch (settlementError: unknown) {
        console.error(
          `[Stripe Webhook] Failed to record debt settlement for order ${orderId}:`,
          getErrorMessage(settlementError)
        );
        // Don't fail the order - the debt will be collected on the next payment
      }
    }

  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to update order ${orderId}:`, getErrorMessage(error));
  }
}

/**
 * Handle marketplace product order payments with split payments
 */
async function handleProductOrderPayment(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  const orderId = metadata?.orderId;
  const vendorId = metadata?.vendorId;
  const commissionPercent = parseInt(metadata?.commissionPercent || "15", 10);
  const applicationFee = parseInt(metadata?.applicationFee || "0", 10);

  console.log("[Stripe Webhook] Processing product order payment:", {
    paymentIntentId: paymentIntent.id,
    orderId,
    vendorId,
    amount: paymentIntent.amount,
    applicationFee,
  });

  if (!orderId) {
    console.warn("[Stripe Webhook] No orderId in product order metadata");
    return;
  }

  try {
    // 1. Update order payment status to PAID
    await convex.mutation(api.productOrders.mutations.updatePaymentStatus, {
      orderId: orderId as Id<"productOrders">,
      paymentStatus: "PAID",
      paymentMethod: "stripe",
      stripePaymentIntentId: paymentIntent.id,
    });
    console.log(`[Stripe Webhook] Product order ${orderId} marked as PAID`);

    // 2. Create vendor earnings record if we have a vendor
    if (vendorId) {
      try {
        // Get order details for earnings
        const orderData = await convex.query(api.productOrders.queries.getOrderById, {
          orderId: orderId as Id<"productOrders">,
        });

        if (orderData) {
          await convex.mutation(api.vendorEarnings.createFromOrder, {
            vendorId: vendorId as Id<"vendors">,
            orderId: orderId as Id<"productOrders">,
            orderNumber: orderData.orderNumber,
            grossAmount: orderData.subtotal, // Use subtotal (before tax/shipping) for commission
            commissionRate: commissionPercent,
          });
          console.log(`[Stripe Webhook] Vendor earnings created for order ${orderId}`);
        }
      } catch (earningsError: unknown) {
        console.error(`[Stripe Webhook] Failed to create vendor earnings:`, getErrorMessage(earningsError));
        // Don't fail the webhook - the order is still paid
      }

      // 3. Update vendor stats
      try {
        await convex.mutation(api.vendors.updateStats, {
          id: vendorId as Id<"vendors">,
          saleAmount: paymentIntent.amount - applicationFee,
          earningsAmount: paymentIntent.amount - applicationFee,
        });
        console.log(`[Stripe Webhook] Vendor stats updated for ${vendorId}`);
      } catch (statsError: unknown) {
        console.error(`[Stripe Webhook] Failed to update vendor stats:`, getErrorMessage(statsError));
      }
    }

  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to process product order ${orderId}:`, getErrorMessage(error));
  }
}

/**
 * Handle food order payments
 */
async function handleFoodOrderPayment(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  const orderId = metadata?.orderId;

  console.log("[Stripe Webhook] Processing food order payment:", {
    paymentIntentId: paymentIntent.id,
    orderId,
    amount: paymentIntent.amount,
  });

  if (!orderId) {
    console.warn("[Stripe Webhook] No orderId in food order metadata");
    return;
  }

  try {
    // Update food order payment status to PAID
    await convex.mutation(api.foodOrders.updatePaymentStatus, {
      orderId: orderId as Id<"foodOrders">,
      paymentStatus: "PAID",
      stripePaymentIntentId: paymentIntent.id,
    });
    console.log(`[Stripe Webhook] Food order ${orderId} marked as PAID`);

  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to process food order ${orderId}:`, getErrorMessage(error));
  }
}

/**
 * Handle platform product payments (100% to platform)
 * - Credit purchases
 * - Subscriptions
 * - Promotions
 * - Premium features
 */
async function handlePlatformProductPayment(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  const productType = metadata?.productType;
  const userId = metadata?.userId;

  if (!productType || !userId) {
    console.warn("[Stripe Webhook] Missing productType or userId in platform payment metadata");
    return;
  }

  try {
    switch (productType) {
      case "CREDITS":
        // Confirm credit purchase - this updates the organizer's credit balance
        const ticketQuantity = parseInt(metadata?.ticketQuantity || "0", 10);
        const pricePerTicket = parseInt(metadata?.pricePerTicket || "0", 10);

        await convex.mutation(api.credits.mutations.confirmCreditPurchase, {
          organizerId: userId as Id<"users">,
          stripePaymentIntentId: paymentIntent.id,
          ticketsPurchased: ticketQuantity,
          amountPaid: paymentIntent.amount,
          pricePerTicket: pricePerTicket,
        });
        console.log(`[Stripe Webhook] Credit purchase confirmed for user ${userId}: ${ticketQuantity} tickets`);
        break;

      case "SUBSCRIPTION":
        // Handle subscription activation
        const subscriptionPlan = metadata?.subscriptionPlan || "BASIC";
        const stripeCustomerId = metadata?.stripeCustomerId;
        const stripePriceId = metadata?.stripePriceId;
        const stripeSubscriptionId = metadata?.stripeSubscriptionId;

        // Map plan names to valid enum values
        type ValidPlan = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
        const planMap: Record<string, ValidPlan> = {
          basic: "BASIC",
          pro: "PRO",
          enterprise: "ENTERPRISE",
          free: "FREE",
          BASIC: "BASIC",
          PRO: "PRO",
          ENTERPRISE: "ENTERPRISE",
          FREE: "FREE",
        };
        const normalizedPlan: ValidPlan = planMap[subscriptionPlan] || "BASIC";

        await convex.mutation(api.subscriptions.mutations.activateSubscription, {
          userId: userId as Id<"users">,
          plan: normalizedPlan,
          stripeSubscriptionId: stripeSubscriptionId,
          stripeCustomerId: stripeCustomerId,
          stripePriceId: stripePriceId,
          paymentAmount: paymentIntent.amount,
        });
        console.log(`[Stripe Webhook] Subscription ${normalizedPlan} activated for user ${userId}`);
        break;

      case "PROMOTION":
        // Handle event promotion purchase
        const eventIdForPromo = metadata?.eventId;
        const promoType = metadata?.promotionType || "FEATURED";

        if (!eventIdForPromo) {
          console.warn("[Stripe Webhook] Promotion payment missing eventId");
          break;
        }

        // Map promotion type to valid enum values
        type ValidPromo = "FEATURED" | "HOMEPAGE" | "CATEGORY" | "SEARCH_BOOST";
        const promoMap: Record<string, ValidPromo> = {
          featured: "FEATURED",
          homepage: "HOMEPAGE",
          category: "CATEGORY",
          search_boost: "SEARCH_BOOST",
          FEATURED: "FEATURED",
          HOMEPAGE: "HOMEPAGE",
          CATEGORY: "CATEGORY",
          SEARCH_BOOST: "SEARCH_BOOST",
        };
        const normalizedPromo: ValidPromo = promoMap[promoType] || "FEATURED";

        await convex.mutation(api.promotions.mutations.activatePromotion, {
          eventId: eventIdForPromo as Id<"events">,
          promotionType: normalizedPromo,
          stripePaymentIntentId: paymentIntent.id,
          amountPaid: paymentIntent.amount,
        });
        console.log(`[Stripe Webhook] Promotion ${normalizedPromo} activated for event ${eventIdForPromo}`);
        break;

      case "PREMIUM_FEATURE":
        // Handle premium feature purchase
        console.log(`[Stripe Webhook] Premium feature purchase for user ${userId}`);
        // TODO: DEFERRED - Implement premium feature activation when system is built
        break;

      default:
        console.warn(`[Stripe Webhook] Unknown platform product type: ${productType}`);
    }
  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to process platform payment for ${productType}:`, getErrorMessage(error));
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {

  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) {
    console.warn("[Stripe Webhook] No orderId in payment intent metadata");
    return;
  }

  try {
    // Update order status to failed in Convex
    await convex.mutation(api.orders.mutations.markOrderFailed, {
      orderId: orderId as Id<"orders">,
      reason: paymentIntent.last_payment_error?.message || "Payment failed",
    });

  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to update order ${orderId}:`, getErrorMessage(error));
  }
}

/**
 * Handle Connect account updates
 */
async function handleAccountUpdated(account: Stripe.Account) {

  // Check if account setup is complete
  const isComplete =
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled &&
    (!account.requirements?.currently_due || account.requirements.currently_due.length === 0);

  try {
    // Update user's Stripe account status in Convex
    await convex.mutation(api.users.mutations.updateStripeAccountStatus, {
      accountId: account.id,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      detailsSubmitted: account.details_submitted || false,
    });

  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to update account ${account.id}:`, getErrorMessage(error));
  }
}

/**
 * Handle charge refunds
 */
async function handleChargeRefunded(charge: Stripe.Charge) {

  const paymentIntentId = charge.payment_intent as string;
  if (!paymentIntentId) {
    console.warn("[Stripe Webhook] No payment intent ID in charge");
    return;
  }

  try {
    // Find and update order with refund status
    const result = await convex.mutation(api.orders.mutations.markOrderRefunded, {
      paymentIntentId: paymentIntentId,
      refundAmount: charge.amount_refunded,
      refundReason: charge.refunds?.data[0]?.reason || "requested_by_customer",
    });

    // If refund was processed successfully, send notification email
    if (result.success && !result.alreadyRefunded) {
      try {
        // Get order details for the email
        const orderData = await getOrderDetailsForRefundEmail(paymentIntentId);

        if (orderData) {
          const emailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://stepperslife.com'}/api/send-refund-notification`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: orderData.email,
                customerName: orderData.customerName,
                eventName: orderData.eventName,
                eventDate: orderData.eventDate,
                refundAmount: charge.amount_refunded,
                ticketCount: result.ticketsCancelled || 1,
                orderNumber: orderData.orderNumber,
                refundReason: charge.refunds?.data[0]?.reason || undefined,
              }),
            }
          );

          if (emailResponse.ok) {
            console.log(`[Stripe Webhook] Refund notification sent to ${orderData.email}`);
          } else {
            console.warn(`[Stripe Webhook] Failed to send refund notification email`);
          }
        }
      } catch (emailError: unknown) {
        // Don't fail the webhook if email fails
        console.error(`[Stripe Webhook] Error sending refund email:`, getErrorMessage(emailError));
      }
    }

  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to process refund for ${paymentIntentId}:`, getErrorMessage(error));
  }
}

/**
 * Helper to get order details for refund email
 */
async function getOrderDetailsForRefundEmail(paymentIntentId: string): Promise<{
  email: string;
  customerName: string;
  eventName: string;
  eventDate?: number;
  orderNumber: string;
} | null> {
  try {
    // Query order by payment intent ID
    const orderData = await convex.query(api.orders.queries.getOrderByPaymentIntent, {
      paymentIntentId,
    });

    if (!orderData) {
      console.warn(`[Stripe Webhook] No order found for refund email: ${paymentIntentId}`);
      return null;
    }

    return {
      email: orderData.email || '',
      customerName: orderData.buyerName || 'Valued Customer',
      eventName: orderData.eventName || 'Event',
      eventDate: orderData.eventDate,
      orderNumber: orderData.orderNumber || orderData._id.substring(0, 12).toUpperCase(),
    };
  } catch (error) {
    console.error(`[Stripe Webhook] Error getting order details for refund email:`, error);
    return null;
  }
}

/**
 * Handle subscription creation or update
 * Syncs subscription status from Stripe to Convex
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  console.log(`[Stripe Webhook] Subscription ${subscription.status}: ${stripeSubscriptionId}`);

  if (!userId) {
    console.warn(`[Stripe Webhook] No userId in subscription metadata for ${stripeSubscriptionId}`);
    return;
  }

  try {
    // Map Stripe subscription status to plan activation
    if (subscription.status === "active" || subscription.status === "trialing") {
      // Get plan from price metadata or default to BASIC
      const priceId = subscription.items.data[0]?.price.id;
      const planFromMetadata = subscription.metadata?.plan || "BASIC";

      type ValidPlan = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
      const planMap: Record<string, ValidPlan> = {
        basic: "BASIC",
        pro: "PRO",
        enterprise: "ENTERPRISE",
        free: "FREE",
        BASIC: "BASIC",
        PRO: "PRO",
        ENTERPRISE: "ENTERPRISE",
        FREE: "FREE",
      };
      const plan: ValidPlan = planMap[planFromMetadata] || "BASIC";

      await convex.mutation(api.subscriptions.mutations.activateSubscription, {
        userId: userId as Id<"users">,
        plan,
        stripeSubscriptionId,
        stripeCustomerId,
        stripePriceId: priceId,
      });

      console.log(`[Stripe Webhook] Subscription activated for user ${userId}: ${plan}`);
    } else if (subscription.status === "past_due") {
      await convex.mutation(api.subscriptions.mutations.handlePaymentFailed, {
        stripeSubscriptionId,
      });
      console.log(`[Stripe Webhook] Subscription marked past_due for ${stripeSubscriptionId}`);
    }
  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to update subscription ${stripeSubscriptionId}:`, getErrorMessage(error));
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  console.log(`[Stripe Webhook] Subscription cancelled: ${stripeSubscriptionId}`);

  try {
    await convex.mutation(api.subscriptions.mutations.cancelSubscription, {
      stripeSubscriptionId,
      immediate: true,
    });

    console.log(`[Stripe Webhook] Subscription ${stripeSubscriptionId} cancelled in database`);
  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to cancel subscription ${stripeSubscriptionId}:`, getErrorMessage(error));
  }
}

/**
 * Handle failed invoice payment (subscription renewal failure)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // In newer Stripe API versions, subscription may be in a different location
  // Use type assertion since we know the structure from webhook data
  const stripeSubscriptionId = (invoice as unknown as { subscription?: string | null }).subscription as string;

  if (!stripeSubscriptionId) {
    console.log(`[Stripe Webhook] Invoice payment failed but no subscription attached`);
    return;
  }

  console.log(`[Stripe Webhook] Invoice payment failed for subscription: ${stripeSubscriptionId}`);

  try {
    await convex.mutation(api.subscriptions.mutations.handlePaymentFailed, {
      stripeSubscriptionId,
      attemptCount: invoice.attempt_count,
    });

    console.log(`[Stripe Webhook] Marked subscription ${stripeSubscriptionId} as payment failed`);
  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to handle payment failure for ${stripeSubscriptionId}:`, getErrorMessage(error));
  }
}

/**
 * Handle successful invoice payment (subscription renewal)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // In newer Stripe API versions, subscription may be in a different location
  // Use type assertion since we know the structure from webhook data
  const stripeSubscriptionId = (invoice as unknown as { subscription?: string | null }).subscription as string;

  if (!stripeSubscriptionId) {
    // One-time invoice, not a subscription renewal
    return;
  }

  // Only process subscription renewals (not initial payments which are handled by payment_intent.succeeded)
  if (invoice.billing_reason !== "subscription_cycle") {
    return;
  }

  console.log(`[Stripe Webhook] Subscription renewal paid: ${stripeSubscriptionId}`);

  try {
    await convex.mutation(api.subscriptions.mutations.handleRenewalSuccess, {
      stripeSubscriptionId,
      paymentAmount: invoice.amount_paid,
    });

    console.log(`[Stripe Webhook] Subscription ${stripeSubscriptionId} renewed successfully`);
  } catch (error: unknown) {
    console.error(`[Stripe Webhook] Failed to process renewal for ${stripeSubscriptionId}:`, getErrorMessage(error));
  }
}
