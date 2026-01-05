import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/permissions";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Get organizer earnings summary across all their events
 * Calculates total revenue, pending payouts, and completed payouts
 *
 * @returns Object with totalRevenueCents, pendingPayoutCents, totalPaidOutCents, orderCount
 */
export const getOrganizerEarnings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return {
        totalRevenueCents: 0,
        pendingPayoutCents: 0,
        totalPaidOutCents: 0,
        orderCount: 0,
        ticketsSold: 0,
      };
    }

    // Get current user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return {
        totalRevenueCents: 0,
        pendingPayoutCents: 0,
        totalPaidOutCents: 0,
        orderCount: 0,
        ticketsSold: 0,
      };
    }

    // Get all events owned by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    if (events.length === 0) {
      return {
        totalRevenueCents: 0,
        pendingPayoutCents: 0,
        totalPaidOutCents: 0,
        orderCount: 0,
        ticketsSold: 0,
      };
    }

    // Get all completed orders for these events
    let totalRevenueCents = 0;
    let orderCount = 0;
    let ticketsSold = 0;

    for (const event of events) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .filter((q) => q.eq(q.field("status"), "COMPLETED"))
        .collect();

      for (const order of orders) {
        // Revenue = subtotal - platform fees (what organizer keeps)
        const organizerRevenue = order.subtotalCents - (order.platformFeeCents || 0);
        totalRevenueCents += organizerRevenue;
        orderCount++;
      }

      // Add event's sold tickets count
      ticketsSold += event.ticketsSold || 0;
    }

    // For now, assume all revenue is pending (payout system not yet implemented)
    return {
      totalRevenueCents,
      pendingPayoutCents: totalRevenueCents,
      totalPaidOutCents: 0,
      orderCount,
      ticketsSold,
    };
  },
});

/**
 * Get revenue breakdown by event for the current organizer
 * Returns per-event revenue data for earnings page table
 *
 * @returns Array of event revenue summaries
 */
export const getEventRevenueBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return [];
    }

    // Get current user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return [];
    }

    // Get all events owned by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const results = [];

    for (const event of events) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .filter((q) => q.eq(q.field("status"), "COMPLETED"))
        .collect();

      let eventRevenueCents = 0;
      for (const order of orders) {
        eventRevenueCents += order.subtotalCents - (order.platformFeeCents || 0);
      }

      results.push({
        eventId: event._id,
        eventName: event.name,
        ticketsSold: event.ticketsSold || 0,
        revenueCents: eventRevenueCents,
        orderCount: orders.length,
        status: eventRevenueCents > 0 ? "pending" : "no_sales",
      });
    }

    return results;
  },
});

/**
 * Get order details by Stripe payment intent ID (for refund emails)
 */
export const getOrderByPaymentIntent = query({
  args: {
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("stripePaymentIntentId"), args.paymentIntentId))
      .first();

    if (!order) {
      return null;
    }

    // Get event details
    let eventName = "Event";
    let eventDate: number | undefined;

    if (order.eventId) {
      const event = await ctx.db.get(order.eventId);
      if (event) {
        eventName = event.name;
        eventDate = event.startDate;
      }
    }

    // Get buyer details from tickets if not on order
    let buyerEmail = order.buyerEmail || "";
    let buyerName = order.buyerName || "";

    if (!buyerEmail || !buyerName) {
      const tickets = await ctx.db
        .query("tickets")
        .filter((q) => q.eq(q.field("orderId"), order._id))
        .first();

      if (tickets) {
        buyerEmail = buyerEmail || tickets.attendeeEmail || "";
        buyerName = buyerName || tickets.attendeeName || "";
      }
    }

    // Use stripePaymentIntentId as order number if available, otherwise use _id
    const orderNumber = order.stripePaymentIntentId
      ? order.stripePaymentIntentId.substring(3, 15).toUpperCase()
      : String(order._id).substring(0, 12).toUpperCase();

    return {
      _id: order._id,
      email: buyerEmail,
      buyerName: buyerName,
      eventName: eventName,
      eventDate: eventDate,
      orderNumber: orderNumber,
      totalCents: order.totalCents,
      status: order.status,
    };
  },
});

// ============================================================
// PAYMENT RETRY QUERIES (Story 5.2)
// ============================================================

/**
 * Get all orders that are eligible for retry
 * Admin only - used for retry dashboard
 */
export const getRetryableOrders = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view retryable orders.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    const limit = args.limit || 50;

    // Get failed orders that are eligible for retry
    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "FAILED"),
          q.eq(q.field("retryEligible"), true)
        )
      )
      .order("desc")
      .take(limit);

    // Enrich with event info
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        let eventName = "Unknown Event";
        if (order.eventId) {
          const event = await ctx.db.get(order.eventId);
          if (event) {
            eventName = event.name;
          }
        }

        return {
          _id: order._id,
          eventId: order.eventId,
          eventName,
          buyerEmail: order.buyerEmail,
          buyerName: order.buyerName,
          totalCents: order.totalCents,
          paymentMethod: order.paymentMethod || "UNKNOWN",
          failureReason: order.failureReason || "Unknown failure",
          retryCount: order.retryCount || 0,
          maxRetries: order.maxRetries || 3,
          lastRetryAt: order.lastRetryAt,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      })
    );

    return enrichedOrders;
  },
});

/**
 * Get retry statistics for admin dashboard
 */
