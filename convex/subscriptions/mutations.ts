import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Plan configurations with features/limits
// Use undefined instead of null for Convex compatibility
const PLAN_CONFIGS: Record<string, {
  maxEventsPerMonth: number | undefined;
  maxTicketsPerEvent: number | undefined;
  includedCredits: number;
  durationDays: number | undefined;
}> = {
  FREE: {
    maxEventsPerMonth: 3,
    maxTicketsPerEvent: 100,
    includedCredits: 0,
    durationDays: undefined, // No expiration for free tier
  },
  BASIC: {
    maxEventsPerMonth: 10,
    maxTicketsPerEvent: 500,
    includedCredits: 100,
    durationDays: 30,
  },
  PRO: {
    maxEventsPerMonth: 50,
    maxTicketsPerEvent: 2000,
    includedCredits: 500,
    durationDays: 30,
  },
  ENTERPRISE: {
    maxEventsPerMonth: undefined, // Unlimited
    maxTicketsPerEvent: undefined, // Unlimited
    includedCredits: 2000,
    durationDays: 30,
  },
};

type PlanType = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

/**
 * Activate a subscription after successful payment
 * Called from Stripe webhook when subscription payment is confirmed
 */
export const activateSubscription = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(
      v.literal("FREE"),
      v.literal("BASIC"),
      v.literal("PRO"),
      v.literal("ENTERPRISE")
    ),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    paymentAmount: v.optional(v.number()), // Amount in cents
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const planConfig = PLAN_CONFIGS[args.plan as PlanType];

    // Calculate expiration date (null duration = never expires)
    const expiresAt = planConfig.durationDays
      ? now + planConfig.durationDays * 24 * 60 * 60 * 1000
      : now + 100 * 365 * 24 * 60 * 60 * 1000; // 100 years for "never expires"

    // Check for existing active subscription
    const existingSubscription = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .first();

    if (existingSubscription) {
      // Upgrade/update existing subscription
      await ctx.db.patch(existingSubscription._id, {
        plan: args.plan,
        status: "ACTIVE",
        stripeSubscriptionId: args.stripeSubscriptionId || existingSubscription.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId || existingSubscription.stripeCustomerId,
        stripePriceId: args.stripePriceId || existingSubscription.stripePriceId,
        expiresAt,
        lastPaymentAt: now,
        lastPaymentAmount: args.paymentAmount,
        maxEventsPerMonth: planConfig.maxEventsPerMonth,
        maxTicketsPerEvent: planConfig.maxTicketsPerEvent,
        includedCredits: planConfig.includedCredits,
        updatedAt: now,
      });

      console.log(`[Subscriptions] Updated subscription for user ${args.userId} to ${args.plan}`);

      return {
        success: true,
        action: "updated",
        subscriptionId: existingSubscription._id,
        plan: args.plan,
        expiresAt,
      };
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("userSubscriptions", {
      userId: args.userId,
      plan: args.plan,
      status: "ACTIVE",
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      stripePriceId: args.stripePriceId,
      startedAt: now,
      expiresAt,
      lastPaymentAt: now,
      lastPaymentAmount: args.paymentAmount,
      maxEventsPerMonth: planConfig.maxEventsPerMonth,
      maxTicketsPerEvent: planConfig.maxTicketsPerEvent,
      includedCredits: planConfig.includedCredits,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[Subscriptions] Created new ${args.plan} subscription for user ${args.userId}`);

    return {
      success: true,
      action: "created",
      subscriptionId,
      plan: args.plan,
      expiresAt,
    };
  },
});

/**
 * Cancel a subscription
 * Called from Stripe webhook or user action
 */
export const cancelSubscription = mutation({
  args: {
    userId: v.optional(v.id("users")),
    stripeSubscriptionId: v.optional(v.string()),
    immediate: v.optional(v.boolean()), // If true, cancel immediately; otherwise, let it expire
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the subscription by either user ID or Stripe subscription ID
    let subscription;

    if (args.stripeSubscriptionId) {
      subscription = await ctx.db
        .query("userSubscriptions")
        .withIndex("by_stripeSubscriptionId", (q) =>
          q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
        )
        .first();
    } else if (args.userId) {
      const userId = args.userId; // Store in local const for TypeScript narrowing
      subscription = await ctx.db
        .query("userSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("status"), "ACTIVE"))
        .first();
    }

    if (!subscription) {
      console.warn(`[Subscriptions] No active subscription found for cancellation`);
      return { success: false, error: "Subscription not found" };
    }

    if (subscription.status === "CANCELLED") {
      return { success: true, alreadyCancelled: true };
    }

    // Update subscription status
    if (args.immediate) {
      // Immediate cancellation - expire now
      await ctx.db.patch(subscription._id, {
        status: "CANCELLED",
        cancelledAt: now,
        expiresAt: now, // Expire immediately
        updatedAt: now,
      });
      console.log(`[Subscriptions] Immediately cancelled subscription ${subscription._id}`);
    } else {
      // Graceful cancellation - let subscription run until expiry
      await ctx.db.patch(subscription._id, {
        status: "CANCELLED",
        cancelledAt: now,
        // Keep original expiresAt so they can use until end of billing period
        updatedAt: now,
      });
      console.log(`[Subscriptions] Cancelled subscription ${subscription._id}, active until ${new Date(subscription.expiresAt).toISOString()}`);
    }

    return {
      success: true,
      subscriptionId: subscription._id,
      expiresAt: args.immediate ? now : subscription.expiresAt,
    };
  },
});

/**
 * Handle subscription payment failure
 * Called from Stripe webhook when renewal payment fails
 */
export const handlePaymentFailed = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    attemptCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) {
      console.warn(`[Subscriptions] No subscription found for failed payment: ${args.stripeSubscriptionId}`);
      return { success: false, error: "Subscription not found" };
    }

    // Mark as past due
    await ctx.db.patch(subscription._id, {
      status: "PAST_DUE",
      updatedAt: Date.now(),
    });

    console.log(`[Subscriptions] Marked subscription ${subscription._id} as PAST_DUE after payment failure`);

    return { success: true, status: "PAST_DUE" };
  },
});

/**
 * Handle successful subscription renewal
 * Called from Stripe webhook when renewal payment succeeds
 */
export const handleRenewalSuccess = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    paymentAmount: v.number(),
    newExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const subscription = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) {
      console.warn(`[Subscriptions] No subscription found for renewal: ${args.stripeSubscriptionId}`);
      return { success: false, error: "Subscription not found" };
    }

    // Extend subscription
    const planConfig = PLAN_CONFIGS[subscription.plan as PlanType];
    const expiresAt = args.newExpiresAt || (planConfig.durationDays
      ? now + planConfig.durationDays * 24 * 60 * 60 * 1000
      : subscription.expiresAt);

    await ctx.db.patch(subscription._id, {
      status: "ACTIVE",
      expiresAt,
      lastPaymentAt: now,
      lastPaymentAmount: args.paymentAmount,
      updatedAt: now,
    });

    console.log(`[Subscriptions] Renewed subscription ${subscription._id}, new expiry: ${new Date(expiresAt).toISOString()}`);

    return { success: true, expiresAt };
  },
});

/**
 * Check and expire overdue subscriptions (cron job)
 */
export const expireOverdueSubscriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let expiredCount = 0;

    // Find expired subscriptions that are still marked as active
    const expiredSubscriptions = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "ACTIVE"),
          q.eq(q.field("status"), "PAST_DUE")
        )
      )
      .take(100); // Process in batches

    for (const subscription of expiredSubscriptions) {
      await ctx.db.patch(subscription._id, {
        status: "EXPIRED",
        updatedAt: now,
      });
      expiredCount++;
    }

    if (expiredCount > 0) {
      console.log(`[Subscriptions Cron] Expired ${expiredCount} overdue subscriptions`);
    }

    return { expired: expiredCount };
  },
});
