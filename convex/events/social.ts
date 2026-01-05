/**
 * Social Proof Functions for Events
 * Story 3.6: Social Proof - Attendance Indicators
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Toggle user's interest in an event
 * Creates or removes an interest record
 */
export const toggleInterest = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user already has interest in this event
    const existing = await ctx.db
      .query("eventInterests")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      // Remove interest
      await ctx.db.delete(existing._id);
      return { interested: false };
    } else {
      // Add interest
      await ctx.db.insert("eventInterests", {
        eventId: args.eventId,
        userId: args.userId,
        createdAt: Date.now(),
      });
      return { interested: true };
    }
  },
});

/**
 * Get interest count for an event
 * Returns total number of users interested
 */
export const getInterestCount = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const interests = await ctx.db
      .query("eventInterests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return interests.length;
  },
});

/**
 * Check if the current user is interested in an event
 */
export const isUserInterested = query({
  args: {
    eventId: v.id("events"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, eventId } = args;
    if (!userId) return false;

    const interest = await ctx.db
      .query("eventInterests")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", eventId).eq("userId", userId)
      )
      .first();

    return !!interest;
  },
});

/**
 * Get social proof data for an event
 * Returns interest count, attendee count, and urgency indicators
 */
export const getEventSocialProof = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get interest count
    const interests = await ctx.db
      .query("eventInterests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get ticket sales for "going" count
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Only count valid tickets (not cancelled/refunded)
    const validTickets = tickets.filter(
      (t) => t.status === "VALID" || t.status === "SCANNED" || t.status === "PENDING"
    );

    // Get ticket tiers for urgency calculation
    const ticketTiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Calculate urgency
    let totalCapacity = 0;
    let totalSold = 0;
    ticketTiers.forEach((tier) => {
      totalCapacity += tier.quantity;
      totalSold += tier.sold;
    });

    const percentSold = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;
    const ticketsRemaining = totalCapacity - totalSold;

    // Determine urgency level
    let urgency: {
      level: "none" | "selling_fast" | "limited" | "almost_sold_out" | "last_few";
      message: string;
    } = { level: "none", message: "" };

    if (ticketsRemaining <= 0) {
      urgency = { level: "none", message: "Sold Out" };
    } else if (ticketsRemaining <= 5) {
      urgency = { level: "last_few", message: "Last Few Spots!" };
    } else if (ticketsRemaining <= 10 || percentSold >= 90) {
      urgency = { level: "almost_sold_out", message: "Almost Sold Out!" };
    } else if (ticketsRemaining <= 20 || percentSold >= 80) {
      urgency = { level: "limited", message: "Limited Tickets" };
    } else if (percentSold >= 50) {
      urgency = { level: "selling_fast", message: "Selling Fast!" };
    }

    return {
      interestedCount: interests.length,
      goingCount: validTickets.length,
      urgency,
      ticketsRemaining,
      percentSold: Math.round(percentSold),
    };
  },
});

/**
 * Get attendee preview for "Who's Going" section
 * Returns first N attendees with their profile info (respecting privacy)
 */
export const getAttendeePreview = query({
  args: {
    eventId: v.id("events"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const previewLimit = args.limit || 8;

    // Get tickets for this event
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Only show valid ticket holders
    const validTickets = tickets.filter(
      (t) => t.status === "VALID" || t.status === "SCANNED" || t.status === "PENDING"
    );

    // Get unique user IDs (attendeeId in tickets schema)
    const userIds = [...new Set(validTickets.map((t) => t.attendeeId).filter(Boolean))] as Id<"users">[];

    // Get user info for preview
    const attendees: {
      id: Id<"users">;
      name: string;
      image: string | null;
    }[] = [];

    for (const userId of userIds.slice(0, previewLimit + 5)) {
      // Get extra to account for hidden
      const user = await ctx.db.get(userId);
      if (!user) continue;

      // Check privacy settings
      const privacySettings = await ctx.db
        .query("userPrivacySettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      // Skip if user hides attendance
      if (privacySettings?.hideEventAttendance) continue;

      attendees.push({
        id: user._id,
        name: user.name || "Stepper",
        image: user.image || null,
      });

      if (attendees.length >= previewLimit) break;
    }

    return {
      attendees,
      totalCount: userIds.length,
      hasMore: userIds.length > previewLimit,
    };
  },
});

/**
 * Get events user is interested in
 */
export const getUserInterests = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const interests = await ctx.db
      .query("eventInterests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return interests.map((i) => i.eventId);
  },
});

/**
 * Batch get social proof for multiple events (for event lists)
 * More efficient than calling getEventSocialProof for each event
 */
export const getBatchSocialProof = query({
  args: {
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args) => {
    const results: Record<
      string,
      {
        interestedCount: number;
        goingCount: number;
        urgency: { level: string; message: string };
      }
    > = {};

    for (const eventId of args.eventIds) {
      // Get interest count
      const interests = await ctx.db
        .query("eventInterests")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      // Get ticket count
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      const validTickets = tickets.filter(
        (t) => t.status === "VALID" || t.status === "SCANNED" || t.status === "PENDING"
      );

      // Get ticket tiers for urgency
      const ticketTiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      let totalCapacity = 0;
      let totalSold = 0;
      ticketTiers.forEach((tier) => {
        totalCapacity += tier.quantity;
        totalSold += tier.sold;
      });

      const percentSold = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;
      const ticketsRemaining = totalCapacity - totalSold;

      let urgency = { level: "none", message: "" };
      if (ticketsRemaining <= 0) {
        urgency = { level: "none", message: "Sold Out" };
      } else if (ticketsRemaining <= 5) {
        urgency = { level: "last_few", message: "Last Few Spots!" };
      } else if (ticketsRemaining <= 10 || percentSold >= 90) {
        urgency = { level: "almost_sold_out", message: "Almost Sold Out!" };
      } else if (ticketsRemaining <= 20 || percentSold >= 80) {
        urgency = { level: "limited", message: "Limited Tickets" };
      } else if (percentSold >= 50) {
        urgency = { level: "selling_fast", message: "Selling Fast!" };
      }

      results[eventId] = {
        interestedCount: interests.length,
        goingCount: validTickets.length,
        urgency,
      };
    }

    return results;
  },
});
