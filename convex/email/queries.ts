import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get all failed emails (for admin review/resend)
 */
export const getFailedEmails = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailLog")
      .withIndex("by_status", (q) => q.eq("status", "FAILED"))
      .order("desc")
      .take(args.limit || 50);
  },
});

/**
 * Get email logs for a specific order
 */
export const getEmailLogByOrder = query({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailLog")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .collect();
  },
});

/**
 * Get recent email logs (for admin dashboard)
 */
export const getRecentEmailLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailLog")
      .withIndex("by_created_at")
      .order("desc")
      .take(args.limit || 100);
  },
});

/**
 * Get email log by ID
 */
export const getEmailLogById = query({
  args: {
    logId: v.id("emailLog"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.logId);
  },
});

/**
 * Get email logs by recipient type
 */
export const getEmailLogsByRecipientType = query({
  args: {
    recipientType: v.union(
      v.literal("CUSTOMER"),
      v.literal("VENDOR"),
      v.literal("STAFF")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailLog")
      .withIndex("by_recipient_type", (q) => q.eq("recipientType", args.recipientType))
      .order("desc")
      .take(args.limit || 50);
  },
});

/**
 * Get email logs by recipient email
 */
export const getEmailLogsByRecipientEmail = query({
  args: {
    email: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailLog")
      .withIndex("by_recipient_email", (q) => q.eq("recipientEmail", args.email))
      .order("desc")
      .take(args.limit || 50);
  },
});

/**
 * Get email statistics summary
 */
export const getEmailStats = query({
  args: {},
  handler: async (ctx) => {
    const allLogs = await ctx.db.query("emailLog").collect();

    const stats = {
      total: allLogs.length,
      sent: 0,
      failed: 0,
      pending: 0,
      resent: 0,
      byType: {
        CUSTOMER: 0,
        VENDOR: 0,
        STAFF: 0,
      },
    };

    for (const log of allLogs) {
      if (log.status === "SENT") stats.sent++;
      else if (log.status === "FAILED") stats.failed++;
      else if (log.status === "PENDING") stats.pending++;
      else if (log.status === "RESENT") stats.resent++;

      if (log.recipientType === "CUSTOMER") stats.byType.CUSTOMER++;
      else if (log.recipientType === "VENDOR") stats.byType.VENDOR++;
      else if (log.recipientType === "STAFF") stats.byType.STAFF++;
    }

    return stats;
  },
});
