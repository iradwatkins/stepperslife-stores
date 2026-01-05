import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Create a test ticket for scanner testing
 * Creates a VALID ticket that can be scanned
 */
export const createTestTicket = mutation({
  args: {
    eventId: v.id("events"),
    attendeeName: v.optional(v.string()),
    attendeeEmail: v.optional(v.string()),
    tierName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get first ticket tier for this event (or create a placeholder)
    let ticketTierId = undefined;
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (tiers) {
      ticketTierId = tiers._id;
    }

    // Generate unique ticket code
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const ticketCode = `TKT-TEST-${randomPart}`;

    // Create the test ticket
    const ticketId = await ctx.db.insert("tickets", {
      eventId: args.eventId,
      ticketTierId,
      ticketCode,
      status: "VALID",
      attendeeName: args.attendeeName || "Scanner Test User",
      attendeeEmail: args.attendeeEmail || "test@stepperslife.com",
      paymentMethod: "TEST",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      ticketId,
      ticketCode,
      eventName: event.name,
      tierName: tiers?.name || args.tierName || "General Admission",
      message: `Test ticket created! Scan code: ${ticketCode}`,
    };
  },
});

/**
 * Scan and check-in a ticket
 * Used by staff scanners at event door
 */
export const scanTicket = mutation({
  args: {
    ticketCode: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for ticket scanning
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please log in to scan tickets.");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      throw new Error("User account not found. Please contact support.");
    }

    // Find the ticket
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_ticket_code", (q) => q.eq("ticketCode", args.ticketCode))
      .first();

    if (!ticket) {
      return {
        success: false,
        error: "TICKET_NOT_FOUND",
        message: "Ticket not found. Please check the code.",
      };
    }

    // Verify ticket is for this event
    if (ticket.eventId !== args.eventId) {
      return {
        success: false,
        error: "WRONG_EVENT",
        message: "This ticket is for a different event.",
      };
    }

    // Check ticket status
    if (ticket.status === "SCANNED") {
      return {
        success: false,
        error: "ALREADY_SCANNED",
        message: "This ticket has already been scanned.",
        ticket: {
          ticketCode: ticket.ticketCode,
          scannedAt: ticket.scannedAt,
          attendeeName: ticket.attendeeName,
        },
      };
    }

    if (ticket.status === "CANCELLED") {
      return {
        success: false,
        error: "CANCELLED",
        message: "This ticket has been cancelled.",
      };
    }

    if (ticket.status === "REFUNDED") {
      return {
        success: false,
        error: "REFUNDED",
        message: "This ticket has been refunded.",
      };
    }

    if (ticket.status === "PENDING") {
      return {
        success: false,
        error: "PENDING_PAYMENT",
        message: "This ticket is pending payment approval. Cannot scan until activated.",
      };
    }

    if (ticket.status === "PENDING_ACTIVATION") {
      return {
        success: false,
        error: "PENDING_ACTIVATION",
        message: "This ticket requires activation. Customer must enter activation code first.",
      };
    }

    // Only VALID tickets can be scanned
    if (ticket.status !== "VALID") {
      return {
        success: false,
        error: "INVALID_STATUS",
        message: `This ticket has status "${ticket.status}" and cannot be scanned.`,
      };
    }

    // Get ticket tier for display
    const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;

    // Mark ticket as scanned
    await ctx.db.patch(ticket._id, {
      status: "SCANNED",
      scannedAt: Date.now(),
      scannedBy: currentUser._id,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Ticket scanned successfully! Welcome!",
      ticket: {
        ticketCode: ticket.ticketCode,
        attendeeName: ticket.attendeeName || "Guest",
        attendeeEmail: ticket.attendeeEmail,
        tierName: tier?.name || "General Admission",
        scannedAt: Date.now(),
      },
    };
  },
});

/**
 * Manually mark a ticket as valid (undo scan)
 * For staff to fix mistakes
 */
export const unScanTicket = mutation({
  args: {
    ticketCode: v.string(),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for ticket management
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Staff must be signed in to manage tickets.");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      throw new Error("User account not found. Please contact support.");
    }

    // Find the ticket
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_ticket_code", (q) => q.eq("ticketCode", args.ticketCode))
      .first();

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Mark ticket as valid again
    await ctx.db.patch(ticket._id, {
      status: "VALID",
      scannedAt: undefined,
      scannedBy: undefined,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Ticket unmarked. Status changed back to VALID.",
    };
  },
});
