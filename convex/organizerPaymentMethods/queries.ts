import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all payment methods for the current organizer
 */
export const getMyPaymentMethods = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return [];
    }

    const paymentMethods = await ctx.db
      .query("organizerPaymentMethods")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    // Sort by isDefault first, then by createdAt
    return paymentMethods.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * Get a single payment method by ID
 */
export const getPaymentMethodById = query({
  args: {
    paymentMethodId: v.id("organizerPaymentMethods"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return null;
    }

    const paymentMethod = await ctx.db.get(args.paymentMethodId);

    // Verify ownership
    if (!paymentMethod || paymentMethod.organizerId !== user._id) {
      return null;
    }

    return paymentMethod;
  },
});

/**
 * Get the default payment method for the current organizer
 */
export const getDefaultPaymentMethod = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return null;
    }

    const defaultMethod = await ctx.db
      .query("organizerPaymentMethods")
      .withIndex("by_organizer_default", (q) =>
        q.eq("organizerId", user._id).eq("isDefault", true)
      )
      .first();

    return defaultMethod;
  },
});

/**
 * Check if organizer has any active payment method
 */
export const hasActivePaymentMethod = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return false;
    }

    const paymentMethods = await ctx.db
      .query("organizerPaymentMethods")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return paymentMethods !== null;
  },
});

/**
 * Get payment method summary for payout display
 * Returns masked info suitable for display in payout requests
 */
export const getPaymentMethodSummary = query({
  args: {
    paymentMethodId: v.id("organizerPaymentMethods"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return null;
    }

    const paymentMethod = await ctx.db.get(args.paymentMethodId);

    if (!paymentMethod || paymentMethod.organizerId !== user._id) {
      return null;
    }

    // Return masked summary based on type
    switch (paymentMethod.type) {
      case "bank_account":
        return {
          type: "bank_account",
          displayName:
            paymentMethod.nickname ||
            `${paymentMethod.bankName} ****${paymentMethod.accountNumberLast4}`,
          details: `${paymentMethod.accountType} account ending in ${paymentMethod.accountNumberLast4}`,
        };
      case "paypal":
        const maskedEmail = paymentMethod.paypalEmail
          ? `${paymentMethod.paypalEmail.substring(0, 3)}***@${paymentMethod.paypalEmail.split("@")[1]}`
          : "";
        return {
          type: "paypal",
          displayName: paymentMethod.nickname || `PayPal (${maskedEmail})`,
          details: maskedEmail,
        };
      case "stripe_connect":
        return {
          type: "stripe_connect",
          displayName: paymentMethod.nickname || "Stripe Connected Account",
          details: `Status: ${paymentMethod.stripeAccountStatus || "pending"}`,
        };
      default:
        return null;
    }
  },
});
