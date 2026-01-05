import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { TRANSFER_STATUS, TRANSFER_CONFIG } from "../lib/roles";

/**
 * Request a ticket transfer from one staff member to another
 */
export const requestTransfer = mutation({
  args: {
    eventId: v.id("events"),
    toStaffId: v.id("eventStaff"),
    ticketQuantity: v.number(),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Get sender's staff record
    const fromStaff = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("staffUserId"), user._id))
      .first();

    if (!fromStaff) {
      throw new Error("You are not a staff member for this event");
    }

    // Get recipient's staff record
    const toStaff = await ctx.db.get(args.toStaffId);
    if (!toStaff) {
      throw new Error("Recipient staff member not found");
    }

    // Verify both staff are for the same event
    if (toStaff.eventId !== args.eventId) {
      throw new Error("Recipient is not a staff member for this event");
    }

    // Check if sender has enough allocated tickets
    const currentBalance = fromStaff.allocatedTickets || 0;
    if (currentBalance < args.ticketQuantity) {
      throw new Error(`Insufficient tickets. You have ${currentBalance} tickets available`);
    }

    // Check for pending transfers that would affect balance
    const pendingTransfersOut = await ctx.db
      .query("staffTicketTransfers")
      .withIndex("by_from_staff", (q) => q.eq("fromStaffId", fromStaff._id))
      .filter((q) => q.eq(q.field("status"), TRANSFER_STATUS.PENDING))
      .collect();

    const pendingOutAmount = pendingTransfersOut.reduce((sum, t) => sum + t.ticketQuantity, 0);
    const availableBalance = currentBalance - pendingOutAmount;

    if (availableBalance < args.ticketQuantity) {
      throw new Error(
        `Insufficient tickets after pending transfers. Available: ${availableBalance}`
      );
    }

    // Get recipient user details
    const toUser = await ctx.db.get(toStaff.staffUserId);
    if (!toUser) throw new Error("Recipient user not found");

    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Create transfer request
    const transferId = await ctx.db.insert("staffTicketTransfers", {
      // Parties
      fromStaffId: fromStaff._id,
      fromUserId: user._id,
      fromName: user.name || user.email,
      toStaffId: toStaff._id,
      toUserId: toStaff.staffUserId,
      toName: toUser.name || toUser.email,

      // Event
      eventId: args.eventId,
      organizerId: event.organizerId!,
      ticketQuantity: args.ticketQuantity,

      // Status
      status: TRANSFER_STATUS.PENDING,
      reason: args.reason,
      notes: args.notes,

      // Timestamps
      requestedAt: Date.now(),
      expiresAt: Date.now() + TRANSFER_CONFIG.EXPIRATION_MS, // 48 hours

      // Balance tracking
      fromStaffBalanceBefore: currentBalance,
      toStaffBalanceBefore: toStaff.allocatedTickets || 0,
    });


    return {
      success: true,
      transferId,
      message: `Transfer request sent to ${toUser.name || toUser.email}`,
    };
  },
});

/**
 * Accept a ticket transfer request
 */
