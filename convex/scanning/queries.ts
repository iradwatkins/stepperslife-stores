import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get event scanning statistics
 * Shows total tickets, scanned, and remaining
 */
export const getEventScanStats = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get all tickets for this event
    const allTickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalTickets = allTickets.length;
    const scannedTickets = allTickets.filter((t) => t.status === "SCANNED").length;
    const validTickets = allTickets.filter((t) => t.status === "VALID").length;
    const pendingTickets = allTickets.filter((t) => t.status === "PENDING").length;
    const pendingActivationTickets = allTickets.filter((t) => t.status === "PENDING_ACTIVATION").length;
    const cancelledTickets = allTickets.filter((t) => t.status === "CANCELLED").length;
    const refundedTickets = allTickets.filter((t) => t.status === "REFUNDED").length;

    // Total active tickets (excluding cancelled/refunded)
    const activeTickets = scannedTickets + validTickets + pendingTickets + pendingActivationTickets;

    return {
      total: activeTickets,
      scanned: scannedTickets,
      valid: validTickets,
      remaining: validTickets, // Only VALID tickets can be scanned
      pending: pendingTickets,
      pendingActivation: pendingActivationTickets,
      cancelled: cancelledTickets,
      refunded: refundedTickets,
      percentageScanned: activeTickets > 0 ? Math.round((scannedTickets / activeTickets) * 100) : 0,
    };
  },
});

/**
 * Get recent scans for an event
 * Shows last 20 scanned tickets
 */
export const getRecentScans = query({
  args: {
    eventId: v.id("events"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get scanned tickets for this event
    const scannedTickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "SCANNED"))
      .order("desc")
      .take(limit);

    // Enrich with tier and staff information
    const enrichedScans = await Promise.all(
      scannedTickets.map(async (ticket) => {
        const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;
        const scannedBy = ticket.scannedBy ? await ctx.db.get(ticket.scannedBy) : null;
        const soldByStaff = ticket.soldByStaffId ? await ctx.db.get(ticket.soldByStaffId) : null;

        return {
          ticketCode: ticket.ticketCode,
          attendeeName: ticket.attendeeName || "Guest",
          tierName: tier?.name || "General Admission",
          scannedAt: ticket.scannedAt,
          scannedBy: scannedBy?.name || "Unknown",
          soldByStaffName: soldByStaff?.name,
          soldByStaffId: ticket.soldByStaffId,
          paymentMethod: ticket.paymentMethod,
        };
      })
    );

    return enrichedScans;
  },
});

/**
 * Check if current user is authorized staff for an event
 */
export const isAuthorizedScanner = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // PRODUCTION: Require authentication
    if (!identity?.email) {
      return {
        isAuthorized: false,
        role: null,
        name: null,
        error: "Authentication required",
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return {
        isAuthorized: false,
        role: null,
        name: null,
      };
    }

    // Check if user is admin
    if (user.role === "admin") {
      return {
        isAuthorized: true,
        role: "ADMIN",
        name: user.name || user.email,
      };
    }

    // Check if user is the event organizer
    const event = await ctx.db.get(args.eventId);
    if (event?.organizerId === user._id) {
      return {
        isAuthorized: true,
        role: "ORGANIZER",
        name: user.name || user.email,
      };
    }

    // Check if user is staff for this event
    const staffRecord = await ctx.db
      .query("eventStaff")
      .withIndex("by_staff_user", (q) => q.eq("staffUserId", user._id))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("eventId"), args.eventId),
            q.eq(q.field("eventId"), undefined) // Staff for all events
          ),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (staffRecord) {
      // Check if staff member is authorized to scan
      const canScan =
        staffRecord.role === "STAFF" ||
        (staffRecord.role === "TEAM_MEMBERS" && staffRecord.canScan === true) ||
        (staffRecord.role === "ASSOCIATES" && staffRecord.canScan === true);

      return {
        isAuthorized: canScan,
        role: staffRecord.role,
        name: staffRecord.name,
      };
    }

    return {
      isAuthorized: false,
      role: null,
      name: null,
    };
  },
});

/**
 * Get all events that current user can scan for
 */
export const getMyScannableEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // PRODUCTION: Require authentication
    if (!identity?.email) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    const eventIds: Set<string> = new Set();

    // If admin, can scan all events
    if (user.role === "admin") {
      const allEvents = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
        .collect();
      allEvents.forEach((e) => eventIds.add(e._id));
    } else {
      // Get events where user is organizer
      const organizedEvents = await ctx.db
        .query("events")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
        .collect();
      organizedEvents.forEach((e) => eventIds.add(e._id));

      // Get events where user is staff with scanning permission
      const staffRecords = await ctx.db
        .query("eventStaff")
        .withIndex("by_staff_user", (q) => q.eq("staffUserId", user._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      for (const staff of staffRecords) {
        // Only include events where staff can scan
        const canScan =
          staff.role === "STAFF" ||
          (staff.role === "TEAM_MEMBERS" && staff.canScan === true) ||
          (staff.role === "ASSOCIATES" && staff.canScan === true);

        if (canScan) {
          if (staff.eventId) {
            eventIds.add(staff.eventId);
          } else {
            // Staff for all events under this organizer
            const organizerEvents = await ctx.db
              .query("events")
              .withIndex("by_organizer", (q) => q.eq("organizerId", staff.organizerId))
              .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
              .collect();
            organizerEvents.forEach((e) => eventIds.add(e._id));
          }
        }
      }
    }

    // Get full event details
    const events = await Promise.all(
      Array.from(eventIds).map(async (eventId) => {
        const event: any = await ctx.db.get(eventId as any);
        if (!event || !("name" in event)) return null;

        return {
          _id: event._id,
          name: event.name,
          startDate: event.startDate,
          location: event.location,
          imageUrl: event.imageUrl,
        };
      })
    );

    return events
      .filter((e) => e !== null)
      .sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate - b.startDate;
      });
  },
});

