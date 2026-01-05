import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Create a new dispute record
 * Called from webhook handlers (PayPal/Stripe)
 */
export const createDispute = mutation({
  args: {
    disputeId: v.string(),
    provider: v.union(v.literal("stripe"), v.literal("paypal")),
    transactionId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    reason: v.string(),
    amountCents: v.number(),
    currency: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
    responseDeadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if dispute already exists
    const existing = await ctx.db
      .query("paymentDisputes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", args.disputeId))
      .first();

    if (existing) {
      console.log(`[createDispute] Dispute ${args.disputeId} already exists`);
      return { success: true, disputeId: existing._id, alreadyExists: true };
    }

    // Try to find the associated order
    let orderId: Id<"orders"> | undefined;
    let eventId: Id<"events"> | undefined;
    let organizerId: Id<"users"> | undefined;

    if (args.paypalOrderId) {
      const order = await ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("paypalOrderId"), args.paypalOrderId))
        .first();

      if (order) {
        orderId = order._id;
        eventId = order.eventId;

        // Get event to find organizer
        const event = await ctx.db.get(order.eventId);
        if (event?.organizerId) {
          organizerId = event.organizerId;
        }

        // Mark order as disputed
        await ctx.db.patch(order._id, {
          status: "DISPUTED",
        });
      }
    }

    if (args.stripePaymentIntentId) {
      const order = await ctx.db
        .query("orders")
        .filter((q) =>
          q.eq(q.field("stripePaymentIntentId"), args.stripePaymentIntentId)
        )
        .first();

      if (order) {
        orderId = order._id;
        eventId = order.eventId;

        const event = await ctx.db.get(order.eventId);
        if (event?.organizerId) {
          organizerId = event.organizerId;
        }

        // Mark order as disputed
        await ctx.db.patch(order._id, {
          status: "DISPUTED",
        });
      }
    }

    // Create the dispute record
    const id = await ctx.db.insert("paymentDisputes", {
      disputeId: args.disputeId,
      provider: args.provider,
      orderId,
      eventId,
      organizerId,
      transactionId: args.transactionId,
      paypalOrderId: args.paypalOrderId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      reason: args.reason,
      amountCents: args.amountCents,
      currency: args.currency || "USD",
      buyerEmail: args.buyerEmail,
      status: "OPEN",
      responseDeadline: args.responseDeadline,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[createDispute] Created dispute ${id} for ${args.disputeId}`);

    return { success: true, disputeId: id };
  },
});

/**
 * Update dispute status when resolved
 * Called from webhook handlers (PayPal/Stripe)
 */
export const resolveDispute = mutation({
  args: {
    disputeId: v.string(), // Provider's dispute ID
    outcomeCode: v.string(),
    outcomeReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const dispute = await ctx.db
      .query("paymentDisputes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", args.disputeId))
      .first();

    if (!dispute) {
      console.warn(`[resolveDispute] Dispute ${args.disputeId} not found`);
      return { success: false, error: "Dispute not found" };
    }

    // Map outcome codes to status
    let status: "WON" | "LOST" | "CLOSED";
    if (
      args.outcomeCode === "RESOLVED_SELLER_FAVOUR" ||
      args.outcomeCode === "charge_refunded" // Stripe: we won
    ) {
      status = "WON";
    } else if (
      args.outcomeCode === "RESOLVED_BUYER_FAVOUR" ||
      args.outcomeCode === "lost" // Stripe: buyer won (chargeback)
    ) {
      status = "LOST";
    } else {
      status = "CLOSED";
    }

    // Update dispute
    await ctx.db.patch(dispute._id, {
      status,
      outcomeCode: args.outcomeCode,
      outcomeReason: args.outcomeReason,
      resolvedAt: now,
      updatedAt: now,
    });

    // If we lost the dispute, mark order as refunded and release inventory
    if (status === "LOST" && dispute.orderId) {
      const order = await ctx.db.get(dispute.orderId);
      if (order && order.status !== "REFUNDED") {
        await ctx.db.patch(order._id, {
          status: "REFUNDED",
        });

        // Release tickets
        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        for (const ticket of tickets) {
          await ctx.db.patch(ticket._id, {
            status: "REFUNDED",
          });
        }

        console.log(
          `[resolveDispute] Order ${order._id} refunded due to chargeback, ${tickets.length} tickets released`
        );
      }
    }

    // If we won, restore order status to COMPLETED
    if (status === "WON" && dispute.orderId) {
      const order = await ctx.db.get(dispute.orderId);
      if (order && order.status === "DISPUTED") {
        await ctx.db.patch(order._id, {
          status: "COMPLETED",
        });
        console.log(
          `[resolveDispute] Order ${order._id} restored to COMPLETED after winning dispute`
        );
      }
    }

    return { success: true, status };
  },
});

/**
 * Add internal notes to a dispute (admin only)
 */
export const addDisputeNotes = mutation({
  args: {
    disputeId: v.id("paymentDisputes"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let user;
    if (!identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", PRIMARY_ADMIN_EMAIL))
        .first();
    } else {
      const email =
        typeof identity === "object" ? identity.email : undefined;
      if (!email) throw new Error("Unauthorized");

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    await ctx.db.patch(args.disputeId, {
      internalNotes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark evidence as submitted (admin only)
 */
export const markEvidenceSubmitted = mutation({
  args: {
    disputeId: v.id("paymentDisputes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let user;
    if (!identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", PRIMARY_ADMIN_EMAIL))
        .first();
    } else {
      const email =
        typeof identity === "object" ? identity.email : undefined;
      if (!email) throw new Error("Unauthorized");

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    await ctx.db.patch(args.disputeId, {
      evidenceSubmitted: true,
      evidenceSubmittedAt: Date.now(),
      status: "UNDER_REVIEW",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
