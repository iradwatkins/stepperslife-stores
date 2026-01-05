import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireEventOwnership } from "../lib/auth";

/**
 * Join the waitlist for a sold-out event
 */
export const joinWaitlist = mutation({
  args: {
    eventId: v.id("events"),
    ticketTierId: v.optional(v.id("ticketTiers")),
    email: v.string(),
    name: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if user is already on the waitlist
    const existingEntry = await ctx.db
      .query("eventWaitlist")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .filter((q) =>
        q.and(
          q.eq(q.field("eventId"), args.eventId),
          q.or(q.eq(q.field("status"), "ACTIVE"), q.eq(q.field("status"), "NOTIFIED"))
        )
      )
      .first();

    if (existingEntry) {
      throw new Error("You are already on the waitlist for this event");
    }

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Get current user if authenticated
    const identity = await ctx.auth.getUserIdentity();
    let userId;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();
      userId = user?._id;
    }

    // Create waitlist entry
    const waitlistId = await ctx.db.insert("eventWaitlist", {
      eventId: args.eventId,
      ticketTierId: args.ticketTierId,
      userId,
      email: args.email.toLowerCase(),
      name: args.name,
      quantity: args.quantity,
      status: "ACTIVE",
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      joinedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, waitlistId };
  },
});

/**
 * Leave the waitlist
 */
export const leaveWaitlist = mutation({
  args: {
    waitlistId: v.id("eventWaitlist"),
  },
  handler: async (ctx, args) => {
    const waitlist = await ctx.db.get(args.waitlistId);
    if (!waitlist) throw new Error("Waitlist entry not found");

    // Verify user can cancel this waitlist entry
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();

      if (
        user &&
        waitlist.userId !== user._id &&
        waitlist.email.toLowerCase() !== user.email.toLowerCase()
      ) {
        throw new Error("Not authorized to cancel this waitlist entry");
      }
    }

    await ctx.db.patch(args.waitlistId, {
      status: "CANCELLED",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark waitlist entry as notified (organizer action)
 */
export const notifyWaitlistEntry = mutation({
  args: {
    waitlistId: v.id("eventWaitlist"),
  },
  handler: async (ctx, args) => {
    const waitlist = await ctx.db.get(args.waitlistId);
    if (!waitlist) throw new Error("Waitlist entry not found");

    // Verify user is the event organizer (or admin)
    await requireEventOwnership(ctx, waitlist.eventId);

    await ctx.db.patch(args.waitlistId, {
      status: "NOTIFIED",
      notifiedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
