import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/permissions";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Get current user's credit balance
 * Returns full credit object with creditsRemaining, creditsUsed, creditsTotal
 */
export const getCreditBalance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return null;

    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!credits) return null;

    // Return full credits object for components to use
    return credits;
  },
});

/**
 * Get comprehensive payment analytics for admin dashboard (Story 5.1)
 * Includes success rates, provider breakdown, refund stats, and trends
 */
export const getPaymentAnalytics = query({
  args: {
    days: v.optional(v.number()), // Number of days to analyze (default 30)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to access payment analytics.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    const daysToAnalyze = args.days || 30;
    const startTime = Date.now() - daysToAnalyze * 24 * 60 * 60 * 1000;

    // Get all orders
    const allOrders = await ctx.db.query("orders").collect();
    const recentOrders = allOrders.filter((o) => o.createdAt >= startTime);

    // Order status breakdown
    const completed = allOrders.filter((o) => o.status === "COMPLETED");
    const failed = allOrders.filter((o) => o.status === "FAILED");
    const refunded = allOrders.filter((o) => o.status === "REFUNDED");
    const pending = allOrders.filter((o) => o.status === "PENDING");

    // Calculate success rate
    const processedOrders = completed.length + failed.length + refunded.length;
    const successRate = processedOrders > 0 ? (completed.length / processedOrders) * 100 : 0;
    const refundRate = processedOrders > 0 ? (refunded.length / processedOrders) * 100 : 0;

    // Payment provider breakdown
    const stripeOrders = allOrders.filter((o) => o.stripePaymentIntentId);
    const paypalOrders = allOrders.filter((o) => o.paypalOrderId);
    const cashOrders = allOrders.filter((o) => o.paymentMethod === "CASH");

    // Revenue calculations
    const totalRevenue = completed.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    const platformFees = completed.reduce((sum, o) => sum + (o.platformFeeCents || 0), 0);
    const refundedAmount = refunded.reduce((sum, o) => sum + (o.totalCents || 0), 0);

    // Daily revenue for trends (last N days)
    const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < daysToAnalyze; i++) {
      const dayStart = Date.now() - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = Date.now() - i * 24 * 60 * 60 * 1000;
      const dayOrders = completed.filter(
        (o) => o.createdAt >= dayStart && o.createdAt < dayEnd
      );
      const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
      const date = new Date(dayStart).toISOString().split("T")[0];
      dailyRevenue.push({ date, revenue: dayRevenue, orders: dayOrders.length });
    }
    dailyRevenue.reverse(); // Oldest first

    // Get webhook events for processing stats
    const webhookEvents = await ctx.db.query("processedWebhookEvents").collect();
    const stripeWebhooks = webhookEvents.filter((e) => e.provider === "stripe");
    const paypalWebhooks = webhookEvents.filter((e) => e.provider === "paypal");

    // Recent failed orders for investigation
    const recentFailed = failed
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((o) => ({
        id: o._id,
        createdAt: o.createdAt,
        totalCents: o.totalCents,
        eventId: o.eventId,
        paymentMethod: o.stripePaymentIntentId
          ? "stripe"
          : o.paypalOrderId
          ? "paypal"
          : "cash",
      }));

    return {
      summary: {
        totalOrders: allOrders.length,
        completedOrders: completed.length,
        failedOrders: failed.length,
        refundedOrders: refunded.length,
        pendingOrders: pending.length,
        successRate: Math.round(successRate * 100) / 100,
        refundRate: Math.round(refundRate * 100) / 100,
      },
      revenue: {
        totalRevenue,
        platformFees,
        refundedAmount,
        netRevenue: totalRevenue - refundedAmount,
        averageOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
      },
      providers: {
        stripe: {
          orders: stripeOrders.length,
          completed: stripeOrders.filter((o) => o.status === "COMPLETED").length,
          failed: stripeOrders.filter((o) => o.status === "FAILED").length,
          refunded: stripeOrders.filter((o) => o.status === "REFUNDED").length,
          revenue: stripeOrders
            .filter((o) => o.status === "COMPLETED")
            .reduce((sum, o) => sum + (o.totalCents || 0), 0),
        },
        paypal: {
          orders: paypalOrders.length,
          completed: paypalOrders.filter((o) => o.status === "COMPLETED").length,
          failed: paypalOrders.filter((o) => o.status === "FAILED").length,
          refunded: paypalOrders.filter((o) => o.status === "REFUNDED").length,
          revenue: paypalOrders
            .filter((o) => o.status === "COMPLETED")
            .reduce((sum, o) => sum + (o.totalCents || 0), 0),
        },
        cash: {
          orders: cashOrders.length,
          completed: cashOrders.filter((o) => o.status === "COMPLETED").length,
          pending: cashOrders.filter((o) => o.status === "PENDING").length,
          revenue: cashOrders
            .filter((o) => o.status === "COMPLETED")
            .reduce((sum, o) => sum + (o.totalCents || 0), 0),
        },
      },
      webhooks: {
        stripe: stripeWebhooks.length,
        paypal: paypalWebhooks.length,
        total: webhookEvents.length,
      },
      trends: {
        dailyRevenue,
        recentPeriod: {
          orders: recentOrders.length,
          revenue: recentOrders
            .filter((o) => o.status === "COMPLETED")
            .reduce((sum, o) => sum + (o.totalCents || 0), 0),
        },
      },
      recentFailed,
    };
  },
});

