/**
 * Tax Rates Module
 *
 * Configurable state-based tax rates for checkout calculations.
 * Replaces hardcoded 8.75% tax rate with dynamic lookup.
 *
 * Story 4.1: Configurable Tax Rates
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ==========================================
// QUERIES
// ==========================================

/**
 * Get tax rate for a specific state
 * Returns rate as decimal (e.g., 0.0625 for 6.25%)
 */
export const getByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase();
    const taxRate = await ctx.db
      .query("taxRates")
      .withIndex("by_state", (q) => q.eq("state", stateCode))
      .first();

    if (!taxRate || !taxRate.isActive) {
      // Default to 0% if no rate found (tax-free fallback)
      return null;
    }

    return taxRate;
  },
});

/**
 * Get tax rate value only for a specific state
 * Returns just the rate number or default
 */
export const getRateByState = query({
  args: {
    state: v.string(),
    defaultRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase();
    const taxRate = await ctx.db
      .query("taxRates")
      .withIndex("by_state", (q) => q.eq("state", stateCode))
      .first();

    if (!taxRate || !taxRate.isActive) {
      // Return default or 0% if no rate found
      return args.defaultRate ?? 0;
    }

    return taxRate.rate;
  },
});

/**
 * Get all active tax rates
 * Useful for admin dashboard display
 */
export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    const rates = await ctx.db
      .query("taxRates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Sort by state name
    return rates.sort((a, b) => a.stateFullName.localeCompare(b.stateFullName));
  },
});

/**
 * Get all tax rates (including inactive) - admin only
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rates = await ctx.db.query("taxRates").collect();
    return rates.sort((a, b) => a.stateFullName.localeCompare(b.stateFullName));
  },
});

// ==========================================
// MUTATIONS
// ==========================================

/**
 * Create or update a tax rate
 */
