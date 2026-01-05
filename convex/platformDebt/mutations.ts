/**
 * Platform Debt Mutations
 *
 * Mutations for managing organizer platform debt from cash payments
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Platform fee constants (should match src/lib/constants/payment.ts)
const PLATFORM_FEE_PERCENTAGE = 3.7;
const PLATFORM_FEE_FIXED_CENTS = 179; // $1.79

/**
 * Calculate platform fee for a given subtotal
 */
export function calculatePlatformFee(subtotalCents: number): number {
  return Math.round((subtotalCents * PLATFORM_FEE_PERCENTAGE) / 100) + PLATFORM_FEE_FIXED_CENTS;
}

/**
 * Add debt from a cash order (called when cash payment is approved)
 * Internal mutation - called from cashPayments.ts
 */
export const addCashOrderDebt = internalMutation({
  args: {
    organizerId: v.id("users"),
    orderId: v.id("orders"),
    eventId: v.id("events"),
    subtotalCents: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const platformFeeOwed = calculatePlatformFee(args.subtotalCents);

    // Get or create organizer's debt record
    let debtRecord = await ctx.db
      .query("organizerPlatformDebt")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    let newBalance: number;

    if (debtRecord) {
      // Update existing record
      newBalance = debtRecord.remainingDebtCents + platformFeeOwed;
      await ctx.db.patch(debtRecord._id, {
        totalDebtCents: debtRecord.totalDebtCents + platformFeeOwed,
        remainingDebtCents: newBalance,
        lastCashOrderAt: now,
        updatedAt: now,
      });
    } else {
      // Create new record
      newBalance = platformFeeOwed;
      await ctx.db.insert("organizerPlatformDebt", {
        organizerId: args.organizerId,
        totalDebtCents: platformFeeOwed,
        totalSettledCents: 0,
        remainingDebtCents: platformFeeOwed,
        lastCashOrderAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create ledger entry
    await ctx.db.insert("platformDebtLedger", {
      organizerId: args.organizerId,
      transactionType: "CASH_ORDER_DEBT",
      orderId: args.orderId,
      eventId: args.eventId,
      amountCents: platformFeeOwed,
      balanceAfterCents: newBalance,
      description: `Platform fee from cash order (subtotal: $${(args.subtotalCents / 100).toFixed(2)})`,
      createdAt: now,
    });

    return {
      platformFeeOwed,
      newBalance,
    };
  },
});

/**
 * Record settlement from a digital payment
 * Called from webhook handlers when payment succeeds
 */
export const recordSettlement = mutation({
  args: {
    organizerId: v.string(), // Accept string for API routes
    orderId: v.string(),
    settlementAmountCents: v.number(),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const organizerId = args.organizerId as Id<"users">;
    const orderId = args.orderId as Id<"orders">;
    const eventId = args.eventId ? (args.eventId as Id<"events">) : undefined;

    // Get organizer's debt record
    const debtRecord = await ctx.db
      .query("organizerPlatformDebt")
      .withIndex("by_organizer", (q) => q.eq("organizerId", organizerId))
      .first();

    if (!debtRecord) {
      // No debt to settle - this shouldn't happen but handle gracefully
      console.warn(`[PlatformDebt] No debt record found for organizer ${organizerId}`);
      return { settled: 0, remaining: 0 };
    }

    // Calculate new balance
    const newBalance = Math.max(0, debtRecord.remainingDebtCents - args.settlementAmountCents);

    // Update debt record
    await ctx.db.patch(debtRecord._id, {
      totalSettledCents: debtRecord.totalSettledCents + args.settlementAmountCents,
      remainingDebtCents: newBalance,
      lastSettlementAt: now,
      updatedAt: now,
    });

    // Create ledger entry
    await ctx.db.insert("platformDebtLedger", {
      organizerId,
      transactionType: "DIGITAL_SETTLEMENT",
      orderId,
      eventId,
      amountCents: args.settlementAmountCents,
      balanceAfterCents: newBalance,
      description: `Settlement from digital payment`,
      createdAt: now,
    });

    // Update the order with the settlement amount
    await ctx.db.patch(orderId, {
      debtSettlementCents: args.settlementAmountCents,
    });

    return {
      settled: args.settlementAmountCents,
      remaining: newBalance,
    };
  },
});

/**
 * Record manual payment from organizer (admin action)
 */
export const recordManualPayment = mutation({
  args: {
    organizerId: v.id("users"),
    amountCents: v.number(),
    notes: v.optional(v.string()),
    processedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get organizer's debt record
    const debtRecord = await ctx.db
      .query("organizerPlatformDebt")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!debtRecord) {
      throw new Error("No debt record found for this organizer");
    }

    if (args.amountCents > debtRecord.remainingDebtCents) {
      throw new Error(
        `Payment amount ($${(args.amountCents / 100).toFixed(2)}) exceeds remaining debt ($${(debtRecord.remainingDebtCents / 100).toFixed(2)})`
      );
    }

    // Calculate new balance
    const newBalance = debtRecord.remainingDebtCents - args.amountCents;

    // Update debt record
    await ctx.db.patch(debtRecord._id, {
      totalSettledCents: debtRecord.totalSettledCents + args.amountCents,
      remainingDebtCents: newBalance,
      lastSettlementAt: now,
      updatedAt: now,
    });

    // Create ledger entry
    await ctx.db.insert("platformDebtLedger", {
      organizerId: args.organizerId,
      transactionType: "MANUAL_PAYMENT",
      amountCents: args.amountCents,
      balanceAfterCents: newBalance,
      description: `Manual payment received`,
      notes: args.notes,
      processedBy: args.processedBy,
      createdAt: now,
    });

    return {
      settled: args.amountCents,
      remaining: newBalance,
    };
  },
});

/**
 * Admin adjustment (for corrections)
 */
export const adminAdjustment = mutation({
  args: {
    organizerId: v.id("users"),
    adjustmentCents: v.number(), // Positive = increase debt, Negative = decrease debt
    notes: v.string(),
    processedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get or create organizer's debt record
    let debtRecord = await ctx.db
      .query("organizerPlatformDebt")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    let newBalance: number;

    if (debtRecord) {
      newBalance = Math.max(0, debtRecord.remainingDebtCents + args.adjustmentCents);

      await ctx.db.patch(debtRecord._id, {
        totalDebtCents:
          args.adjustmentCents > 0
            ? debtRecord.totalDebtCents + args.adjustmentCents
            : debtRecord.totalDebtCents,
        totalSettledCents:
          args.adjustmentCents < 0
            ? debtRecord.totalSettledCents - args.adjustmentCents
            : debtRecord.totalSettledCents,
        remainingDebtCents: newBalance,
        updatedAt: now,
      });
    } else if (args.adjustmentCents > 0) {
      // Create new record only if adding debt
      newBalance = args.adjustmentCents;
      await ctx.db.insert("organizerPlatformDebt", {
        organizerId: args.organizerId,
        totalDebtCents: args.adjustmentCents,
        totalSettledCents: 0,
        remainingDebtCents: args.adjustmentCents,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      throw new Error("Cannot reduce debt for organizer with no debt record");
    }

    // Create ledger entry
    await ctx.db.insert("platformDebtLedger", {
      organizerId: args.organizerId,
      transactionType: "ADJUSTMENT",
      amountCents: Math.abs(args.adjustmentCents),
      balanceAfterCents: newBalance,
      description: args.adjustmentCents > 0 ? "Debt increased (admin)" : "Debt decreased (admin)",
      notes: args.notes,
      processedBy: args.processedBy,
      createdAt: now,
    });

    return {
      adjustment: args.adjustmentCents,
      newBalance,
    };
  },
});