export const acceptTransfer = mutation({
  args: {
    transferId: v.id("staffTicketTransfers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Get transfer request
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new Error("Transfer request not found");

    // Verify user is the recipient
    if (transfer.toUserId !== user._id) {
      throw new Error("You are not the recipient of this transfer");
    }

    // Check status
    if (transfer.status !== TRANSFER_STATUS.PENDING) {
      throw new Error(`Transfer is already ${transfer.status.toLowerCase()}`);
    }

    // Check expiry
    if (Date.now() > transfer.expiresAt) {
      // Mark as expired
      await ctx.db.patch(args.transferId, {
        status: TRANSFER_STATUS.AUTO_EXPIRED,
        respondedAt: Date.now(),
      });
      throw new Error("Transfer request has expired");
    }

    // Get staff records
    const fromStaff = await ctx.db.get(transfer.fromStaffId);
    const toStaff = await ctx.db.get(transfer.toStaffId);

    if (!fromStaff || !toStaff) {
      throw new Error("Staff records not found");
    }

    // Verify sender still has enough tickets
    const senderBalance = fromStaff.allocatedTickets || 0;
    if (senderBalance < transfer.ticketQuantity) {
      // Cancel the transfer
      await ctx.db.patch(args.transferId, {
        status: TRANSFER_STATUS.CANCELLED,
        respondedAt: Date.now(),
        rejectionReason: "Sender no longer has sufficient tickets",
      });
      throw new Error("Sender no longer has sufficient tickets");
    }

    // Perform the transfer atomically
    const newSenderBalance = senderBalance - transfer.ticketQuantity;
    const newRecipientBalance = (toStaff.allocatedTickets || 0) + transfer.ticketQuantity;

    // Update sender's balance
    await ctx.db.patch(fromStaff._id, {
      allocatedTickets: newSenderBalance,
      updatedAt: Date.now(),
    });

    // Update recipient's balance
    await ctx.db.patch(toStaff._id, {
      allocatedTickets: newRecipientBalance,
      updatedAt: Date.now(),
    });

    // Update transfer record
    await ctx.db.patch(args.transferId, {
      status: TRANSFER_STATUS.ACCEPTED,
      respondedAt: Date.now(),
      fromStaffBalanceAfter: newSenderBalance,
      toStaffBalanceAfter: newRecipientBalance,
    });


    return {
      success: true,
      ticketsReceived: transfer.ticketQuantity,
      newBalance: newRecipientBalance,
    };
  },
});

/**
 * Reject a ticket transfer request
 */
export const rejectTransfer = mutation({
  args: {
    transferId: v.id("staffTicketTransfers"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    // Get transfer request
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new Error("Transfer request not found");

    // Verify user is the recipient
    if (transfer.toUserId !== user._id) {
      throw new Error("You are not the recipient of this transfer");
    }

    // Check status
    if (transfer.status !== TRANSFER_STATUS.PENDING) {
      throw new Error(`Transfer is already ${transfer.status.toLowerCase()}`);
    }

    // Update transfer record
    await ctx.db.patch(args.transferId, {
      status: TRANSFER_STATUS.REJECTED,
      respondedAt: Date.now(),
      rejectionReason: args.reason,
    });


    return {
      success: true,
      message: "Transfer request rejected",
    };
  },
});

/**
 * Cancel a pending transfer request (by sender)
 */
export const cancelTransfer = mutation({
  args: {
    transferId: v.id("staffTicketTransfers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    // Get transfer request
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new Error("Transfer request not found");

    // Verify user is the sender
    if (transfer.fromUserId !== user._id) {
      throw new Error("You are not the sender of this transfer");
    }

    // Check status
    if (transfer.status !== TRANSFER_STATUS.PENDING) {
      throw new Error(`Cannot cancel - transfer is already ${transfer.status.toLowerCase()}`);
    }

    // Update transfer record
    await ctx.db.patch(args.transferId, {
      status: "CANCELLED",
      respondedAt: Date.now(),
    });


    return {
      success: true,
      message: "Transfer request cancelled",
    };
  },
});

/**
 * Get all transfer requests for the current user
 */
export const getMyTransfers = query({
  args: {
    eventId: v.optional(v.id("events")),
    type: v.optional(v.union(v.literal("sent"), v.literal("received"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return [];

    // Get user's staff records
    const staffRecords = await ctx.db
      .query("eventStaff")
      .withIndex("by_staff_user", (q) => q.eq("staffUserId", user._id))
      .collect();

    const staffIds = staffRecords.map((s) => s._id);

    let transfers: any[] = [];

    // Get sent transfers
    if (args.type !== "received") {
      for (const staffId of staffIds) {
        const sentTransfers = await ctx.db
          .query("staffTicketTransfers")
          .withIndex("by_from_staff", (q) => q.eq("fromStaffId", staffId))
          .collect();

        transfers.push(...sentTransfers.map((t) => ({ ...t, direction: "sent" })));
      }
    }

    // Get received transfers
    if (args.type !== "sent") {
      for (const staffId of staffIds) {
        const receivedTransfers = await ctx.db
          .query("staffTicketTransfers")
          .withIndex("by_to_staff", (q) => q.eq("toStaffId", staffId))
          .collect();

        transfers.push(...receivedTransfers.map((t) => ({ ...t, direction: "received" })));
      }
    }

    // Filter by event if specified
    if (args.eventId) {
      transfers = transfers.filter((t) => t.eventId === args.eventId);
    }

    // Get event details for each transfer
    const enrichedTransfers = await Promise.all(
      transfers.map(async (transfer) => {
        const event = await ctx.db.get(transfer.eventId);
        return {
          ...transfer,
          eventName: event && "name" in event ? event.name : "Unknown Event",
          eventDate: event && "startDate" in event ? event.startDate : undefined,
        };
      })
    );

    // Sort by most recent first
    return enrichedTransfers.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

/**
 * Get pending transfers that need action from the current user
 */
export const getPendingTransfers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { incoming: 0, outgoing: 0 };

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return { incoming: 0, outgoing: 0 };

    // Get user's staff records
    const staffRecords = await ctx.db
      .query("eventStaff")
      .withIndex("by_staff_user", (q) => q.eq("staffUserId", user._id))
      .collect();

    const staffIds = staffRecords.map((s) => s._id);

    let incomingCount = 0;
    let outgoingCount = 0;

    for (const staffId of staffIds) {
      // Count incoming pending transfers
      const incoming = await ctx.db
        .query("staffTicketTransfers")
        .withIndex("by_to_staff", (q) => q.eq("toStaffId", staffId))
        .filter((q) => q.eq(q.field("status"), TRANSFER_STATUS.PENDING))
        .collect();
      incomingCount += incoming.length;

      // Count outgoing pending transfers
      const outgoing = await ctx.db
        .query("staffTicketTransfers")
        .withIndex("by_from_staff", (q) => q.eq("fromStaffId", staffId))
        .filter((q) => q.eq(q.field("status"), TRANSFER_STATUS.PENDING))
        .collect();
      outgoingCount += outgoing.length;
    }

    return {
      incoming: incomingCount,
      outgoing: outgoingCount,
    };
  },
});

/**
 * Get available staff to transfer tickets to for a specific event
 */
export const getAvailableRecipients = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return [];

    // Get all staff for this event
    const allStaff = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter out the current user
    const otherStaff = allStaff.filter((s) => s.staffUserId !== user._id);

    // Get user details for each staff member
    const enrichedStaff = await Promise.all(
      otherStaff.map(async (staff) => {
        const staffUser = await ctx.db.get(staff.staffUserId);
        return {
          _id: staff._id,
          name: staff.name || staffUser?.name || staff.email,
          email: staff.email,
          role: staff.role,
          allocatedTickets: staff.allocatedTickets || 0,
          ticketsSold: staff.ticketsSold || 0,
        };
      })
    );

    // Sort by name
    return enrichedStaff.sort((a, b) => a.name.localeCompare(b.name));
  },
});