export const getRetryStatistics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view retry statistics.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    // Get all orders
    const allOrders = await ctx.db.query("orders").collect();
    const failedOrders = allOrders.filter((o) => o.status === "FAILED");
    const retryEligible = failedOrders.filter((o) => o.retryEligible === true);
    const retriedOrders = allOrders.filter((o) => (o.retryCount || 0) > 0);

    // Calculate successful retries (orders that were retried and are now completed)
    const successfulRetries = retriedOrders.filter((o) => o.status === "COMPLETED");

    // Calculate retry success rate
    const retrySuccessRate = retriedOrders.length > 0
      ? (successfulRetries.length / retriedOrders.length) * 100
      : 0;

    // Group by retry count
    const retryCountDistribution: Record<number, number> = {};
    for (const order of retriedOrders) {
      const count = order.retryCount || 0;
      retryCountDistribution[count] = (retryCountDistribution[count] || 0) + 1;
    }

    // Get recent retries (last 24 hours)
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentRetries = retriedOrders.filter(
      (o) => o.lastRetryAt && o.lastRetryAt >= last24h
    );

    return {
      totalFailed: failedOrders.length,
      retryEligible: retryEligible.length,
      totalRetried: retriedOrders.length,
      successfulRetries: successfulRetries.length,
      retrySuccessRate: Math.round(retrySuccessRate * 100) / 100,
      recentRetries: recentRetries.length,
      retryCountDistribution,
    };
  },
});

/**
 * Get order details for retry (includes payment info needed for retry)
 */
export const getOrderForRetry = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view order details.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    const order = await ctx.db.get(args.orderId);

    if (!order) {
      return null;
    }

    // Get event details
    let eventName = "Unknown Event";
    let eventDate: number | undefined;
    if (order.eventId) {
      const event = await ctx.db.get(order.eventId);
      if (event) {
        eventName = event.name;
        eventDate = event.startDate;
      }
    }

    // Get order items
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      _id: order._id,
      eventId: order.eventId,
      eventName,
      eventDate,
      buyerId: order.buyerId,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      status: order.status,
      subtotalCents: order.subtotalCents,
      platformFeeCents: order.platformFeeCents,
      processingFeeCents: order.processingFeeCents,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      stripePaymentIntentId: order.stripePaymentIntentId,
      paypalOrderId: order.paypalOrderId,
      failureReason: order.failureReason,
      retryCount: order.retryCount || 0,
      maxRetries: order.maxRetries || 3,
      retryEligible: order.retryEligible ?? true,
      lastRetryAt: order.lastRetryAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderItems: orderItems.map((item) => ({
        _id: item._id,
        ticketTierId: item.ticketTierId,
        priceCents: item.priceCents,
      })),
    };
  },
});

// ============================================================
// ORGANIZER TRANSACTIONS QUERY (Story 10.2)
// ============================================================

/**
 * Get paginated transactions for the current organizer
 * Returns orders across all organizer's events with event details
 *
 * @param limit - Number of transactions to return (default 50)
 * @param offset - Number of transactions to skip for pagination (default 0)
 * @param search - Search string to filter by order ID or event name
 * @returns Object with transactions array, total count, and pagination info
 */
export const getOrganizerTransactions = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return {
        transactions: [],
        total: 0,
        hasMore: false,
      };
    }

    // Get current user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      return {
        transactions: [],
        total: 0,
        hasMore: false,
      };
    }

    // Get all events owned by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    if (events.length === 0) {
      return {
        transactions: [],
        total: 0,
        hasMore: false,
      };
    }

    // Create a map for quick event name lookup
    const eventMap = new Map(events.map((e) => [e._id, e.name]));
    const eventIds = events.map((e) => e._id);

    // Collect all orders for organizer's events
    const allOrders: Array<{
      _id: string;
      orderId: string;
      eventId: string;
      eventName: string;
      date: number;
      amount: number;
      status: string;
      customerName: string;
      customerEmail: string;
      paymentMethod: string | undefined;
    }> = [];

    for (const eventId of eventIds) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      for (const order of orders) {
        const eventName = eventMap.get(order.eventId) || "Unknown Event";

        // Generate order ID display string
        const orderId = order.stripePaymentIntentId
          ? order.stripePaymentIntentId.substring(3, 15).toUpperCase()
          : String(order._id).substring(0, 12).toUpperCase();

        allOrders.push({
          _id: String(order._id),
          orderId,
          eventId: String(order.eventId),
          eventName,
          date: order.createdAt,
          amount: order.totalCents,
          status: order.status,
          customerName: order.buyerName,
          customerEmail: order.buyerEmail,
          paymentMethod: order.paymentMethod,
        });
      }
    }

    // Sort by date (newest first)
    allOrders.sort((a, b) => b.date - a.date);

    // Apply search filter if provided
    const search = args.search?.toLowerCase().trim();
    let filteredOrders = allOrders;
    if (search) {
      filteredOrders = allOrders.filter(
        (order) =>
          order.orderId.toLowerCase().includes(search) ||
          order.eventName.toLowerCase().includes(search) ||
          order.customerName.toLowerCase().includes(search) ||
          order.customerEmail.toLowerCase().includes(search)
      );
    }

    const total = filteredOrders.length;

    // Apply pagination
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const paginatedOrders = filteredOrders.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      transactions: paginatedOrders,
      total,
      hasMore,
    };
  },
});
