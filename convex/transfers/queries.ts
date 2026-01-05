import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all transfers initiated by current user
 */
export const getMyInitiatedTransfers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    const transfers = await ctx.db
      .query("ticketTransfers")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", user._id))
      .collect();

    // Get ticket and event details for each transfer
    const transfersWithDetails = await Promise.all(
      transfers.map(async (transfer) => {
        const ticket = await ctx.db.get(transfer.ticketId);
        const event = await ctx.db.get(transfer.eventId);

        return {
          ...transfer,
          ticket,
          event,
        };
      })
    );

    return transfersWithDetails.sort((a, b) => b.initiatedAt - a.initiatedAt);
  },
});

/**
 * Get pending transfers for current user (tickets transferred to them)
 */
export const getMyPendingTransfers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    const transfers = await ctx.db
      .query("ticketTransfers")
      .withIndex("by_to_email", (q) => q.eq("toEmail", user.email.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    // Filter out expired transfers
    const now = Date.now();
    const validTransfers = transfers.filter((t) => t.expiresAt > now);

    // Get ticket and event details for each transfer
    const transfersWithDetails = await Promise.all(
      validTransfers.map(async (transfer) => {
        const ticket = await ctx.db.get(transfer.ticketId);
        const event = await ctx.db.get(transfer.eventId);

        return {
          ...transfer,
          ticket,
          event,
        };
      })
    );

    return transfersWithDetails.sort((a, b) => b.initiatedAt - a.initiatedAt);
  },
});

/**
 * Get transfer by token (for public transfer acceptance page)
 */
export const getTransferByToken = query({
  args: {
    transferToken: v.string(),
  },
  handler: async (ctx, args) => {
    const transfer = await ctx.db
      .query("ticketTransfers")
      .withIndex("by_token", (q) => q.eq("transferToken", args.transferToken))
      .first();

    if (!transfer) return null;

    // Get ticket and event details
    const ticket = await ctx.db.get(transfer.ticketId);
    const event = await ctx.db.get(transfer.eventId);

    return {
      ...transfer,
      ticket,
      event,
    };
  },
});

/**
 * Get transfer history for a specific ticket
 */
export const getTicketTransferHistory = query({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Verify user owns the ticket or is an organizer
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const event = await ctx.db.get(ticket.eventId);
    if (!event) throw new Error("Event not found");

    const isOwner = ticket.attendeeId === user._id;
    const isOrganizer = event.organizerId === user._id;

    if (!isOwner && !isOrganizer) {
      throw new Error("Not authorized to view transfer history");
    }

    const transfers = await ctx.db
      .query("ticketTransfers")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    return transfers.sort((a, b) => b.initiatedAt - a.initiatedAt);
  },
});
