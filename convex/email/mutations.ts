import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new email log entry
 */
export const createEmailLog = mutation({
  args: {
    orderNumber: v.string(),
    orderId: v.optional(v.id("productOrders")),
    recipientType: v.union(
      v.literal("CUSTOMER"),
      v.literal("VENDOR"),
      v.literal("STAFF")
    ),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    subject: v.string(),
    templateType: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("SENT"),
      v.literal("FAILED")
    ),
    messageId: v.optional(v.string()),
    attempts: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("emailLog", {
      ...args,
      lastAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update email log status after send attempt
 */
export const updateEmailLogStatus = mutation({
  args: {
    logId: v.id("emailLog"),
    status: v.union(
      v.literal("SENT"),
      v.literal("FAILED"),
      v.literal("RESENT")
    ),
    messageId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    attempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { logId, ...updateData } = args;
    const now = Date.now();

    // Build update object, excluding undefined values
    const update: Record<string, unknown> = {
      lastAttemptAt: now,
      updatedAt: now,
    };

    if (updateData.status !== undefined) update.status = updateData.status;
    if (updateData.messageId !== undefined) update.messageId = updateData.messageId;
    if (updateData.errorMessage !== undefined) update.errorMessage = updateData.errorMessage;
    if (updateData.attempts !== undefined) update.attempts = updateData.attempts;

    await ctx.db.patch(logId, update);
    return { success: true };
  },
});

/**
 * Mark an email as resent
 */
export const markAsResent = mutation({
  args: {
    logId: v.id("emailLog"),
    resentBy: v.id("users"),
    resentMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.logId, {
      status: "RESENT",
      resentAt: now,
      resentBy: args.resentBy,
      resentMessageId: args.resentMessageId,
      updatedAt: now,
    });
    return { success: true };
  },
});

/**
 * Batch create email logs for an order
 */
export const createBatchEmailLogs = mutation({
  args: {
    logs: v.array(
      v.object({
        orderNumber: v.string(),
        orderId: v.optional(v.id("productOrders")),
        recipientType: v.union(
          v.literal("CUSTOMER"),
          v.literal("VENDOR"),
          v.literal("STAFF")
        ),
        recipientEmail: v.string(),
        recipientName: v.optional(v.string()),
        subject: v.string(),
        templateType: v.string(),
        status: v.union(
          v.literal("PENDING"),
          v.literal("SENT"),
          v.literal("FAILED")
        ),
        messageId: v.optional(v.string()),
        attempts: v.number(),
        errorMessage: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const logIds: string[] = [];

    for (const log of args.logs) {
      const logId = await ctx.db.insert("emailLog", {
        ...log,
        lastAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      });
      logIds.push(logId);
    }

    return { success: true, logIds };
  },
});
