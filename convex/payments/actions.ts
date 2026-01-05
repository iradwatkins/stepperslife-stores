"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import Stripe from "stripe";

// Initialize Stripe client
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("[Stripe Actions] CRITICAL: STRIPE_SECRET_KEY is not set!");
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      // @ts-expect-error Using future API version
      apiVersion: "2025-10-29.clover",
    })
  : null;

/**
 * Process refund via Stripe API (internal - called from admin actions)
 */
export const processStripeRefund = internalAction({
  args: {
    paymentIntentId: v.string(),
    amountCents: v.optional(v.number()), // If not provided, refunds full amount
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!stripe) {
      return {
        success: false,
        error: "Stripe is not configured",
      };
    }

    try {
      // Create refund via Stripe API
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: args.paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          orderId: args.orderId,
          reason: args.reason || "Customer refund requested",
        },
      };

      // If amount specified, do partial refund
      if (args.amountCents) {
        refundParams.amount = args.amountCents;
      }

      const refund = await stripe.refunds.create(refundParams);

      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amountRefunded: refund.amount,
      };
    } catch (error: any) {
      console.error("[Stripe Refund] Error:", error);

      return {
        success: false,
        error: error?.message || "Refund processing failed",
      };
    }
  },
});