/**
 * Search for a specific ticket by ticket code
 * Returns ticket details including scan status
 */
export const searchTicketByCode = query({
  args: {
    ticketCode: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("tickets")
      .filter((q) => q.eq(q.field("ticketCode"), args.ticketCode.toUpperCase()))
      .first();

    if (!ticket) {
      return null;
    }

    // Get related data
    const event = await ctx.db.get(ticket.eventId);
    const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;
    const scannedByUser = ticket.scannedBy ? await ctx.db.get(ticket.scannedBy) : null;

    return {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      attendeeName: ticket.attendeeName || "Guest",
      attendeeEmail: ticket.attendeeEmail,
      eventName: event?.name || "Unknown Event",
      eventId: ticket.eventId,
      tierName: tier?.name || "General Admission",
      scannedAt: ticket.scannedAt,
      scannedBy: scannedByUser?.name || null,
      isScanned: ticket.status === "SCANNED",
      isValid: ticket.status === "VALID",
      purchasedAt: ticket._creationTime,
    };
  },
});

/**
 * Get scan history for the current staff member
 * Shows scans performed BY this user (not scans at their events)
 */
export const getMyScannedTickets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const limit = args.limit || 50;

    if (!identity) {
      return {
        todayScans: 0,
        totalScans: 0,
        recentScans: [],
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return {
        todayScans: 0,
        totalScans: 0,
        recentScans: [],
      };
    }

    // Get all tickets scanned by this user
    const scannedTickets = await ctx.db
      .query("tickets")
      .filter((q) => q.eq(q.field("scannedBy"), user._id))
      .collect();

    // Calculate today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const todayScans = scannedTickets.filter(
      (t) => t.scannedAt && t.scannedAt >= todayStart && t.scannedAt < todayEnd
    ).length;

    const totalScans = scannedTickets.length;

    // Get recent scans with enriched data
    const recentTickets = scannedTickets
      .filter((t) => t.scannedAt)
      .sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0))
      .slice(0, limit);

    const recentScans = await Promise.all(
      recentTickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);
        const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;

        return {
          ticketId: ticket._id,
          ticketCode: ticket.ticketCode,
          attendeeName: ticket.attendeeName || "Guest",
          eventName: event?.name || "Unknown Event",
          eventId: ticket.eventId,
          tierName: tier?.name || "General Admission",
          scannedAt: ticket.scannedAt,
        };
      })
    );

    return {
      todayScans,
      totalScans,
      recentScans,
    };
  },
});

/**
 * Get events happening TODAY that current user can scan for
 * Used for homepage quick access and FAB badge count
 */
export const getTodaysScannableEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    // Calculate today's date range (midnight to midnight in local time)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000; // 24 hours later

    const eventIds: Set<string> = new Set();

    // If admin, can scan all events
    if (user.role === "admin") {
      const allEvents = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
        .collect();
      allEvents
        .filter((e) => e.startDate && e.startDate >= todayStart && e.startDate < todayEnd)
        .forEach((e) => eventIds.add(e._id));
    } else {
      // Get events where user is organizer
      const organizedEvents = await ctx.db
        .query("events")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
        .collect();
      organizedEvents
        .filter((e) => e.startDate && e.startDate >= todayStart && e.startDate < todayEnd)
        .forEach((e) => eventIds.add(e._id));

      // Get events where user is staff with scanning permission
      const staffRecords = await ctx.db
        .query("eventStaff")
        .withIndex("by_staff_user", (q) => q.eq("staffUserId", user._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      for (const staff of staffRecords) {
        const canScan =
          staff.role === "STAFF" ||
          (staff.role === "TEAM_MEMBERS" && staff.canScan === true) ||
          (staff.role === "ASSOCIATES" && staff.canScan === true);

        if (canScan) {
          if (staff.eventId) {
            // Check if this specific event is today
            const event = await ctx.db.get(staff.eventId);
            if (event && event.startDate && event.startDate >= todayStart && event.startDate < todayEnd && event.status === "PUBLISHED") {
              eventIds.add(staff.eventId);
            }
          } else {
            // Staff for all events under this organizer - get today's events
            const organizerEvents = await ctx.db
              .query("events")
              .withIndex("by_organizer", (q) => q.eq("organizerId", staff.organizerId))
              .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
              .collect();
            organizerEvents
              .filter((e) => e.startDate && e.startDate >= todayStart && e.startDate < todayEnd)
              .forEach((e) => eventIds.add(e._id));
          }
        }
      }
    }

    // Get full event details
    const events = await Promise.all(
      Array.from(eventIds).map(async (eventId) => {
        const event: any = await ctx.db.get(eventId as any);
        if (!event || !("name" in event)) return null;

        return {
          _id: event._id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          venue: event.venue,
          imageUrl: event.imageUrl,
          slug: event.slug,
        };
      })
    );

    return events
      .filter((e) => e !== null)
      .sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate - b.startDate;
      });
  },
});
