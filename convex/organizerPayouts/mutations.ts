import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Minimum payout amount in cents ($25)
const MINIMUM_PAYOUT_AMOUNT = 2500;

// Generate payout number
function generatePayoutNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORG-PAY-${timestamp}-${random}`;
}

/**
 * Request a payout (organizer)
 * Creates a new payout request with the available balance
 */
export const requestPayout = mutation({
  args: {
    paymentMethod: v.optional(v.string()), // "stripe", "bank_transfer", "paypal"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    // Get current user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check for pending payout requests
    const existingPayouts = await ctx.db
      .query("organizerPayouts")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const hasPending = existingPayouts.some(
      (p) =>
        p.status === "PENDING" ||
        p.status === "APPROVED" ||
        p.status === "PROCESSING"
    );

    if (hasPending) {
      throw new Error("You already have a pending payout request");
    }

    // Calculate available balance from orders
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    let availableBalanceCents = 0;

    for (const event of events) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .filter((q) => q.eq(q.field("status"), "COMPLETED"))
        .collect();

      for (const order of orders) {
        const organizerRevenue =
          order.subtotalCents - (order.platformFeeCents || 0);
        availableBalanceCents += organizerRevenue;
      }
    }

    // Subtract already paid out amounts
    const completedPayouts = existingPayouts.filter(
      (p) => p.status === "COMPLETED"
    );
    const totalPaidOut = completedPayouts.reduce(
      (sum, p) => sum + p.amountCents,
      0
    );
    availableBalanceCents -= totalPaidOut;

    if (availableBalanceCents < MINIMUM_PAYOUT_AMOUNT) {
      throw new Error(
        `Minimum payout amount is $${(MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}. You have $${(availableBalanceCents / 100).toFixed(2)} available.`
      );
    }

    const now = Date.now();
    const payoutNumber = generatePayoutNumber();

    // Determine payment method - first check for default in organizerPaymentMethods table
    let paymentMethod = args.paymentMethod || "stripe";
    let paymentMethodId: string | undefined;

    if (!args.paymentMethod) {
      // Check for default payment method from organizer's saved methods (Story 11.1)
      const defaultMethod = await ctx.db
        .query("organizerPaymentMethods")
        .withIndex("by_organizer_default", (q) =>
          q.eq("organizerId", user._id).eq("isDefault", true)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (defaultMethod) {
        // Use the organizer's default payment method
        switch (defaultMethod.type) {
          case "bank_account":
            paymentMethod = "bank_transfer";
            break;
          case "paypal":
            paymentMethod = "paypal";
            break;
          case "stripe_connect":
            paymentMethod = "stripe";
            break;
        }
        paymentMethodId = defaultMethod._id;
      } else {
        // Fall back to legacy logic using user's connected accounts
        if (user.stripeConnectedAccountId && user.stripeAccountSetupComplete) {
          paymentMethod = "stripe";
        } else if (user.paypalMerchantId && user.paypalAccountSetupComplete) {
          paymentMethod = "paypal";
        } else {
          paymentMethod = "bank_transfer";
        }
      }
    }

    // Create payout request
    const payoutId = await ctx.db.insert("organizerPayouts", {
      organizerId: user._id,
      payoutNumber,
      amountCents: availableBalanceCents,
      status: "PENDING",
      paymentMethod,
      requestedAt: now,
    });

    return {
      payoutId,
      payoutNumber,
      amountCents: availableBalanceCents,
    };
  },
});

/**
 * Approve a payout (admin only)
 */
export const approvePayout = mutation({
  args: {
    payoutId: v.id("organizerPayouts"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized - admin access required");
    }

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "PENDING") {
      throw new Error("Can only approve pending payouts");
    }

    const now = Date.now();

    await ctx.db.patch(args.payoutId, {
      status: "APPROVED",
      processedAt: now,
      adminNotes: args.adminNotes,
    });

    return { success: true, payoutId: args.payoutId };
  },
});

/**
 * Reject a payout (admin only)
 */
export const rejectPayout = mutation({
  args: {
    payoutId: v.id("organizerPayouts"),
    rejectionReason: v.string(),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized - admin access required");
    }

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "PENDING" && payout.status !== "APPROVED") {
      throw new Error("Can only reject pending or approved payouts");
    }

    const now = Date.now();

    await ctx.db.patch(args.payoutId, {
      status: "REJECTED",
      processedAt: now,
      rejectionReason: args.rejectionReason,
      adminNotes: args.adminNotes,
    });

    return { success: true, payoutId: args.payoutId };
  },
});

/**
 * Mark payout as processing (admin only)
 * Use this when starting to process the payment
 */
export const startProcessingPayout = mutation({
  args: {
    payoutId: v.id("organizerPayouts"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized - admin access required");
    }

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "APPROVED") {
      throw new Error("Can only process approved payouts");
    }

    await ctx.db.patch(args.payoutId, {
      status: "PROCESSING",
      adminNotes: args.adminNotes || payout.adminNotes,
    });

    return { success: true, payoutId: args.payoutId };
  },
});

/**
 * Complete a payout (admin only)
 * Use this after the payment has been sent
 */
export const completePayout = mutation({
  args: {
    payoutId: v.id("organizerPayouts"),
    stripeTransferId: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized - admin access required");
    }

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "APPROVED" && payout.status !== "PROCESSING") {
      throw new Error("Can only complete approved or processing payouts");
    }

    const now = Date.now();

    await ctx.db.patch(args.payoutId, {
      status: "COMPLETED",
      completedAt: now,
      stripeTransferId: args.stripeTransferId,
      adminNotes: args.adminNotes || payout.adminNotes,
    });

    return { success: true, payoutId: args.payoutId };
  },
});

/**
 * Mark payout as failed (admin only)
 * Use this if the payment transfer failed
 */
export const markPayoutFailed = mutation({
  args: {
    payoutId: v.id("organizerPayouts"),
    adminNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized - admin access required");
    }

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status === "COMPLETED") {
      throw new Error("Cannot fail a completed payout");
    }

    const now = Date.now();

    await ctx.db.patch(args.payoutId, {
      status: "FAILED",
      processedAt: now,
      adminNotes: args.adminNotes,
    });

    return { success: true, payoutId: args.payoutId };
  },
});
