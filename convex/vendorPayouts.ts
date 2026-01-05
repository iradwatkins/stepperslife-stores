import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Minimum payout amount in cents ($25)
const MINIMUM_PAYOUT_AMOUNT = 2500;

// Generate payout number
function generatePayoutNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

// Get payouts for a vendor
export const getByVendor = query({
  args: {
    vendorId: v.id("vendors"),
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("APPROVED"),
        v.literal("PROCESSING"),
        v.literal("COMPLETED"),
        v.literal("FAILED")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const all = await ctx.db
        .query("vendorPayouts")
        .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
        .order("desc")
        .collect();
      return all.filter((p) => p.status === args.status);
    }
    return await ctx.db
      .query("vendorPayouts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

// Get payout by ID
export const getById = query({
  args: { id: v.id("vendorPayouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get pending payouts (for admin)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("vendorPayouts")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();
  },
});

// Get all payouts (for admin)
export const getAllAdmin = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("APPROVED"),
        v.literal("PROCESSING"),
        v.literal("COMPLETED"),
        v.literal("FAILED")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("vendorPayouts")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("vendorPayouts").order("desc").collect();
  },
});

// Request payout (vendor)
export const request = mutation({
  args: {
    vendorId: v.id("vendors"),
    payoutMethod: v.string(), // "bank_transfer", "paypal", "check"
  },
  handler: async (ctx, args) => {
    // Get available earnings
    const availableEarnings = await ctx.db
      .query("vendorEarnings")
      .withIndex("by_vendor_status", (q) =>
        q.eq("vendorId", args.vendorId).eq("status", "AVAILABLE")
      )
      .collect();

    if (availableEarnings.length === 0) {
      throw new Error("No available earnings for payout");
    }

    // Calculate total
    const totalAmount = availableEarnings.reduce(
      (sum, e) => sum + e.netAmount,
      0
    );

    if (totalAmount < MINIMUM_PAYOUT_AMOUNT) {
      throw new Error(
        `Minimum payout amount is $${(MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}. You have $${(totalAmount / 100).toFixed(2)} available.`
      );
    }

    // Check for pending payout
    const pendingPayouts = await ctx.db
      .query("vendorPayouts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    const hasPending = pendingPayouts.some(
      (p) => p.status === "PENDING" || p.status === "APPROVED" || p.status === "PROCESSING"
    );

    if (hasPending) {
      throw new Error("You already have a pending payout request");
    }

    const now = Date.now();
    const payoutNumber = generatePayoutNumber();

    // Create payout
    const payoutId = await ctx.db.insert("vendorPayouts", {
      vendorId: args.vendorId,
      payoutNumber,
      totalAmount,
      earningsCount: availableEarnings.length,
      status: "PENDING",
      payoutMethod: args.payoutMethod,
      createdAt: now,
      updatedAt: now,
    });

    // Mark earnings as processing
    for (const earning of availableEarnings) {
      await ctx.db.patch(earning._id, {
        status: "PROCESSING",
        payoutId,
        updatedAt: now,
      });
    }

    return payoutId;
  },
});

// Approve payout (admin)
export const approve = mutation({
  args: {
    id: v.id("vendorPayouts"),
    approvedBy: v.id("users"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Payout not found");

    if (payout.status !== "PENDING") {
      throw new Error("Can only approve pending payouts");
    }

    const now = Date.now();
    return await ctx.db.patch(args.id, {
      status: "APPROVED",
      approvedBy: args.approvedBy,
      approvedAt: now,
      adminNotes: args.adminNotes,
      updatedAt: now,
    });
  },
});

// Reject payout (admin)
export const reject = mutation({
  args: {
    id: v.id("vendorPayouts"),
    processedBy: v.id("users"),
    adminNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Payout not found");

    if (payout.status !== "PENDING" && payout.status !== "APPROVED") {
      throw new Error("Can only reject pending or approved payouts");
    }

    const now = Date.now();

    // Mark payout as failed
    await ctx.db.patch(args.id, {
      status: "FAILED",
      processedBy: args.processedBy,
      adminNotes: args.adminNotes,
      updatedAt: now,
    });

    // Revert earnings back to available
    const earnings = await ctx.db
      .query("vendorEarnings")
      .filter((q) => q.eq(q.field("payoutId"), args.id))
      .collect();

    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        status: "AVAILABLE",
        payoutId: undefined,
        updatedAt: now,
      });
    }

    return args.id;
  },
});

// Process payout - mark as completed (admin)
export const process = mutation({
  args: {
    id: v.id("vendorPayouts"),
    processedBy: v.id("users"),
    paymentReference: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Payout not found");

    if (payout.status !== "APPROVED") {
      throw new Error("Can only process approved payouts");
    }

    const now = Date.now();

    // Mark payout as completed
    await ctx.db.patch(args.id, {
      status: "COMPLETED",
      processedBy: args.processedBy,
      paymentReference: args.paymentReference,
      paymentDate: now,
      adminNotes: args.adminNotes || payout.adminNotes,
      updatedAt: now,
    });

    // Mark earnings as paid
    const earnings = await ctx.db
      .query("vendorEarnings")
      .filter((q) => q.eq(q.field("payoutId"), args.id))
      .collect();

    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        status: "PAID",
        updatedAt: now,
      });
    }

    // Update vendor totalPaidOut
    const vendor = await ctx.db.get(payout.vendorId);
    if (vendor) {
      await ctx.db.patch(payout.vendorId, {
        totalPaidOut: (vendor.totalPaidOut || 0) + payout.totalAmount,
        updatedAt: now,
      });
    }

    return args.id;
  },
});

// Mark payout as failed (admin)
export const markFailed = mutation({
  args: {
    id: v.id("vendorPayouts"),
    processedBy: v.id("users"),
    adminNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Payout not found");

    if (payout.status === "COMPLETED") {
      throw new Error("Cannot fail a completed payout");
    }

    const now = Date.now();

    // Mark payout as failed
    await ctx.db.patch(args.id, {
      status: "FAILED",
      processedBy: args.processedBy,
      adminNotes: args.adminNotes,
      updatedAt: now,
    });

    // Revert earnings back to available
    const earnings = await ctx.db
      .query("vendorEarnings")
      .filter((q) => q.eq(q.field("payoutId"), args.id))
      .collect();

    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        status: "AVAILABLE",
        payoutId: undefined,
        updatedAt: now,
      });
    }

    return args.id;
  },
});

// Get payout summary stats (for admin dashboard)
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const payouts = await ctx.db.query("vendorPayouts").collect();

    const stats = {
      totalPayouts: payouts.length,
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      completedCount: 0,
      completedAmount: 0,
      failedCount: 0,
    };

    for (const payout of payouts) {
      switch (payout.status) {
        case "PENDING":
          stats.pendingCount++;
          stats.pendingAmount += payout.totalAmount;
          break;
        case "APPROVED":
        case "PROCESSING":
          stats.approvedCount++;
          stats.approvedAmount += payout.totalAmount;
          break;
        case "COMPLETED":
          stats.completedCount++;
          stats.completedAmount += payout.totalAmount;
          break;
        case "FAILED":
          stats.failedCount++;
          break;
      }
    }

    return stats;
  },
});
