/**
 * Shipping Zones Module
 * Story 4.2: Address-based shipping rates
 *
 * Provides zone-based shipping calculations for the SteppersLife marketplace.
 * Zones are defined by US state groupings with different rates.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get shipping zone for a specific state
 */
export const getZoneByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase().trim();

    // Get all active zones
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Find zone containing this state
    for (const zone of zones) {
      if (zone.states.includes(stateCode)) {
        return zone;
      }
    }

    // Return null if no zone found (shouldn't happen for valid US states)
    return null;
  },
});

/**
 * Calculate shipping rate for a cart based on state and method
 */
export const calculateShipping = query({
  args: {
    state: v.string(),
    method: v.union(v.literal("standard"), v.literal("express")),
    subtotal: v.number(), // In cents
  },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase().trim();

    // Get all active zones
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Find zone containing this state
    let matchedZone = null;
    for (const zone of zones) {
      if (zone.states.includes(stateCode)) {
        matchedZone = zone;
        break;
      }
    }

    if (!matchedZone) {
      // Default to Extended zone rates if state not found
      return {
        rate: args.method === "express" ? 1999 : 999, // $19.99 or $9.99
        zoneName: "Extended",
        deliveryDays: args.method === "express" ? "2-3 business days" : "5-7 business days",
        freeShipping: false,
      };
    }

    // Check for free shipping threshold
    const qualifiesForFreeShipping =
      matchedZone.freeShippingThreshold &&
      args.subtotal >= matchedZone.freeShippingThreshold &&
      args.method === "standard";

    const rate = qualifiesForFreeShipping
      ? 0
      : args.method === "express"
        ? matchedZone.expressRate
        : matchedZone.standardRate;

    return {
      rate,
      zoneName: matchedZone.name,
      deliveryDays:
        args.method === "express"
          ? matchedZone.expressDays
          : matchedZone.standardDays,
      freeShipping: qualifiesForFreeShipping,
      freeShippingThreshold: matchedZone.freeShippingThreshold,
    };
  },
});

/**
 * Get all active shipping zones
 */
export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("shippingZones")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Get all shipping zones (admin)
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("shippingZones").collect();
  },
});

/**
 * Get shipping options for a state (returns both standard and express rates)
 */
export const getShippingOptions = query({
  args: {
    state: v.string(),
    subtotal: v.number(), // In cents
  },
  handler: async (ctx, args) => {
    const stateCode = args.state.toUpperCase().trim();

    // Get all active zones
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Find zone containing this state
    let matchedZone = null;
    for (const zone of zones) {
      if (zone.states.includes(stateCode)) {
        matchedZone = zone;
        break;
      }
    }

    // Default rates if no zone found
    if (!matchedZone) {
      return {
        zoneName: "Extended",
        standard: {
          rate: 999,
          days: "5-7 business days",
          freeShipping: false,
        },
        express: {
          rate: 1999,
          days: "2-3 business days",
          freeShipping: false,
        },
        freeShippingThreshold: null,
      };
    }

    // Check for free standard shipping
    const qualifiesForFreeStandard =
      matchedZone.freeShippingThreshold &&
      args.subtotal >= matchedZone.freeShippingThreshold;

    return {
      zoneName: matchedZone.name,
      standard: {
        rate: qualifiesForFreeStandard ? 0 : matchedZone.standardRate,
        days: matchedZone.standardDays,
        freeShipping: qualifiesForFreeStandard,
      },
      express: {
        rate: matchedZone.expressRate,
        days: matchedZone.expressDays,
        freeShipping: false,
      },
      freeShippingThreshold: matchedZone.freeShippingThreshold,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Seed default shipping zones
 * Run once to populate initial data
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if zones already exist
    const existing = await ctx.db.query("shippingZones").first();
    if (existing) {
      return { success: false, message: "Shipping zones already seeded" };
    }

    const now = Date.now();

    const zones = [
      {
        name: "Local",
        states: ["IL", "IN", "WI"],
        standardRate: 599, // $5.99
        expressRate: 1299, // $12.99
        standardDays: "3-5 business days",
        expressDays: "1-2 business days",
        freeShippingThreshold: 7500, // Free shipping over $75
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Regional",
        states: ["MI", "OH", "MN", "IA", "MO", "KY"],
        standardRate: 799, // $7.99
        expressRate: 1599, // $15.99
        standardDays: "4-6 business days",
        expressDays: "2-3 business days",
        freeShippingThreshold: 10000, // Free shipping over $100
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Extended",
        states: [
          // East Coast
          "ME",
          "NH",
          "VT",
          "MA",
          "RI",
          "CT",
          "NY",
          "NJ",
          "PA",
          "DE",
          "MD",
          "DC",
          "VA",
          "WV",
          "NC",
          "SC",
          "GA",
          "FL",
          // South
          "AL",
          "MS",
          "TN",
          "AR",
          "LA",
          // Central
          "ND",
          "SD",
          "NE",
          "KS",
          "OK",
          "TX",
          // Mountain
          "MT",
          "ID",
          "WY",
          "CO",
          "NM",
          "AZ",
          "UT",
          "NV",
          // West Coast
          "WA",
          "OR",
          "CA",
        ],
        standardRate: 999, // $9.99
        expressRate: 1999, // $19.99
        standardDays: "5-7 business days",
        expressDays: "2-3 business days",
        freeShippingThreshold: 15000, // Free shipping over $150
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Remote",
        states: ["AK", "HI"],
        standardRate: 1499, // $14.99
        expressRate: 2999, // $29.99
        standardDays: "7-10 business days",
        expressDays: "3-5 business days",
        freeShippingThreshold: undefined, // No free shipping for remote
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Insert all zones
    for (const zone of zones) {
      await ctx.db.insert("shippingZones", zone);
    }

    return {
      success: true,
      message: `Seeded ${zones.length} shipping zones`,
    };
  },
});

/**
 * Update a shipping zone
 */
export const update = mutation({
  args: {
    id: v.id("shippingZones"),
    name: v.optional(v.string()),
    states: v.optional(v.array(v.string())),
    standardRate: v.optional(v.number()),
    expressRate: v.optional(v.number()),
    standardDays: v.optional(v.string()),
    expressDays: v.optional(v.string()),
    freeShippingThreshold: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    cleanUpdates.updatedAt = Date.now();

    await ctx.db.patch(id, cleanUpdates);

    return { success: true };
  },
});

/**
 * Toggle zone active status
 */
export const toggleActive = mutation({
  args: { id: v.id("shippingZones") },
  handler: async (ctx, args) => {
    const zone = await ctx.db.get(args.id);
    if (!zone) {
      throw new Error("Shipping zone not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !zone.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !zone.isActive };
  },
});

/**
 * Create a new shipping zone
 */
export const create = mutation({
  args: {
    name: v.string(),
    states: v.array(v.string()),
    standardRate: v.number(),
    expressRate: v.number(),
    standardDays: v.string(),
    expressDays: v.string(),
    freeShippingThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("shippingZones", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

/**
 * Delete a shipping zone
 */
export const remove = mutation({
  args: { id: v.id("shippingZones") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
