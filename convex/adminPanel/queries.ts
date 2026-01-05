import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { requireAdmin } from "../lib/permissions";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Admin queries - requires admin role
 */

/**
 * Get platform-wide analytics
 */
export const getPlatformAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // Return null if not authenticated - allows UI to show loading state
    // This handles the race condition where Convex token is still being fetched
    if (!identity?.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;
    const organizers = allUsers.filter((u) => u.role === "organizer").length;
    const admins = allUsers.filter((u) => u.role === "admin").length;

    // Get all events
    const allEvents = await ctx.db.query("events").collect();
    const totalEvents = allEvents.length;
    const publishedEvents = allEvents.filter((e) => e.status === "PUBLISHED").length;
    const draftEvents = allEvents.filter((e) => e.status === "DRAFT").length;

    // Get all orders
    const allOrders = await ctx.db.query("orders").collect();
    const completedOrders = allOrders.filter((o) => o.status === "COMPLETED");
    const totalOrders = completedOrders.length;

    // Calculate GMV (Gross Merchandise Value)
    const gmv = completedOrders.reduce((sum, order) => sum + (order.totalCents || 0), 0);
    const platformRevenue = completedOrders.reduce(
      (sum, order) => sum + (order.platformFeeCents || 0),
      0
    );

    // Get all tickets
    const allTickets = await ctx.db.query("tickets").collect();
    const totalTickets = allTickets.length;
    const validTickets = allTickets.filter((t) => t.status === "VALID").length;
    const scannedTickets = allTickets.filter((t) => t.status === "SCANNED").length;

    // Recent activity (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentUsers = allUsers.filter((u) => (u.createdAt || 0) > sevenDaysAgo).length;
    const recentEvents = allEvents.filter((e) => (e.createdAt || 0) > sevenDaysAgo).length;
    const recentOrders = allOrders.filter((o) => o.createdAt > sevenDaysAgo).length;

    return {
      users: {
        total: totalUsers,
        organizers,
        admins,
        regular: totalUsers - organizers - admins,
        recentSignups: recentUsers,
      },
      events: {
        total: totalEvents,
        published: publishedEvents,
        draft: draftEvents,
        recentCreated: recentEvents,
      },
      orders: {
        total: totalOrders,
        recentOrders,
      },
      tickets: {
        total: totalTickets,
        valid: validTickets,
        scanned: scannedTickets,
        scanRate: totalTickets > 0 ? (scannedTickets / totalTickets) * 100 : 0,
      },
      revenue: {
        gmv, // Total revenue across all events
        platformRevenue, // Platform fees collected
        averageOrderValue: totalOrders > 0 ? gmv / totalOrders : 0,
      },
    };
  },
});

/**
 * Get all users with pagination
 */
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Return null if not authenticated - allows UI to show loading state
    if (!identity?.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(args.limit || 50);

    // Enrich with event count
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const eventCount = await ctx.db
          .query("events")
          .withIndex("by_organizer", (q) => q.eq("organizerId", u._id))
          .collect();

        const orderCount = await ctx.db
          .query("orders")
          .filter((q) => q.eq(q.field("buyerId"), u._id))
          .collect();

        return {
          ...u,
          eventCount: eventCount.length,
          orderCount: orderCount.length,
        };
      })
    );

    return enrichedUsers;
  },
});

/**
 * Get all events for moderation
 */
export const getAllEvents = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("DRAFT"),
        v.literal("PUBLISHED"),
        v.literal("CANCELLED"),
        v.literal("COMPLETED")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Return null if not authenticated - allows UI to show loading state
    if (!identity?.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    const events = args.status
      ? await ctx.db
          .query("events")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(100)
      : await ctx.db.query("events").order("desc").take(100);

    // Enrich with organizer info
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const organizer = event.organizerId ? await ctx.db.get(event.organizerId) : null;

        const ticketCount = await ctx.db
          .query("tickets")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const orders = await ctx.db
          .query("orders")
          .filter((q) => q.eq(q.field("eventId"), event._id))
          .collect();

        const revenue = orders
          .filter((o) => o.status === "COMPLETED")
          .reduce((sum, o) => sum + (o.totalCents || 0), 0);

        return {
          ...event,
          organizerName: organizer?.name || event.organizerName || "Unknown",
          organizerEmail: organizer?.email || "N/A",
          ticketCount: ticketCount.length,
          revenue,
        };
      })
    );

    return enrichedEvents;
  },
});

/**
 * Get recent platform activity
 */
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // Return null if not authenticated - allows UI to show loading state
    if (!identity?.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    // Get recent users (last 20)
    const recentUsers = await ctx.db.query("users").order("desc").take(20);

    // Get recent events (last 20)
    const recentEvents = await ctx.db.query("events").order("desc").take(20);

    // Get recent orders (last 20)
    const recentOrders = await ctx.db.query("orders").order("desc").take(20);

    // Enrich orders with event info
    const enrichedOrders = await Promise.all(
      recentOrders.map(async (order) => {
        const event = await ctx.db.get(order.eventId);
        return {
          ...order,
          eventName: event?.name || "Unknown Event",
        };
      })
    );

    return {
      users: recentUsers,
      events: recentEvents,
      orders: enrichedOrders,
    };
  },
});

/**
 * Search users by email or name
 */
export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Return empty array if not authenticated - allows UI to show loading state
    if (!identity?.email) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    const allUsers = await ctx.db.query("users").collect();

    const searchTerm = args.query.toLowerCase();
    const filtered = allUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(searchTerm) || u.name?.toLowerCase().includes(searchTerm)
    );

    return filtered.slice(0, 50);
  },
});

/**
 * Get order details for refund processing (internal query)
 */
export const getOrderForRefund = internalQuery({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});