/**
 * Get payment provider health status
 * Used for monitoring payment system availability
 */
export const getPaymentProviderStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view payment provider status.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    requireAdmin(user);

    // Check recent webhook activity (last 24 hours)
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentWebhooks = await ctx.db
      .query("processedWebhookEvents")
      .filter((q) => q.gte(q.field("processedAt"), last24h))
      .collect();

    const stripeWebhooks = recentWebhooks.filter((e) => e.provider === "stripe");
    const paypalWebhooks = recentWebhooks.filter((e) => e.provider === "paypal");

    // Check recent orders for failure patterns
    const recentOrders = await ctx.db
      .query("orders")
      .filter((q) => q.gte(q.field("createdAt"), last24h))
      .collect();

    const stripeOrders = recentOrders.filter((o) => o.stripePaymentIntentId);
    const paypalOrders = recentOrders.filter((o) => o.paypalOrderId);

    const stripeFailures = stripeOrders.filter((o) => o.status === "FAILED");
    const paypalFailures = paypalOrders.filter((o) => o.status === "FAILED");

    // Determine health status based on failure rates
    const getHealthStatus = (
      total: number,
      failed: number
    ): "healthy" | "degraded" | "down" => {
      if (total === 0) return "healthy"; // No activity, assume healthy
      const failureRate = failed / total;
      if (failureRate > 0.5) return "down";
      if (failureRate > 0.1) return "degraded";
      return "healthy";
    };

    return {
      stripe: {
        status: getHealthStatus(stripeOrders.length, stripeFailures.length),
        last24h: {
          orders: stripeOrders.length,
          completed: stripeOrders.filter((o) => o.status === "COMPLETED").length,
          failed: stripeFailures.length,
          webhooks: stripeWebhooks.length,
        },
        lastWebhook: stripeWebhooks.length > 0
          ? Math.max(...stripeWebhooks.map((w) => w.processedAt))
          : null,
      },
      paypal: {
        status: getHealthStatus(paypalOrders.length, paypalFailures.length),
        last24h: {
          orders: paypalOrders.length,
          completed: paypalOrders.filter((o) => o.status === "COMPLETED").length,
          failed: paypalFailures.length,
          webhooks: paypalWebhooks.length,
        },
        lastWebhook: paypalWebhooks.length > 0
          ? Math.max(...paypalWebhooks.map((w) => w.processedAt))
          : null,
      },
      overall: {
        totalOrders: recentOrders.length,
        totalFailed: stripeFailures.length + paypalFailures.length,
        totalWebhooks: recentWebhooks.length,
      },
    };
  },
});
