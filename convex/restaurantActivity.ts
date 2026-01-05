import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { getMyRestaurants, getRestaurantAccess } from "./lib/restaurantAuth";

/**
 * Get recent activity for user's restaurants
 * Combines orders, reviews, and staff changes into a single feed
 */
export const getRecentActivity = query({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const limit = args.limit || 20;

    // Get restaurants the user has access to
    let restaurantIds: string[] = [];

    if (args.restaurantId) {
      // Verify user has access to this restaurant
      const access = await getRestaurantAccess(ctx, args.restaurantId);
      if (!access) {
        throw new Error("Not authorized to view this restaurant's activity");
      }
      restaurantIds = [args.restaurantId];
    } else {
      // Get all restaurants user owns or manages
      const myRestaurants = await getMyRestaurants(ctx);
      restaurantIds = myRestaurants.map((r) => r.restaurant._id);
    }

    if (restaurantIds.length === 0) {
      return [];
    }

    const activities: Array<{
      id: string;
      type: "order" | "review" | "staff" | "status";
      title: string;
      description: string;
      timestamp: number;
      restaurantId: string;
      restaurantName?: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // Fetch recent orders (last 24 hours or most recent 10)
    for (const restaurantId of restaurantIds) {
      const restaurant = await ctx.db.get(restaurantId as any) as { name?: string } | null;

      // Get recent orders
      const orders = await ctx.db
        .query("foodOrders")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId as any))
        .order("desc")
        .take(10);

      for (const order of orders) {
        activities.push({
          id: order._id,
          type: "order",
          title: `New order #${order.orderNumber}`,
          description: `${order.customerName} - $${(order.total / 100).toFixed(2)}`,
          timestamp: order.placedAt,
          restaurantId,
          restaurantName: restaurant?.name,
          metadata: {
            status: order.status,
            total: order.total,
            itemCount: order.items.length,
          },
        });
      }

      // Get recent reviews
      const reviews = await ctx.db
        .query("restaurantReviews")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId as any))
        .order("desc")
        .take(5);

      for (const review of reviews) {
        const reviewer = await ctx.db.get(review.customerId) as { name?: string } | null;
        activities.push({
          id: review._id,
          type: "review",
          title: `New ${review.rating}-star review`,
          description: review.reviewText
            ? review.reviewText.substring(0, 80) + (review.reviewText.length > 80 ? "..." : "")
            : "No comment",
          timestamp: review.createdAt,
          restaurantId,
          restaurantName: restaurant?.name,
          metadata: {
            rating: review.rating,
            reviewerName: reviewer?.name || "Anonymous",
          },
        });
      }

      // Get recent staff changes
      const staffChanges = await ctx.db
        .query("restaurantStaff")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId as any))
        .order("desc")
        .take(5);

      for (const staff of staffChanges) {
        // userId may be undefined for pending invitations
        const staffUser = staff.userId ? await ctx.db.get(staff.userId) : null;
        const statusLabel =
          staff.status === "ACTIVE"
            ? "joined"
            : staff.status === "PENDING"
              ? "was invited"
              : "left";
        activities.push({
          id: staff._id,
          type: "staff",
          title: `${staffUser?.name || staff.name} ${statusLabel}`,
          description: `Role: ${staff.role === "RESTAURANT_MANAGER" ? "Manager" : "Staff"}`,
          timestamp: staff.updatedAt || staff.createdAt,
          restaurantId,
          restaurantName: restaurant?.name,
          metadata: {
            role: staff.role,
            status: staff.status,
          },
        });
      }
    }

    // Sort by timestamp (most recent first) and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, limit);
  },
});

/**
 * Get order stats for dashboard
 */
export const getOrderStats = query({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Get restaurants the user has access to
    let restaurantIds: string[] = [];

    if (args.restaurantId) {
      const access = await getRestaurantAccess(ctx, args.restaurantId);
      if (!access) {
        throw new Error("Not authorized");
      }
      restaurantIds = [args.restaurantId];
    } else {
      const myRestaurants = await getMyRestaurants(ctx);
      restaurantIds = myRestaurants.map((r) => r.restaurant._id);
    }

    if (restaurantIds.length === 0) {
      return {
        pendingOrders: 0,
        todayOrders: 0,
        todayRevenue: 0,
        averageRating: 0,
      };
    }

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    let pendingOrders = 0;
    let todayOrders = 0;
    let todayRevenue = 0;
    let totalRating = 0;
    let reviewCount = 0;

    for (const restaurantId of restaurantIds) {
      // Count pending orders
      const pending = await ctx.db
        .query("foodOrders")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId as any))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "PENDING"),
            q.eq(q.field("status"), "CONFIRMED"),
            q.eq(q.field("status"), "PREPARING")
          )
        )
        .collect();
      pendingOrders += pending.length;

      // Count today's orders
      const today = await ctx.db
        .query("foodOrders")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId as any))
        .filter((q) => q.gte(q.field("placedAt"), todayStart))
        .collect();
      todayOrders += today.length;
      todayRevenue += today.reduce((sum, order) => sum + order.total, 0);

      // Get average rating
      const reviews = await ctx.db
        .query("restaurantReviews")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId as any))
        .collect();
      totalRating += reviews.reduce((sum, review) => sum + review.rating, 0);
      reviewCount += reviews.length;
    }

    return {
      pendingOrders,
      todayOrders,
      todayRevenue,
      averageRating: reviewCount > 0 ? totalRating / reviewCount : 0,
    };
  },
});
