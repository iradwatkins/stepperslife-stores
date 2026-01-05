import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireEventOwnership } from "../lib/auth";

/**
 * Get waitlist for an event (organizer only)
 */
export const getEventWaitlist = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for waitlist access
    await requireEventOwnership(ctx, args.eventId);

    const waitlist = await ctx.db
      .query("eventWaitlist")
      .withIndex("by_event_and_status", (q) => q.eq("eventId", args.eventId).eq("status", "ACTIVE"))
      .collect();

    // Get tier details for each entry
    const waitlistWithDetails = await Promise.all(
      waitlist.map(async (entry) => {
        let tier = null;
        if (entry.ticketTierId) {
          tier = await ctx.db.get(entry.ticketTierId);
        }
        return {
          ...entry,
          tier,
        };
      })
    );

    return waitlistWithDetails.sort((a, b) => a.joinedAt - b.joinedAt);
  },
});

/**
 * Check if user is on waitlist for an event
 */
export const checkUserOnWaitlist = query({
  args: {
    eventId: v.id("events"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const waitlistEntry = await ctx.db
      .query("eventWaitlist")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .filter((q) =>
        q.and(
          q.eq(q.field("eventId"), args.eventId),
          q.or(q.eq(q.field("status"), "ACTIVE"), q.eq(q.field("status"), "NOTIFIED"))
        )
      )
      .first();

    return waitlistEntry !== null;
  },
});

/**
 * Get waitlist count for an event
 */
export const getWaitlistCount = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const waitlist = await ctx.db
      .query("eventWaitlist")
      .withIndex("by_event_and_status", (q) => q.eq("eventId", args.eventId).eq("status", "ACTIVE"))
      .collect();

    return waitlist.length;
  },
});
