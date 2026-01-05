import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Promotion duration in days based on type
const PROMOTION_DURATIONS: Record<string, number> = {
  FEATURED: 7,      // 7 days featured
  HOMEPAGE: 3,      // 3 days homepage banner
  CATEGORY: 7,      // 7 days category feature
  SEARCH_BOOST: 14, // 14 days search boost
};

type PromotionType = "FEATURED" | "HOMEPAGE" | "CATEGORY" | "SEARCH_BOOST";

/**
 * Create a pending promotion (before payment)
 */
export const createPendingPromotion = mutation({
  args: {
    eventId: v.id("events"),
    organizerId: v.id("users"),
    promotionType: v.union(
      v.literal("FEATURED"),
      v.literal("HOMEPAGE"),
      v.literal("CATEGORY"),
      v.literal("SEARCH_BOOST")
    ),
    amountPaid: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const durationDays = PROMOTION_DURATIONS[args.promotionType] || 7;
    const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

    // Check if there's already an active promotion of this type for this event
    const existingPromotion = await ctx.db
      .query("eventPromotions")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) =>
        q.and(
          q.eq(q.field("promotionType"), args.promotionType),
          q.or(
            q.eq(q.field("status"), "ACTIVE"),
            q.eq(q.field("status"), "PENDING")
          )
        )
      )
      .first();

    if (existingPromotion) {
      console.log(`[Promotions] Event ${args.eventId} already has ${args.promotionType} promotion`);
      return { success: false, error: "Active promotion already exists", existingId: existingPromotion._id };
    }

    const promotionId = await ctx.db.insert("eventPromotions", {
      eventId: args.eventId,
      organizerId: args.organizerId,
      promotionType: args.promotionType,
      status: "PENDING",
      stripePaymentIntentId: args.stripePaymentIntentId,
      amountPaid: args.amountPaid,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[Promotions] Created pending promotion ${promotionId} for event ${args.eventId}`);

    return { success: true, promotionId, expiresAt };
  },
});

/**
 * Activate a promotion after successful payment
 * Called from Stripe webhook
 */
export const activatePromotion = mutation({
  args: {
    eventId: v.id("events"),
    promotionType: v.union(
      v.literal("FEATURED"),
      v.literal("HOMEPAGE"),
      v.literal("CATEGORY"),
      v.literal("SEARCH_BOOST")
    ),
    stripePaymentIntentId: v.string(),
    amountPaid: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find pending promotion by event and type
    let promotion = await ctx.db
      .query("eventPromotions")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .first();

    if (!promotion) {
      // Try finding by event ID and type
      promotion = await ctx.db
        .query("eventPromotions")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .filter((q) =>
          q.and(
            q.eq(q.field("promotionType"), args.promotionType),
            q.eq(q.field("status"), "PENDING")
          )
        )
        .first();
    }

    if (!promotion) {
      // Create new promotion if none exists
      console.log(`[Promotions] No pending promotion found, creating new one`);

      // Get event to find organizer
      const event = await ctx.db.get(args.eventId);
      if (!event || !event.organizerId) {
        console.error(`[Promotions] Event ${args.eventId} not found or has no organizer`);
        return { success: false, error: "Event not found" };
      }

      const durationDays = PROMOTION_DURATIONS[args.promotionType] || 7;
      const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

      const promotionId = await ctx.db.insert("eventPromotions", {
        eventId: args.eventId,
        organizerId: event.organizerId,
        promotionType: args.promotionType,
        status: "ACTIVE",
        stripePaymentIntentId: args.stripePaymentIntentId,
        amountPaid: args.amountPaid || 0,
        startedAt: now,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[Promotions] Created and activated promotion ${promotionId} for event ${args.eventId}`);

      return { success: true, promotionId, expiresAt, action: "created" };
    }

    if (promotion.status === "ACTIVE") {
      console.log(`[Promotions] Promotion ${promotion._id} already active`);
      return { success: true, alreadyActive: true, promotionId: promotion._id };
    }

    // Activate the promotion
    const durationDays = PROMOTION_DURATIONS[args.promotionType] || 7;
    const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(promotion._id, {
      status: "ACTIVE",
      startedAt: now,
      expiresAt,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amountPaid: args.amountPaid || promotion.amountPaid,
      updatedAt: now,
    });

    console.log(`[Promotions] Activated promotion ${promotion._id} for event ${args.eventId}, expires: ${new Date(expiresAt).toISOString()}`);

    return { success: true, promotionId: promotion._id, expiresAt, action: "activated" };
  },
});

/**
 * Cancel a promotion
 */
export const cancelPromotion = mutation({
  args: {
    promotionId: v.id("eventPromotions"),
  },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.promotionId);

    if (!promotion) {
      return { success: false, error: "Promotion not found" };
    }

    if (promotion.status === "CANCELLED" || promotion.status === "EXPIRED") {
      return { success: true, alreadyCancelled: true };
    }

    await ctx.db.patch(args.promotionId, {
      status: "CANCELLED",
      updatedAt: Date.now(),
    });

    console.log(`[Promotions] Cancelled promotion ${args.promotionId}`);

    return { success: true };
  },
});

/**
 * Expire overdue promotions (cron job)
 */
export const expireOverduePromotions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let expiredCount = 0;

    // Find expired promotions that are still marked as active
    const expiredPromotions = await ctx.db
      .query("eventPromotions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .take(100); // Process in batches

    for (const promotion of expiredPromotions) {
      await ctx.db.patch(promotion._id, {
        status: "EXPIRED",
        updatedAt: now,
      });
      expiredCount++;
    }

    if (expiredCount > 0) {
      console.log(`[Promotions Cron] Expired ${expiredCount} overdue promotions`);
    }

    return { expired: expiredCount };
  },
});
