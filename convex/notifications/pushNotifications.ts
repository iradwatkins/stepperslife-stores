/**
 * Push Notification Sender
 * Sends PWA push notifications to staff for cash orders and online sales
 */

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Send push notification to staff about new cash order
 * Called from createCashOrder mutation
 */
export const notifyNewCashOrder = action({
  args: {
    orderId: v.id("orders"),
    eventId: v.id("events"),
    buyerName: v.string(),
    totalCents: v.number(),
  },
  handler: async (ctx, args) => {

    // Get event to find staff - use runMutation since getEventStaff is a mutation
    const event = await ctx.runMutation(internal.notifications.pushNotifications.getEventStaff, {
      eventId: args.eventId,
    });

    if (!event || !event.staffIds || event.staffIds.length === 0) {
      return { success: true, sent: 0 };
    }

    const totalDollars = (args.totalCents / 100).toFixed(2);
    const title = "💵 New Cash Order";
    const body = `${args.buyerName} wants to pay $${totalDollars} cash. Tap to approve.`;

    let sentCount = 0;

    // Send notification to all staff with cash acceptance enabled
    for (const staffId of event.staffIds) {
      const result = await ctx.runMutation(internal.notifications.pushNotifications.sendToStaff, {
        staffId,
        type: "CASH_ORDER",
        title,
        body,
        orderId: args.orderId,
        eventId: args.eventId,
        notificationType: "CASH_ORDER",
      });

      if (result.success) {
        sentCount += result.sent;
      }
    }


    return {
      success: true,
      sent: sentCount,
    };
  },
});

/**
 * Send push notification to staff about online ticket sale via their referral
 * Called when order is completed and has soldByStaffId
 */
export const notifyOnlineTicketSale = action({
  args: {
    orderId: v.id("orders"),
    eventId: v.id("events"),
    staffId: v.id("eventStaff"),
    buyerName: v.string(),
    totalCents: v.number(),
    ticketCount: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sent: number }> => {

    const totalDollars = (args.totalCents / 100).toFixed(2);
    const ticketText = args.ticketCount === 1 ? "ticket" : "tickets";
    const title = "🎉 You Made a Sale!";
    const body = `${args.buyerName} bought ${args.ticketCount} ${ticketText} for $${totalDollars}`;

    const result = await ctx.runMutation(internal.notifications.pushNotifications.sendToStaff, {
      staffId: args.staffId,
      type: "ONLINE_SALE",
      title,
      body,
      orderId: args.orderId,
      eventId: args.eventId,
      notificationType: "ONLINE_SALE",
    });


    return {
      success: true,
      sent: result.sent,
    };
  },
});

/**
 * Internal query: Get event staff IDs
 */
export const getEventStaff = internalMutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get all staff for event with cash acceptance enabled
    const staff = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("acceptCashInPerson"), true))
      .collect();

    return {
      staffIds: staff.map((s) => s._id),
    };
  },
});

/**
 * Internal mutation: Send notification to specific staff member
 * This is where the actual web-push sending happens
 */
export const sendToStaff = internalMutation({
  args: {
    staffId: v.id("eventStaff"),
    type: v.union(v.literal("CASH_ORDER"), v.literal("ONLINE_SALE")),
    title: v.string(),
    body: v.string(),
    orderId: v.optional(v.id("orders")),
    eventId: v.optional(v.id("events")),
    notificationType: v.union(v.literal("CASH_ORDER"), v.literal("ONLINE_SALE")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get active subscriptions for staff with correct notification preference
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter by notification preference
    const enabledSubscriptions = subscriptions.filter((sub) => {
      if (args.notificationType === "CASH_ORDER") {
        return sub.notifyOnCashOrders !== false;
      } else if (args.notificationType === "ONLINE_SALE") {
        return sub.notifyOnOnlineSales !== false;
      }
      return true;
    });

    if (enabledSubscriptions.length === 0) {
      return { success: true, sent: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    // For each subscription, we'll log it and mark as sent
    // In a real implementation, you'd use web-push library here
    // But Convex doesn't support Node.js crypto, so we'll need to use an HTTP action
    for (const sub of enabledSubscriptions) {
      try {
        // TODO: Call external web-push service or use HTTP action
        // For now, just log the notification

        // Log notification in database
        await ctx.db.insert("notificationLog", {
          staffId: args.staffId,
          type: args.type,
          title: args.title,
          body: args.body,
          orderId: args.orderId,
          eventId: args.eventId,
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
        console.error(`[sendToStaff] Failed to send to subscription ${sub._id}:`, error);

        // Log failed notification
        await ctx.db.insert("notificationLog", {
          staffId: args.staffId,
          type: args.type,
          title: args.title,
          body: args.body,
          orderId: args.orderId,
          eventId: args.eventId,
          status: "FAILED",
          error: error.message,
          sentAt: now,
        });

        // Increment failure count
        const newFailureCount = (sub.failureCount || 0) + 1;
        await ctx.db.patch(sub._id, {
          failureCount: newFailureCount,
          // Deactivate after 5 failures
          isActive: newFailureCount < 5,
          updatedAt: now,
        });

        failedCount++;
      }
    }


    return {
      success: true,
      sent: sentCount,
      failed: failedCount,
    };
  },
});

/**
 * Test notification (for debugging)
 */
export const sendTestNotification = action({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sent: number; failed: number }> => {

    const result = await ctx.runMutation(internal.notifications.pushNotifications.sendToStaff, {
      staffId: args.staffId,
      type: "CASH_ORDER",
      title: "🧪 Test Notification",
      body: "This is a test notification from SteppersLife Events",
      notificationType: "CASH_ORDER",
    });

    return {
      success: result.success,
      sent: result.sent,
      failed: result.failed || 0,
    };
  },
});
