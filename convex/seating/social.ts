import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a shareable link for seat selection
 */
export const createSeatingShare = mutation({
  args: {
    eventId: v.id("events"),
    sectionId: v.string(),
    tableId: v.optional(v.string()),
    selectedSeats: v.array(v.string()),
    initiatorName: v.string(),
    initiatorEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate unique share token
    const shareToken = `seat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Expires in 7 days
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const shareId = await ctx.db.insert("seatingShares", {
      eventId: args.eventId,
      shareToken,
      initiatorName: args.initiatorName,
      initiatorEmail: args.initiatorEmail,
      sectionId: args.sectionId,
      tableId: args.tableId,
      selectedSeats: args.selectedSeats,
      isActive: true,
      expiresAt,
      viewCount: 0,
      joinedCount: 0,
      createdAt: Date.now(),
    });

    return { shareToken, shareId };
  },
});

/**
 * Get seating share by token
 */
export const getSeatingShareByToken = query({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("seatingShares")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!share) {
      return null;
    }

    // Check if expired
    if (!share.isActive || Date.now() > share.expiresAt) {
      return null;
    }

    // Note: View count increment should be done in a separate mutation
    return share;
  },
});

/**
 * Join a shared seating group (increment joined count)
 */
export const joinSeatingShare = mutation({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("seatingShares")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!share) {
      throw new Error("Share link not found");
    }

    if (!share.isActive || Date.now() > share.expiresAt) {
      throw new Error("Share link has expired");
    }

    // Increment joined count
    await ctx.db.patch(share._id, {
      joinedCount: share.joinedCount + 1,
    });

    return { success: true, share };
  },
});

/**
 * Deactivate a share link
 */
export const deactivateSeatingShare = mutation({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("seatingShares")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!share) {
      throw new Error("Share link not found");
    }

    await ctx.db.patch(share._id, {
      isActive: false,
    });

    return { success: true };
  },
});
