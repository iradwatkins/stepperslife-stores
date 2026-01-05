import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Get a single feature flag by key
export const getFeatureFlag = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return flag;
  },
});

// Get all feature flags
export const getAllFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    const flags = await ctx.db.query("featureFlags").collect();
    return flags;
  },
});

// Check if a feature is enabled (returns boolean)
export const isFeatureEnabled = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return flag?.enabled ?? false;
  },
});

// Set/update a feature flag
export const setFeatureFlag = mutation({
  args: {
    key: v.string(),
    enabled: v.boolean(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if flag already exists
    const existingFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existingFlag) {
      // Update existing flag
      await ctx.db.patch(existingFlag._id, {
        enabled: args.enabled,
        description: args.description ?? existingFlag.description,
        updatedAt: Date.now(),
      });
      return existingFlag._id;
    } else {
      // Create new flag
      const id = await ctx.db.insert("featureFlags", {
        key: args.key,
        enabled: args.enabled,
        description: args.description,
        updatedAt: Date.now(),
      });
      return id;
    }
  },
});

// Initialize default feature flags (call once on first load)
export const initializeDefaultFlags = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultFlags = [
      {
        key: "testing_mode",
        enabled: true,
        description: "Bypass Square payment processing for testing",
      },
      {
        key: "staff_commission_system",
        enabled: true,
        description: "Referral tracking and commissions",
      },
      {
        key: "email_notifications",
        enabled: true,
        description: "Send automated emails via Postal",
      },
      {
        key: "event_analytics",
        enabled: true,
        description: "Advanced analytics for organizers",
      },
      {
        key: "push_notifications",
        enabled: true,
        description: "Push notifications to staff devices",
      },
    ];

    const results = [];
    for (const flag of defaultFlags) {
      // Check if flag already exists
      const existing = await ctx.db
        .query("featureFlags")
        .withIndex("by_key", (q) => q.eq("key", flag.key))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("featureFlags", {
          ...flag,
          updatedAt: Date.now(),
        });
        results.push({ key: flag.key, action: "created", id });
      } else {
        results.push({ key: flag.key, action: "exists", id: existing._id });
      }
    }

    return results;
  },
});

// Delete a feature flag (admin only)
export const deleteFeatureFlag = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (flag) {
      await ctx.db.delete(flag._id);
      return { success: true, deleted: args.key };
    }

    return { success: false, error: "Flag not found" };
  },
});
