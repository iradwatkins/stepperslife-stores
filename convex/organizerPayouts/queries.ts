import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get payouts for the current organizer
 * Returns all payout requests sorted by most recent first
 */
export const getOrganizerPayouts = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("APPROVED"),
        v.literal("PROCESSING"),
        v.literal("COMPLETED"),
        v.literal("REJECTED"),
        v.literal("FAILED")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return [];
    }

    // Get current user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return [];
    }

    // Get payouts for this organizer
    const payouts = await ctx.db
      .query("organizerPayouts")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .order("desc")
      .collect();

    // Filter by status if provided
    if (args.status) {
      return payouts.filter((p) => p.status === args.status);
    }

    return payouts;
  },
});

/**
 * Get a single payout by ID
 */
export const getPayoutById = query({
  args: { id: v.id("organizerPayouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get admin payout queue - All pending payouts for admin review
 * Requires admin role
 */
export const getAdminPayoutQueue = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("APPROVED"),
        v.literal("PROCESSING"),
        v.literal("COMPLETED"),
        v.literal("REJECTED"),
        v.literal("FAILED")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return [];
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user || user.role !== "admin") {
      return [];
    }

    // Get payouts based on status filter
    if (args.status) {
      const payouts = await ctx.db
        .query("organizerPayouts")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();

      // Enrich with organizer info
      return await Promise.all(
        payouts.map(async (payout) => {
          const organizer = await ctx.db.get(payout.organizerId);
          return {
            ...payout,
            organizerName: organizer?.name || "Unknown",
            organizerEmail: organizer?.email || "Unknown",
          };
        })
      );
    }

    // Get all payouts if no status filter
    const payouts = await ctx.db
      .query("organizerPayouts")
      .order("desc")
      .collect();

    // Enrich with organizer info
    return await Promise.all(
      payouts.map(async (payout) => {
        const organizer = await ctx.db.get(payout.organizerId);
        return {
          ...payout,
          organizerName: organizer?.name || "Unknown",
          organizerEmail: organizer?.email || "Unknown",
        };
      })
    );
  },
});

/**
 * Get payout statistics for the current organizer
 */
export const getPayoutStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return {
        totalPayouts: 0,
        pendingCount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        approvedAmount: 0,
        processingCount: 0,
        processingAmount: 0,
        completedCount: 0,
        completedAmount: 0,
        rejectedCount: 0,
        failedCount: 0,
        totalPaidOut: 0,
      };
    }

    // Get current user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return {
        totalPayouts: 0,
        pendingCount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        approvedAmount: 0,
        processingCount: 0,
        processingAmount: 0,
        completedCount: 0,
        completedAmount: 0,
        rejectedCount: 0,
        failedCount: 0,
        totalPaidOut: 0,
      };
    }

    // Get all payouts for this organizer
    const payouts = await ctx.db
      .query("organizerPayouts")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const stats = {
      totalPayouts: payouts.length,
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      processingCount: 0,
      processingAmount: 0,
      completedCount: 0,
      completedAmount: 0,
      rejectedCount: 0,
      failedCount: 0,
      totalPaidOut: 0,
    };

    for (const payout of payouts) {
      switch (payout.status) {
        case "PENDING":
          stats.pendingCount++;
          stats.pendingAmount += payout.amountCents;
          break;
        case "APPROVED":
          stats.approvedCount++;
          stats.approvedAmount += payout.amountCents;
          break;
        case "PROCESSING":
          stats.processingCount++;
          stats.processingAmount += payout.amountCents;
          break;
        case "COMPLETED":
          stats.completedCount++;
          stats.completedAmount += payout.amountCents;
          stats.totalPaidOut += payout.amountCents;
          break;
        case "REJECTED":
          stats.rejectedCount++;
          break;
        case "FAILED":
          stats.failedCount++;
          break;
      }
    }

    return stats;
  },
});

/**
 * Get admin-level payout statistics
 * Requires admin role
 */
export const getAdminPayoutStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user || user.role !== "admin") {
      return null;
    }

    // Get all payouts
    const payouts = await ctx.db.query("organizerPayouts").collect();

    const stats = {
      totalPayouts: payouts.length,
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      processingCount: 0,
      processingAmount: 0,
      completedCount: 0,
      completedAmount: 0,
      rejectedCount: 0,
      failedCount: 0,
    };

    for (const payout of payouts) {
      switch (payout.status) {
        case "PENDING":
          stats.pendingCount++;
          stats.pendingAmount += payout.amountCents;
          break;
        case "APPROVED":
          stats.approvedCount++;
          stats.approvedAmount += payout.amountCents;
          break;
        case "PROCESSING":
          stats.processingCount++;
          stats.processingAmount += payout.amountCents;
          break;
        case "COMPLETED":
          stats.completedCount++;
          stats.completedAmount += payout.amountCents;
          break;
        case "REJECTED":
          stats.rejectedCount++;
          break;
        case "FAILED":
          stats.failedCount++;
          break;
      }
    }

    return stats;
  },
});

/**
 * Check if organizer can request a payout
 * Returns available balance and whether minimum is met
 */
export const canRequestPayout = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return {
        canRequest: false,
        availableBalanceCents: 0,
        minimumPayoutCents: 2500,
        reason: "Not authenticated",
      };
    }

    // Get current user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return {
        canRequest: false,
        availableBalanceCents: 0,
        minimumPayoutCents: 2500,
        reason: "User not found",
      };
    }

    // Check for pending payout requests
    const pendingPayouts = await ctx.db
      .query("organizerPayouts")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const hasPending = pendingPayouts.some(
      (p) =>
        p.status === "PENDING" ||
        p.status === "APPROVED" ||
        p.status === "PROCESSING"
    );

    if (hasPending) {
      return {
        canRequest: false,
        availableBalanceCents: 0,
        minimumPayoutCents: 2500,
        reason: "You already have a pending payout request",
      };
    }

    // Calculate available balance from orders
    // Get all events owned by this organizer
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
        // Revenue = subtotal - platform fees (what organizer keeps)
        const organizerRevenue =
          order.subtotalCents - (order.platformFeeCents || 0);
        availableBalanceCents += organizerRevenue;
      }
    }

    // Subtract already paid out amounts
    const completedPayouts = pendingPayouts.filter(
      (p) => p.status === "COMPLETED"
    );
    const totalPaidOut = completedPayouts.reduce(
      (sum, p) => sum + p.amountCents,
      0
    );
    availableBalanceCents -= totalPaidOut;

    // Minimum payout is $25 (2500 cents)
    const minimumPayoutCents = 2500;

    if (availableBalanceCents < minimumPayoutCents) {
      return {
        canRequest: false,
        availableBalanceCents,
        minimumPayoutCents,
        reason: `Minimum payout is $${(minimumPayoutCents / 100).toFixed(2)}. You have $${(availableBalanceCents / 100).toFixed(2)} available.`,
      };
    }

    return {
      canRequest: true,
      availableBalanceCents,
      minimumPayoutCents,
      reason: null,
    };
  },
});
