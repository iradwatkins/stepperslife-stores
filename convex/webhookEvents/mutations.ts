import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Mark a webhook event as processed
 * Called after successfully processing an event to prevent re-processing
 */
export const markEventProcessed = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    provider: v.union(v.literal("stripe"), v.literal("paypal")),
    orderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already exists (extra safety for race conditions)
    const existingEvent = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existingEvent) {
      console.log(`[WebhookEvents] Event ${args.eventId} already recorded, skipping`);
      return { success: true, alreadyProcessed: true };
    }

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Record the processed event with expiration for cleanup
    const id = await ctx.db.insert("webhookEvents", {
      eventId: args.eventId,
      eventType: args.eventType,
      provider: args.provider,
      processedAt: now,
      expiresAt: now + sevenDaysMs,
      orderId: args.orderId,
    });

    console.log(`[WebhookEvents] Recorded processed event ${args.eventId} (${args.eventType})`);

    return { success: true, alreadyProcessed: false, id };
  },
});

/**
 * Clean up expired webhook events
 * Should be called periodically (e.g., daily via cron job)
 * Removes events older than 7 days to keep the table manageable
 */
export const cleanupExpiredEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deletedCount = 0;

    // Get all expired events using the expiresAt index
    const expiredEvents = await ctx.db
      .query("webhookEvents")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    // Delete each expired event
    for (const event of expiredEvents) {
      await ctx.db.delete(event._id);
      deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`[WebhookEvents Cleanup] Deleted ${deletedCount} expired events`);
    }

    return { deleted: deletedCount };
  },
});
