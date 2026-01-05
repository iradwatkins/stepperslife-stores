import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";

/**
 * Mark a single notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    const email = userInfo.email || identity.email;
    if (!email) {
      throw new Error("Invalid token");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify ownership
    if (notification.userId !== user._id) {
      throw new Error("Unauthorized - not your notification");
    }

    // Mark as read
    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark all notifications as read for current user
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    const email = userInfo.email || identity.email;
    if (!email) {
      throw new Error("Invalid token");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all unread notifications
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    // Mark all as read
    const now = Date.now();
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

/**
 * Create a notification for a user (internal use)
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("order"),
      v.literal("event"),
      v.literal("ticket"),
      v.literal("class"),
      v.literal("payout"),
      v.literal("review"),
      v.literal("message"),
      v.literal("system"),
      v.literal("promotion")
    ),
    title: v.string(),
    message: v.string(),
    linkType: v.optional(v.string()),
    linkId: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      linkType: args.linkType,
      linkId: args.linkId,
      linkUrl: args.linkUrl,
      imageUrl: args.imageUrl,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    const email = userInfo.email || identity.email;
    if (!email) {
      throw new Error("Invalid token");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify ownership
    if (notification.userId !== user._id) {
      throw new Error("Unauthorized - not your notification");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});
