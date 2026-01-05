"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Refund order (admin action - processes refund via Stripe API + updates database)
 */
export const refundOrder = action({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; ticketsRefunded: number }> => {
    // Get order details
    const order = await ctx.runQuery(internal.adminPanel.queries.getOrderForRefund, {
      orderId: args.orderId,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "COMPLETED") {
      throw new Error("Can only refund completed orders");
    }

    // Process refund via Stripe API if payment exists
    if (order.paymentId && order.paymentId.startsWith("pi_")) {
      // Stripe payment - use Stripe refund
      const refundResult = await ctx.runAction(
        internal.payments.actions.processStripeRefund,
        {
          paymentIntentId: order.paymentId,
          amountCents: order.totalCents,
          orderId: args.orderId,
          reason: args.reason,
        }
      );

      if (!refundResult.success) {
        throw new Error(`Refund processing failed: ${refundResult.error}`);
      }
    } else if (order.paymentMethod === "PAYPAL" && order.paymentId) {
      // PayPal payments require manual refund through PayPal dashboard
      console.warn("[Refund] PayPal payment - manual refund required via PayPal dashboard");
    } else if (order.paymentMethod === "CASH" || order.paymentMethod === "CASH_APP") {
      // Cash/CashApp payments don't need API refund
      console.log("[Refund] Cash/CashApp payment - no API refund needed");
    } else if (!order.paymentId) {
      console.warn("[Refund] No payment ID found - marking as refunded without processing payment");
    }

    // Update database to mark order and tickets as refunded
    const result = await ctx.runMutation(internal.adminPanel.mutations.markOrderRefunded, {
      orderId: args.orderId,
    });

    return result;
  },
});