export const upsert = mutation({
  args: {
    state: v.string(),
    stateFullName: v.string(),
    rate: v.number(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase();
    const now = Date.now();

    // Check if rate exists for this state
    const existing = await ctx.db
      .query("taxRates")
      .withIndex("by_state", (q) => q.eq("state", stateCode))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        rate: args.rate,
        stateFullName: args.stateFullName,
        description: args.description ?? existing.description,
        isActive: args.isActive ?? existing.isActive,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new
      const id = await ctx.db.insert("taxRates", {
        state: stateCode,
        stateFullName: args.stateFullName,
        rate: args.rate,
        description: args.description ?? "State sales tax",
        isActive: args.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});

/**
 * Toggle a tax rate's active status
 */
export const toggleActive = mutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase();
    const taxRate = await ctx.db
      .query("taxRates")
      .withIndex("by_state", (q) => q.eq("state", stateCode))
      .first();

    if (!taxRate) {
      throw new Error(`Tax rate not found for state: ${stateCode}`);
    }

    await ctx.db.patch(taxRate._id, {
      isActive: !taxRate.isActive,
      updatedAt: Date.now(),
    });

    return { state: stateCode, isActive: !taxRate.isActive };
  },
});

/**
 * Seed default US state tax rates
 * Run once to populate the database
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // US state tax rates (as of 2024)
    // Source: Tax Foundation, state websites
    const stateTaxRates: Array<{
      state: string;
      stateFullName: string;
      rate: number;
    }> = [
      { state: "AL", stateFullName: "Alabama", rate: 0.04 },
      { state: "AK", stateFullName: "Alaska", rate: 0 }, // No state sales tax
      { state: "AZ", stateFullName: "Arizona", rate: 0.056 },
      { state: "AR", stateFullName: "Arkansas", rate: 0.065 },
      { state: "CA", stateFullName: "California", rate: 0.0725 },
      { state: "CO", stateFullName: "Colorado", rate: 0.029 },
      { state: "CT", stateFullName: "Connecticut", rate: 0.0635 },
      { state: "DE", stateFullName: "Delaware", rate: 0 }, // No state sales tax
      { state: "DC", stateFullName: "District of Columbia", rate: 0.06 },
      { state: "FL", stateFullName: "Florida", rate: 0.06 },
      { state: "GA", stateFullName: "Georgia", rate: 0.04 },
      { state: "HI", stateFullName: "Hawaii", rate: 0.04 },
      { state: "ID", stateFullName: "Idaho", rate: 0.06 },
      { state: "IL", stateFullName: "Illinois", rate: 0.0625 },
      { state: "IN", stateFullName: "Indiana", rate: 0.07 },
      { state: "IA", stateFullName: "Iowa", rate: 0.06 },
      { state: "KS", stateFullName: "Kansas", rate: 0.065 },
      { state: "KY", stateFullName: "Kentucky", rate: 0.06 },
      { state: "LA", stateFullName: "Louisiana", rate: 0.0445 },
      { state: "ME", stateFullName: "Maine", rate: 0.055 },
      { state: "MD", stateFullName: "Maryland", rate: 0.06 },
      { state: "MA", stateFullName: "Massachusetts", rate: 0.0625 },
      { state: "MI", stateFullName: "Michigan", rate: 0.06 },
      { state: "MN", stateFullName: "Minnesota", rate: 0.06875 },
      { state: "MS", stateFullName: "Mississippi", rate: 0.07 },
      { state: "MO", stateFullName: "Missouri", rate: 0.04225 },
      { state: "MT", stateFullName: "Montana", rate: 0 }, // No state sales tax
      { state: "NE", stateFullName: "Nebraska", rate: 0.055 },
      { state: "NV", stateFullName: "Nevada", rate: 0.0685 },
      { state: "NH", stateFullName: "New Hampshire", rate: 0 }, // No state sales tax
      { state: "NJ", stateFullName: "New Jersey", rate: 0.06625 },
      { state: "NM", stateFullName: "New Mexico", rate: 0.04875 },
      { state: "NY", stateFullName: "New York", rate: 0.04 },
      { state: "NC", stateFullName: "North Carolina", rate: 0.0475 },
      { state: "ND", stateFullName: "North Dakota", rate: 0.05 },
      { state: "OH", stateFullName: "Ohio", rate: 0.0575 },
      { state: "OK", stateFullName: "Oklahoma", rate: 0.045 },
      { state: "OR", stateFullName: "Oregon", rate: 0 }, // No state sales tax
      { state: "PA", stateFullName: "Pennsylvania", rate: 0.06 },
      { state: "RI", stateFullName: "Rhode Island", rate: 0.07 },
      { state: "SC", stateFullName: "South Carolina", rate: 0.06 },
      { state: "SD", stateFullName: "South Dakota", rate: 0.042 },
      { state: "TN", stateFullName: "Tennessee", rate: 0.07 },
      { state: "TX", stateFullName: "Texas", rate: 0.0625 },
      { state: "UT", stateFullName: "Utah", rate: 0.061 },
      { state: "VT", stateFullName: "Vermont", rate: 0.06 },
      { state: "VA", stateFullName: "Virginia", rate: 0.053 },
      { state: "WA", stateFullName: "Washington", rate: 0.065 },
      { state: "WV", stateFullName: "West Virginia", rate: 0.06 },
      { state: "WI", stateFullName: "Wisconsin", rate: 0.05 },
      { state: "WY", stateFullName: "Wyoming", rate: 0.04 },
    ];

    let created = 0;
    let updated = 0;

    for (const { state, stateFullName, rate } of stateTaxRates) {
      const existing = await ctx.db
        .query("taxRates")
        .withIndex("by_state", (q) => q.eq("state", state))
        .first();

      if (existing) {
        // Update if rate changed
        if (existing.rate !== rate) {
          await ctx.db.patch(existing._id, {
            rate,
            stateFullName,
            updatedAt: now,
          });
          updated++;
        }
      } else {
        // Create new
        await ctx.db.insert("taxRates", {
          state,
          stateFullName,
          rate,
          description: rate === 0 ? "No state sales tax" : "State sales tax",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return {
      message: `Tax rates seeded successfully`,
      created,
      updated,
      total: stateTaxRates.length,
    };
  },
});

/**
 * Delete a tax rate (admin only)
 */
export const remove = mutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase();
    const taxRate = await ctx.db
      .query("taxRates")
      .withIndex("by_state", (q) => q.eq("state", stateCode))
      .first();

    if (!taxRate) {
      throw new Error(`Tax rate not found for state: ${stateCode}`);
    }

    await ctx.db.delete(taxRate._id);
    return { deleted: stateCode };
  },
});
