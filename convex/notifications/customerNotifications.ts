/**
 * Customer Notification System
 * Handles push notifications for customers about their food order status updates
 */

import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const STATUS_MESSAGES: Record<string, { title: string; body: (orderNumber: string) => string }> = {
  CONFIRMED: {
    title: "Order Confirmed! ✅",
    body: (orderNumber) => `Your order #${orderNumber} has been confirmed and will be prepared soon.`,
  },
  PREPARING: {
    title: "Order Being Prepared 👨‍🍳",
    body: (orderNumber) => `Your order #${orderNumber} is now being prepared.`,
  },
  READY_FOR_PICKUP: {
    title: "Order Ready! 🎉",
    body: (orderNumber) => `Your order #${orderNumber} is ready for pickup!`,
  },
  COMPLETED: {
    title: "Order Complete 🙏",
    body: (orderNumber) => `Thank you! Your order #${orderNumber} has been picked up.`,
  },
  CANCELLED: {
    title: "Order Cancelled ❌",
    body: (orderNumber) => `Your order #${orderNumber} has been cancelled. Please contact the restaurant for details.`,
  },
};

/**
 * Subscribe customer to push notifications for their orders
 */
export const subscribeCustomer = mutation({
  args: {
    userId: v.id("users"),
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

    // Check if subscription already exists for this endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.subscription.endpoint))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        keys: args.subscription.keys,
        userAgent: args.userAgent,
        deviceType: args.deviceType,
        isActive: true,
        updatedAt: now,
      });

      return {
        success: true,
        subscriptionId: existing._id,
        isNew: false,
      };
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("pushSubscriptions", {
      userId: args.userId,
      endpoint: args.subscription.endpoint,
      keys: args.subscription.keys,
      userAgent: args.userAgent,
      deviceType: args.deviceType,
      isActive: true,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      subscriptionId,
      isNew: true,
    };
  },
});

/**
 * Unsubscribe customer from push notifications
 */
export const unsubscribeCustomer = mutation({
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

    await ctx.db.patch(subscription._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Check if customer has notifications enabled
 */
export const hasNotificationsEnabled = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return {
      enabled: !!subscription,
    };
  },
});

/**
 * Internal mutation: Send notification to customer
 */
export const sendToCustomer = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    foodOrderId: v.optional(v.id("foodOrders")),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get active subscriptions for customer
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (subscriptions.length === 0) {
      // Log that no subscriptions were found
      await ctx.db.insert("notificationLog", {
        userId: args.userId,
        type: args.type,
        title: args.title,
        body: args.body,
        foodOrderId: args.foodOrderId,
        status: "FAILED",
        error: "No active push subscriptions",
        sentAt: now,
      });

      return { success: false, sent: 0, reason: "no_subscriptions" };
    }

    let sentCount = 0;

    for (const sub of subscriptions) {
      try {
        // Log notification as sent
        // In production, this would call web-push or FCM
        await ctx.db.insert("notificationLog", {
          userId: args.userId,
          type: args.type,
          title: args.title,
          body: args.body,
          foodOrderId: args.foodOrderId,
          status: "SENT",
          sentAt: now,
        });

        // Update last used timestamp
        await ctx.db.patch(sub._id, {
          lastUsed: now,
          updatedAt: now,
        });

        sentCount++;
      } catch (error: any) {
        // Log failed notification
        await ctx.db.insert("notificationLog", {
          userId: args.userId,
          type: args.type,
          title: args.title,
          body: args.body,
          foodOrderId: args.foodOrderId,
          status: "FAILED",
          error: error.message,
          sentAt: now,
        });

        // Increment failure count
        const newFailureCount = (sub.failureCount || 0) + 1;
        await ctx.db.patch(sub._id, {
          failureCount: newFailureCount,
          isActive: newFailureCount < 5, // Deactivate after 5 failures
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      sent: sentCount,
      total: subscriptions.length,
    };
  },
});

/**
 * Action: Notify customer of order status update
 */
export const notifyOrderStatusUpdate = action({
  args: {
    foodOrderId: v.id("foodOrders"),
    customerId: v.id("users"),
    orderNumber: v.string(),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const statusConfig = STATUS_MESSAGES[args.newStatus];

    if (!statusConfig) {
      return { success: false, reason: "unknown_status" };
    }

    const title = statusConfig.title;
    const body = statusConfig.body(args.orderNumber);

    // Send push notification using the internal mutation reference
    const sendToCustomerInternal = internal.notifications.customerNotifications as any;
    const pushResult = await ctx.runMutation(
      sendToCustomerInternal.sendToCustomer,
      {
        userId: args.customerId,
        type: "ORDER_STATUS_UPDATE",
        title,
        body,
        foodOrderId: args.foodOrderId,
        data: {
          orderNumber: args.orderNumber,
          status: args.newStatus,
          url: `/restaurants/my-orders`,
        },
      }
    );

    return {
      success: pushResult.success,
      sent: pushResult.sent || 0,
    };
  },
});

/**
 * Test notification for customer (for debugging)
 */
export const sendTestNotification = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sendToCustomerInternal = internal.notifications.customerNotifications as any;
    const result = await ctx.runMutation(
      sendToCustomerInternal.sendToCustomer,
      {
        userId: args.userId,
        type: "TEST",
        title: "🧪 Test Notification",
        body: "This is a test notification from SteppersLife Restaurants",
      }
    );

    return {
      success: result.success,
      sent: result.sent,
    };
  },
});
