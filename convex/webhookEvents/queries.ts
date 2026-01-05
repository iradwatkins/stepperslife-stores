import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Check if a webhook event has already been processed
 * Used for deduplication to prevent double-processing of events
 */
export const isEventProcessed = query({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();

    return existingEvent !== null;
  },
});

/**
 * Get webhook event statistics for monitoring
 */
export const getStats = query({
  args: {
    provider: v.optional(v.union(v.literal("stripe"), v.literal("paypal"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Fetch events - filter by provider if specified
    const allEvents = args.provider
      ? await ctx.db
          .query("webhookEvents")
          .withIndex("by_provider", (q) => q.eq("provider", args.provider!))
          .collect()
      : await ctx.db.query("webhookEvents").collect();

    const last24Hours = allEvents.filter((e) => e.processedAt > oneDayAgo);
    const last7Days = allEvents.filter((e) => e.processedAt > sevenDaysAgo);

    // Count by event type
    const eventTypeCounts: Record<string, number> = {};
    for (const event of last7Days) {
      eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
    }

    return {
      totalEvents: allEvents.length,
      last24Hours: last24Hours.length,
      last7Days: last7Days.length,
      eventTypeCounts,
      stripeCount: allEvents.filter((e) => e.provider === "stripe").length,
      paypalCount: allEvents.filter((e) => e.provider === "paypal").length,
    };
  },
});
