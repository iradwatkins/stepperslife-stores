/**
 * Restaurant Notification System
 * Handles push notifications and email alerts for restaurant food orders
 */

import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Subscribe restaurant to push notifications
 * Called when restaurant owner enables notifications on their device
 */
export const subscribeRestaurant = mutation({
  args: {
    restaurantId: v.id("restaurants"),
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
        restaurantId: args.restaurantId,
        keys: args.subscription.keys,
        userAgent: args.userAgent,
        deviceType: args.deviceType,
        isActive: true,
        notifyOnFoodOrders: true,
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
      restaurantId: args.restaurantId,
      endpoint: args.subscription.endpoint,
      keys: args.subscription.keys,
      userAgent: args.userAgent,
      deviceType: args.deviceType,
      isActive: true,
      notifyOnFoodOrders: true,
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
 * Unsubscribe restaurant from push notifications
 */
export const unsubscribeRestaurant = mutation({
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
 * Get active subscriptions for a restaurant
 */
export const getRestaurantSubscriptions = query({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return subscriptions;
  },
});

/**
 * Check if restaurant has notifications enabled
 */
export const hasNotificationsEnabled = query({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return {
      enabled: !!subscription,
      subscriptionCount: subscription ? 1 : 0,
    };
  },
});

/**
 * Internal mutation: Send notification to restaurant
 * Logs the notification and will trigger actual push sending
 */
export const sendToRestaurant = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    foodOrderId: v.optional(v.id("foodOrders")),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get active subscriptions for restaurant
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.neq(q.field("notifyOnFoodOrders"), false))
      .collect();

    if (subscriptions.length === 0) {
      // Log that no subscriptions were found
      await ctx.db.insert("notificationLog", {
        restaurantId: args.restaurantId,
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
        // In production, this is where we'd call web-push or FCM
        await ctx.db.insert("notificationLog", {
          restaurantId: args.restaurantId,
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
          restaurantId: args.restaurantId,
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
 * Action: Notify restaurant of new food order
 * Called from foodOrders.create mutation
 */
export const notifyNewFoodOrder = action({
  args: {
    foodOrderId: v.id("foodOrders"),
    restaurantId: v.id("restaurants"),
    orderNumber: v.string(),
    customerName: v.string(),
    totalCents: v.number(),
    itemCount: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pushSent: number; emailScheduled: boolean }> => {
    const totalDollars = (args.totalCents / 100).toFixed(2);
    const itemText = args.itemCount === 1 ? "item" : "items";

    const title = "🍽️ New Food Order!";
    const body = `${args.customerName} ordered ${args.itemCount} ${itemText} for $${totalDollars}`;

    // Send push notification
    const pushResult = await ctx.runMutation(
      internal.notifications.restaurantNotifications.sendToRestaurant,
      {
        restaurantId: args.restaurantId,
        type: "FOOD_ORDER",
        title,
        body,
        foodOrderId: args.foodOrderId,
        data: {
          orderNumber: args.orderNumber,
          url: `/restaurateur/dashboard/orders`,
        },
      }
    );

    // If no push subscriptions or push failed, try email fallback
    if (!pushResult.success || pushResult.sent === 0) {
      // Schedule email notification as fallback
      await ctx.runMutation(
        internal.notifications.restaurantNotifications.scheduleEmailNotification,
        {
          restaurantId: args.restaurantId,
          foodOrderId: args.foodOrderId,
          orderNumber: args.orderNumber,
          customerName: args.customerName,
          totalCents: args.totalCents,
          itemCount: args.itemCount,
        }
      );
    }

    return {
      success: true,
      pushSent: pushResult.sent || 0,
      emailScheduled: !pushResult.success || pushResult.sent === 0,
    };
  },
});

/**
 * Internal mutation: Schedule email notification fallback
 */
export const scheduleEmailNotification = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    foodOrderId: v.id("foodOrders"),
    orderNumber: v.string(),
    customerName: v.string(),
    totalCents: v.number(),
    itemCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Get restaurant and owner info
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      return { success: false, reason: "restaurant_not_found" };
    }

    const owner = await ctx.db.get(restaurant.ownerId);
    if (!owner || !owner.email) {
      return { success: false, reason: "owner_not_found" };
    }

    // Log that email should be sent
    // In production, this calls Postal API (postal.toolboxhosting.com)
    const now = Date.now();
    await ctx.db.insert("notificationLog", {
      restaurantId: args.restaurantId,
      type: "FOOD_ORDER_EMAIL",
      title: "New Food Order",
      body: `Order ${args.orderNumber} from ${args.customerName} - $${(args.totalCents / 100).toFixed(2)}`,
      foodOrderId: args.foodOrderId,
      status: "SENT",
      sentAt: now,
    });

    return {
      success: true,
      email: owner.email,
    };
  },
});

/**
 * Test notification for restaurant (for debugging)
 */
export const sendTestNotification = action({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sent: number }> => {
    const result = await ctx.runMutation(
      internal.notifications.restaurantNotifications.sendToRestaurant,
      {
        restaurantId: args.restaurantId,
        type: "TEST",
        title: "🧪 Test Notification",
        body: "This is a test notification from SteppersLife Restaurants",
      }
    );

    return {
      success: result.success,
      sent: result.sent || 0,
    };
  },
});
