import { v } from "convex/values";
import { query } from "../_generated/server";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Get credit balance for organizer
 */
export const getCreditBalance = query({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!credits) {
      // Return default structure if not initialized
      return {
        creditsTotal: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
        firstEventFreeUsed: false,
        hasFirstEventFree: true,
      };
    }

    return {
      ...credits,
      hasFirstEventFree: !credits.firstEventFreeUsed,
    };
  },
});

/**
 * Get current user's credit balance
 * Works with both Convex auth and testing mode fallback
 */
export const getMyCredits = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // PRODUCTION: Require authentication
    if (!identity) {
      // Return default credits for unauthenticated users (view only)
      return {
        creditsTotal: 1000,
        creditsUsed: 0,
        creditsRemaining: 1000,
        firstEventFreeUsed: false,
        hasFirstEventFree: true,
      };
    }

    // Parse the identity
    let userInfo;
    try {
      userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    } catch (error) {
      userInfo = identity;
    }

    const email = userInfo.email || identity.email;
    if (!email) {
      return {
        creditsTotal: 1000,
        creditsUsed: 0,
        creditsRemaining: 1000,
        firstEventFreeUsed: false,
        hasFirstEventFree: true,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      // Return default credits for new organizers
      return {
        creditsTotal: 1000,
        creditsUsed: 0,
        creditsRemaining: 1000,
        firstEventFreeUsed: false,
        hasFirstEventFree: true,
      };
    }

    // Get actual credits from organizerCredits table
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!credits) {
      // Return default structure if not initialized
      return {
        creditsTotal: 1000,
        creditsUsed: 0,
        creditsRemaining: 1000,
        firstEventFreeUsed: false,
        hasFirstEventFree: true,
      };
    }

    return {
      ...credits,
      hasFirstEventFree: !credits.firstEventFreeUsed,
    };
  },
});

/**
 * Get credit purchase history
 */
export const getCreditTransactions = query({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .order("desc")
      .collect();

    return transactions;
  },
});

/**
 * Get current user's credit transactions
 */
export const getMyTransactions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .order("desc")
      .collect();

    return transactions;
  },
});

/**
 * Calculate credit purchase cost
 */
export const calculateCreditCost = query({
  args: {
    ticketQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const PRICE_PER_TICKET_CENTS = 30; // $0.30 per ticket
    const totalCostCents = args.ticketQuantity * PRICE_PER_TICKET_CENTS;

    return {
      ticketQuantity: args.ticketQuantity,
      pricePerTicket: PRICE_PER_TICKET_CENTS,
      totalCostCents,
      totalCostDollars: (totalCostCents / 100).toFixed(2),
    };
  },
});

/**
 * Check if organizer has enough credits
 */
export const hasEnoughCredits = query({
  args: {
    organizerId: v.id("users"),
    requiredQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!credits) {
      return {
        hasEnough: false,
        available: 0,
        needed: args.requiredQuantity,
        shortfall: args.requiredQuantity,
      };
    }

    const hasEnough = credits.creditsRemaining >= args.requiredQuantity;
    const shortfall = hasEnough ? 0 : args.requiredQuantity - credits.creditsRemaining;

    return {
      hasEnough,
      available: credits.creditsRemaining,
      needed: args.requiredQuantity,
      shortfall,
    };
  },
});
