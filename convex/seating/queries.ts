import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireEventOwnership } from "../lib/auth";

/**
 * Get seating chart for an event (organizer only)
 */
export const getEventSeatingChart = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication
    await requireEventOwnership(ctx, args.eventId);

    const seatingChart = await ctx.db
      .query("seatingCharts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    return seatingChart;
  },
});

/**
 * Get public seating chart for an event (for customers)
 */
export const getPublicSeatingChart = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const seatingChart = await ctx.db
      .query("seatingCharts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!seatingChart) return null;

    // Get all reserved seats
    const reservations = await ctx.db
      .query("seatReservations")
      .withIndex("by_seating_chart", (q) => q.eq("seatingChartId", seatingChart._id))
      .filter((q) => q.eq(q.field("status"), "RESERVED"))
      .collect();

    // Build a map of reserved seats
    const reservedSeatsMap = new Set<string>();
    for (const reservation of reservations) {
      const key = `${reservation.sectionId}-${reservation.rowId}-${reservation.seatId}`;
      reservedSeatsMap.add(key);
    }

    // Update seat statuses based on reservations
    const updatedSections = seatingChart.sections.map((section) => ({
      ...section,
      tables: section.tables,
      rows: section.rows?.map((row) => ({
        ...row,
        seats: row.seats.map((seat) => {
          const key = `${section.id}-${row.id}-${seat.id}`;
          return {
            ...seat,
            status: reservedSeatsMap.has(key) ? ("RESERVED" as const) : seat.status,
          };
        }),
      })),
    }));

    return {
      ...seatingChart,
      sections: updatedSections,
    };
  },
});

/**
 * Get seat reservations for a ticket
 */
export const getTicketSeats = query({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const reservations = await ctx.db
      .query("seatReservations")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .filter((q) => q.eq(q.field("status"), "RESERVED"))
      .collect();

    return reservations;
  },
});

/**
 * Get all seat reservations for an event (organizer only)
 */
export const getEventSeatReservations = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication and event ownership
    await requireEventOwnership(ctx, args.eventId);

    const reservations = await ctx.db
      .query("seatReservations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get ticket details for each reservation
    const reservationsWithDetails = await Promise.all(
      reservations.map(async (reservation) => {
        const ticket = await ctx.db.get(reservation.ticketId);
        return {
          ...reservation,
          ticket,
        };
      })
    );

    return reservationsWithDetails;
  },
});

/**
 * Get table assignments for an event (organizer only)
 * Groups seat reservations by table for easy viewing
 */
export const getEventTableAssignments = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication and event ownership
    await requireEventOwnership(ctx, args.eventId);

    // Get seating chart
    const seatingChart = await ctx.db
      .query("seatingCharts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!seatingChart) {
      return null;
    }

    // Get all seat reservations
    const reservations = await ctx.db
      .query("seatReservations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "RESERVED"))
      .collect();

    // Get ticket details for each reservation
    const reservationsWithDetails = await Promise.all(
      reservations.map(async (reservation) => {
        const ticket = await ctx.db.get(reservation.ticketId);
        return {
          ...reservation,
          attendeeName: ticket?.attendeeName,
          attendeeEmail: ticket?.attendeeEmail,
          ticketCode: ticket?.ticketCode,
        };
      })
    );

    // Group by section and table/row
    const grouped: {
      sectionId: string;
      sectionName: string;
      tables?: {
        tableId: string;
        tableNumber: string | number;
        seats: typeof reservationsWithDetails;
      }[];
      rows?: {
        rowId: string;
        rowLabel: string;
        seats: typeof reservationsWithDetails;
      }[];
    }[] = [];

    // Extract section info from seating chart
    const sectionMap = new Map<string, { name: string; color?: string }>();
    seatingChart.sections.forEach((section) => {
      sectionMap.set(section.id, { name: section.name, color: section.color });
    });

    // Group reservations
    for (const reservation of reservationsWithDetails) {
      const sectionInfo = sectionMap.get(reservation.sectionId);
      let section = grouped.find((s) => s.sectionId === reservation.sectionId);

      if (!section) {
        section = {
          sectionId: reservation.sectionId,
          sectionName: sectionInfo?.name || "Unknown Section",
          tables: [],
          rows: [],
        };
        grouped.push(section);
      }

      if (reservation.tableId) {
        // Table-based seat
        let table = section.tables?.find((t) => t.tableId === reservation.tableId);
        if (!table) {
          table = {
            tableId: reservation.tableId,
            tableNumber: reservation.tableNumber || "Unknown",
            seats: [],
          };
          section.tables?.push(table);
        }
        table.seats.push(reservation);
      } else if (reservation.rowId) {
        // Row-based seat
        let row = section.rows?.find((r) => r.rowId === reservation.rowId);
        if (!row) {
          row = {
            rowId: reservation.rowId,
            rowLabel: reservation.rowLabel || "Unknown",
            seats: [],
          };
          section.rows?.push(row);
        }
        row.seats.push(reservation);
      }
    }

    return {
      seatingChart,
      sections: grouped,
      totalAssignedSeats: reservations.length,
    };
  },
});
