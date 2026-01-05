import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Initiate a ticket transfer to a new owner
 */
export const initiateTransfer = mutation({
  args: {
    ticketId: v.id("tickets"),
    toEmail: v.string(),
    toName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Get ticket and verify ownership
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    if (ticket.attendeeId !== user._id) {
      throw new Error("You don't own this ticket");
    }

    if (ticket.status !== "VALID") {
      throw new Error("Only valid tickets can be transferred");
    }

    // Check if ticket has already been scanned
    if (ticket.scannedAt) {
      throw new Error("Scanned tickets cannot be transferred");
    }

    // Check if there's already a pending transfer for this ticket
    const existingTransfer = await ctx.db
      .query("ticketTransfers")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .first();

    if (existingTransfer) {
      throw new Error("This ticket already has a pending transfer");
    }

    // Generate secure transfer token
    const transferToken = `XFER-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Create transfer record
    const transferId = await ctx.db.insert("ticketTransfers", {
      ticketId: args.ticketId,
      eventId: ticket.eventId,
      fromUserId: user._id,
      fromEmail: user.email,
      fromName: user.name || "Unknown",
      toEmail: args.toEmail.toLowerCase(),
      toName: args.toName,
      status: "PENDING",
      transferToken,
      initiatedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { success: true, transferId, transferToken };
  },
});

/**
 * Accept a ticket transfer
 */
export const acceptTransfer = mutation({
  args: {
    transferToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Find transfer by token
    const transfer = await ctx.db
      .query("ticketTransfers")
      .withIndex("by_token", (q) => q.eq("transferToken", args.transferToken))
      .first();

    if (!transfer) throw new Error("Transfer not found");

    // Verify transfer is for this user
    if (transfer.toEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error("This transfer is not for you");
    }

    // Check transfer status
    if (transfer.status !== "PENDING") {
      throw new Error(`Transfer is ${transfer.status.toLowerCase()}`);
    }

    // Check if transfer has expired
    if (Date.now() > transfer.expiresAt) {
      await ctx.db.patch(transfer._id, {
        status: "EXPIRED",
      });
      throw new Error("This transfer has expired");
    }

    // Get ticket
    const ticket = await ctx.db.get(transfer.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    // Update ticket ownership
    await ctx.db.patch(transfer.ticketId, {
      attendeeId: user._id,
      attendeeEmail: user.email,
      attendeeName: user.name || transfer.toName,
      updatedAt: Date.now(),
    });

    // Complete transfer
    await ctx.db.patch(transfer._id, {
      status: "ACCEPTED",
      toUserId: user._id,
      completedAt: Date.now(),
    });

    return { success: true, ticketId: transfer.ticketId };
  },
});

/**
 * Cancel a pending transfer
 */
export const cancelTransfer = mutation({
  args: {
    transferId: v.id("ticketTransfers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Get transfer
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new Error("Transfer not found");

    // Verify user initiated this transfer
    if (transfer.fromUserId !== user._id) {
      throw new Error("You can only cancel transfers you initiated");
    }

    // Check if already completed
    if (transfer.status !== "PENDING") {
      throw new Error("Only pending transfers can be cancelled");
    }

    // Cancel transfer
    await ctx.db.patch(args.transferId, {
      status: "CANCELLED",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});
