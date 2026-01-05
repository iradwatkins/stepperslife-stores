import { v } from "convex/values";
import { query } from "../_generated/server";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Get all disputes for admin view
 */
export const getAdminDisputes = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("OPEN"),
        v.literal("UNDER_REVIEW"),
        v.literal("WON"),
        v.literal("LOST"),
        v.literal("CLOSED")
      )
    ),
    provider: v.optional(v.union(v.literal("stripe"), v.literal("paypal"))),
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
      if (!email) return [];

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user || user.role !== "admin") {
      return [];
    }

    // Query disputes with optional filters
    let disputes;
    if (args.status) {
      disputes = await ctx.db
        .query("paymentDisputes")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.provider) {
      disputes = await ctx.db
        .query("paymentDisputes")
        .withIndex("by_provider", (q) => q.eq("provider", args.provider!))
        .order("desc")
        .collect();
    } else {
      disputes = await ctx.db
        .query("paymentDisputes")
        .order("desc")
        .collect();
    }

    // Enrich with order and event info
    const enriched = await Promise.all(
      disputes.map(async (dispute) => {
        const order = dispute.orderId
          ? await ctx.db.get(dispute.orderId)
          : null;
        const event = dispute.eventId
          ? await ctx.db.get(dispute.eventId)
          : null;
        const organizer = dispute.organizerId
          ? await ctx.db.get(dispute.organizerId)
          : null;

        return {
          ...dispute,
          order: order
            ? {
                _id: order._id,
                buyerName: order.buyerName,
                buyerEmail: order.buyerEmail,
                status: order.status,
                totalCents: order.totalCents,
              }
            : null,
          event: event
            ? {
                _id: event._id,
                name: event.name,
              }
            : null,
          organizer: organizer
            ? {
                _id: organizer._id,
                name: organizer.name,
                email: organizer.email,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get disputes for an organizer (their events only)
 */
export const getOrganizerDisputes = query({
  args: {},
  handler: async (ctx) => {
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
      if (!email) return [];

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      return [];
    }

    // Get disputes where this user is the organizer
    const disputes = await ctx.db
      .query("paymentDisputes")
      .withIndex("by_organizerId", (q) => q.eq("organizerId", user._id))
      .order("desc")
      .collect();

    // Enrich with order and event info
    const enriched = await Promise.all(
      disputes.map(async (dispute) => {
        const order = dispute.orderId
          ? await ctx.db.get(dispute.orderId)
          : null;
        const event = dispute.eventId
          ? await ctx.db.get(dispute.eventId)
          : null;

        return {
          ...dispute,
          order: order
            ? {
                _id: order._id,
                buyerName: order.buyerName,
                buyerEmail: order.buyerEmail,
                status: order.status,
                totalCents: order.totalCents,
              }
            : null,
          event: event
            ? {
                _id: event._id,
                name: event.name,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single dispute by ID
 */
export const getDisputeById = query({
  args: {
    disputeId: v.id("paymentDisputes"),
  },
  handler: async (ctx, args) => {
    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) return null;

    // Enrich with related data
    const order = dispute.orderId
      ? await ctx.db.get(dispute.orderId)
      : null;
    const event = dispute.eventId
      ? await ctx.db.get(dispute.eventId)
      : null;
    const organizer = dispute.organizerId
      ? await ctx.db.get(dispute.organizerId)
      : null;

    return {
      ...dispute,
      order,
      event,
      organizer: organizer
        ? {
            _id: organizer._id,
            name: organizer.name,
            email: organizer.email,
          }
        : null,
    };
  },
});

/**
 * Get dispute statistics for admin dashboard
 */
export const getDisputeStats = query({
  args: {},
  handler: async (ctx) => {
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
      if (!email)
        return { open: 0, underReview: 0, won: 0, lost: 0, totalAmountCents: 0 };

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user || user.role !== "admin") {
      return { open: 0, underReview: 0, won: 0, lost: 0, totalAmountCents: 0 };
    }

    const allDisputes = await ctx.db.query("paymentDisputes").collect();

    const open = allDisputes.filter((d) => d.status === "OPEN").length;
    const underReview = allDisputes.filter(
      (d) => d.status === "UNDER_REVIEW"
    ).length;
    const won = allDisputes.filter((d) => d.status === "WON").length;
    const lost = allDisputes.filter((d) => d.status === "LOST").length;

    // Total amount of OPEN and UNDER_REVIEW disputes (at risk)
    const atRiskDisputes = allDisputes.filter(
      (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
    );
    const totalAmountCents = atRiskDisputes.reduce(
      (sum, d) => sum + d.amountCents,
      0
    );

    return {
      open,
      underReview,
      won,
      lost,
      totalAmountCents,
    };
  },
});

/**
 * Check if a dispute exists by provider dispute ID
 */
export const getDisputeByProviderId = query({
  args: {
    disputeId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentDisputes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", args.disputeId))
      .first();
  },
});
