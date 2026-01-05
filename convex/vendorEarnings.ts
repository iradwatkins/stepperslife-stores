import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get earnings for a vendor
export const getByVendor = query({
  args: {
    vendorId: v.id("vendors"),
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("AVAILABLE"),
        v.literal("PROCESSING"),
        v.literal("PAID"),
        v.literal("REFUNDED")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("vendorEarnings")
        .withIndex("by_vendor_status", (q) =>
          q.eq("vendorId", args.vendorId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("vendorEarnings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

// Get earnings summary for a vendor
export const getSummary = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const earnings = await ctx.db
      .query("vendorEarnings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    const summary = {
      totalEarnings: 0,
      availableBalance: 0,
      pendingEarnings: 0,
      processingEarnings: 0,
      paidEarnings: 0,
      refundedAmount: 0,
      totalCommissionPaid: 0,
      orderCount: earnings.length,
    };

    for (const earning of earnings) {
      summary.totalEarnings += earning.netAmount;
      summary.totalCommissionPaid += earning.commissionAmount;

      switch (earning.status) {
        case "PENDING":
          summary.pendingEarnings += earning.netAmount;
          break;
        case "AVAILABLE":
          summary.availableBalance += earning.netAmount;
          break;
        case "PROCESSING":
          summary.processingEarnings += earning.netAmount;
          break;
        case "PAID":
          summary.paidEarnings += earning.netAmount;
          break;
        case "REFUNDED":
          summary.refundedAmount += earning.netAmount;
          break;
      }
    }

    return summary;
  },
});

// Get earning by order ID
export const getByOrder = query({
  args: { orderId: v.id("productOrders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendorEarnings")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

// Get recent earnings for vendor dashboard
export const getRecent = query({
  args: {
    vendorId: v.id("vendors"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("vendorEarnings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .take(limit);
  },
});

// Create earning record from order (called when order is placed)
export const createFromOrder = mutation({
  args: {
    vendorId: v.id("vendors"),
    orderId: v.id("productOrders"),
    orderNumber: v.string(),
    grossAmount: v.number(), // Total sale for vendor items in cents
    commissionRate: v.number(), // Commission percentage at time of sale
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Calculate commission and net amount
    const commissionAmount = Math.round(args.grossAmount * (args.commissionRate / 100));
    const netAmount = args.grossAmount - commissionAmount;

    return await ctx.db.insert("vendorEarnings", {
      vendorId: args.vendorId,
      orderId: args.orderId,
      orderNumber: args.orderNumber,
      orderDate: now,
      grossAmount: args.grossAmount,
      commissionRate: args.commissionRate,
      commissionAmount,
      netAmount,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update earning status (e.g., when payment is confirmed)
export const updateStatus = mutation({
  args: {
    id: v.id("vendorEarnings"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("AVAILABLE"),
      v.literal("PROCESSING"),
      v.literal("PAID"),
      v.literal("REFUNDED")
    ),
    payoutId: v.optional(v.id("vendorPayouts")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      payoutId: args.payoutId,
      updatedAt: Date.now(),
    });
  },
});

// Mark earnings as available (called when payment is confirmed)
export const markAvailable = mutation({
  args: { orderId: v.id("productOrders") },
  handler: async (ctx, args) => {
    const earnings = await ctx.db
      .query("vendorEarnings")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    const now = Date.now();
    for (const earning of earnings) {
      if (earning.status === "PENDING") {
        await ctx.db.patch(earning._id, {
          status: "AVAILABLE",
          updatedAt: now,
        });
      }
    }

    return earnings.length;
  },
});

// Mark earnings as refunded
export const markRefunded = mutation({
  args: { orderId: v.id("productOrders") },
  handler: async (ctx, args) => {
    const earnings = await ctx.db
      .query("vendorEarnings")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    const now = Date.now();
    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        status: "REFUNDED",
        updatedAt: now,
      });
    }

    return earnings.length;
  },
});

// Mark multiple earnings as processing (for payout)
export const markProcessing = mutation({
  args: {
    earningIds: v.array(v.id("vendorEarnings")),
    payoutId: v.id("vendorPayouts"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.earningIds) {
      await ctx.db.patch(id, {
        status: "PROCESSING",
        payoutId: args.payoutId,
        updatedAt: now,
      });
    }
    return args.earningIds.length;
  },
});

// Mark multiple earnings as paid (when payout completes)
export const markPaid = mutation({
  args: { payoutId: v.id("vendorPayouts") },
  handler: async (ctx, args) => {
    const earnings = await ctx.db
      .query("vendorEarnings")
      .filter((q) => q.eq(q.field("payoutId"), args.payoutId))
      .collect();

    const now = Date.now();
    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        status: "PAID",
        updatedAt: now,
      });
    }

    return earnings.length;
  },
});

// Get available earnings for payout request
export const getAvailableForPayout = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendorEarnings")
      .withIndex("by_vendor_status", (q) =>
        q.eq("vendorId", args.vendorId).eq("status", "AVAILABLE")
      )
      .collect();
  },
});
