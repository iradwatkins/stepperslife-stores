/**
 * Platform Debt Queries
 *
 * Queries for retrieving organizer platform debt information
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get organizer's current platform debt balance
 * Used by payment APIs to determine if extra settlement should be taken
 */
export const getOrganizerDebt = query({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const debt = await ctx.db
      .query("organizerPlatformDebt")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!debt) {
      return {
        organizerId: args.organizerId,
        totalDebtCents: 0,
        totalSettledCents: 0,
        remainingDebtCents: 0,
        hasDebt: false,
      };
    }

    return {
      ...debt,
      hasDebt: debt.remainingDebtCents > 0,
    };
  },
});

/**
 * Get debt by organizer ID (internal/public version for API routes)
 */
export const getDebtByOrganizerId = query({
  args: {
    organizerId: v.string(), // Accept string for API routes
  },
  handler: async (ctx, args) => {
    const debt = await ctx.db
      .query("organizerPlatformDebt")
      .withIndex("by_organizer", (q) =>
        q.eq("organizerId", args.organizerId as Id<"users">)
      )
      .first();

    if (!debt) {
      return {
        remainingDebtCents: 0,
        hasDebt: false,
      };
    }

    return {
      remainingDebtCents: debt.remainingDebtCents,
      hasDebt: debt.remainingDebtCents > 0,
    };
  },
});

/**
 * Get organizer's debt history (ledger entries)
 */
export const getDebtHistory = query({
  args: {
    organizerId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const entries = await ctx.db
      .query("platformDebtLedger")
      .withIndex("by_organizer_and_created", (q) =>
        q.eq("organizerId", args.organizerId)
      )
      .order("desc")
      .take(limit);

    return entries;
  },
});

/**
 * Get all organizers with outstanding debt (admin view)
 */
export const getOrganizersWithDebt = query({
  args: {
    minDebtCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minDebt = args.minDebtCents || 1;

    // Get all debt records with remaining debt
    const debtRecords = await ctx.db
      .query("organizerPlatformDebt")
      .filter((q) => q.gte(q.field("remainingDebtCents"), minDebt))
      .collect();

    // Enrich with organizer info
    const enrichedRecords = await Promise.all(
      debtRecords.map(async (debt) => {
        const organizer = await ctx.db.get(debt.organizerId);
        return {
          ...debt,
          organizerName: organizer?.name || "Unknown",
          organizerEmail: organizer?.email || "Unknown",
        };
      })
    );

    return enrichedRecords.sort(
      (a, b) => b.remainingDebtCents - a.remainingDebtCents
    );
  },
});
