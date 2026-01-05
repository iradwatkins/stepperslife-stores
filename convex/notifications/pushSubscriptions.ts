/**
 * Push Notification Subscription Management
 * Handles PWA push notification subscriptions for staff members
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Subscribe to push notifications
 * Called when user allows notifications on their device
 */
export const subscribe = mutation({
  args: {
    staffId: v.optional(v.id("eventStaff")),
    userId: v.optional(v.id("users")),
    subscription: v.object({
      endpoint: v.string(),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
    userAgent: v.optional(v.string()),
    deviceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();


    // Check if subscription already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.subscription.endpoint))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        staffId: args.staffId,
        userId: args.userId,
        keys: args.subscription.keys,
        userAgent: args.userAgent,
        deviceType: args.deviceType,
        isActive: true,
        notifyOnCashOrders: true, // Enable by default
        notifyOnOnlineSales: true, // Enable by default
        updatedAt: now,
      });


      return {
        success: true,
        subscriptionId: existing._id,
      };
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("pushSubscriptions", {
      staffId: args.staffId,
      userId: args.userId,
      endpoint: args.subscription.endpoint,
      keys: args.subscription.keys,
      userAgent: args.userAgent,
      deviceType: args.deviceType,
      isActive: true,
      notifyOnCashOrders: true, // Enable by default
      notifyOnOnlineSales: true, // Enable by default
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    });


    return {
      success: true,
      subscriptionId,
    };
  },
});

/**
 * Unsubscribe from push notifications
 */
export const unsubscribe = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {

    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (!subscription) {
      return { success: true };
    }

    // Mark as inactive (don't delete, keep history)
    await ctx.db.patch(subscription._id, {
      isActive: false,
      updatedAt: Date.now(),
    });


    return { success: true };
  },
});

/**
 * Update notification preferences
 */
export const updatePreferences = mutation({
  args: {
    staffId: v.id("eventStaff"),
    notifyOnCashOrders: v.optional(v.boolean()),
    notifyOnOnlineSales: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const sub of subscriptions) {
      const updates: any = { updatedAt: Date.now() };

      if (args.notifyOnCashOrders !== undefined) {
        updates.notifyOnCashOrders = args.notifyOnCashOrders;
      }
      if (args.notifyOnOnlineSales !== undefined) {
        updates.notifyOnOnlineSales = args.notifyOnOnlineSales;
      }

      await ctx.db.patch(sub._id, updates);
    }


    return {
      success: true,
      updated: subscriptions.length,
    };
  },
});

/**
 * Get active subscriptions for a staff member
 */
export const getStaffSubscriptions = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return subscriptions;
  },
});

/**
 * Get notification preferences for staff
 */
export const getStaffPreferences = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return {
      notifyOnCashOrders: subscription?.notifyOnCashOrders ?? true,
      notifyOnOnlineSales: subscription?.notifyOnOnlineSales ?? true,
      hasActiveSubscription: !!subscription,
    };
  },
});
