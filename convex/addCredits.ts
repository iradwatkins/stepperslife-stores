import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add credits to a specific organizer for testing
 */
export const addCreditsToOrganizer = mutation({
  args: {
    email: v.string(),
    creditsToAdd: v.number(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Find their credit balance
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!credits) {
      throw new Error(`Credit balance not found for ${args.email}`);
    }

    // Add credits
    await ctx.db.patch(credits._id, {
      creditsTotal: credits.creditsTotal + args.creditsToAdd,
      creditsRemaining: credits.creditsRemaining + args.creditsToAdd,
      updatedAt: Date.now(),
    });


    return {
      success: true,
      email: args.email,
      previousBalance: credits.creditsRemaining,
      newBalance: credits.creditsRemaining + args.creditsToAdd,
      creditsAdded: args.creditsToAdd,
    };
  },
});

/**
 * Check credit balance for an organizer
 */
export const checkCreditBalance = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Find their credit balance
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!credits) {
      throw new Error(`Credit balance not found for ${args.email}`);
    }

    return {
      email: args.email,
      creditsTotal: credits.creditsTotal,
      creditsUsed: credits.creditsUsed,
      creditsRemaining: credits.creditsRemaining,
      firstEventFreeUsed: credits.firstEventFreeUsed,
    };
  },
});

/**
 * Reset credits to initial 10,000 free tickets
 */
export const resetCreditsTo10000 = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Find their credit balance
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!credits) {
      throw new Error(`Credit balance not found for ${args.email}`);
    }

    // Reset to 10,000 free tickets
    await ctx.db.patch(credits._id, {
      creditsTotal: 10000,
      creditsUsed: 0,
      creditsRemaining: 10000,
      updatedAt: Date.now(),
    });


    return {
      success: true,
      email: args.email,
      creditsTotal: 10000,
      creditsRemaining: 10000,
    };
  },
});
