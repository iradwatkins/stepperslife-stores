import { v } from "convex/values";
import { query } from "../_generated/server";

// Get organizer event statistics
export const getOrganizerEventStats = query({
  args: { organizerId: v.id("users") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    const totalEvents = events.length;
    const publishedEvents = events.filter((e) => e.status === "PUBLISHED").length;
    const draftEvents = events.filter((e) => e.status === "DRAFT").length;

    return {
      totalEvents,
      publishedEvents,
      draftEvents,
    };
  },
});

// Get organizer revenue statistics
export const getOrganizerRevenueStats = query({
  args: { organizerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all events by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    const eventIds = events.map((e) => e._id);

    // Get all orders for these events
    let totalRevenue = 0;
    let revenueByEvent: Record<string, number> = {};

    for (const eventId of eventIds) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) =>
          q.or(q.eq(q.field("status"), "COMPLETED"), q.eq(q.field("status"), "PENDING_PAYMENT"))
        )
        .collect();

      const eventRevenue = orders.reduce((sum, order) => sum + (order.totalCents || 0), 0);
      totalRevenue += eventRevenue;

      const event = events.find((e) => e._id === eventId);
      if (event) {
        revenueByEvent[event.name] = eventRevenue;
      }
    }

    return {
      totalRevenue,
      totalRevenueFormatted: `$${(totalRevenue / 100).toFixed(2)}`,
      revenueByEvent,
    };
  },
});

// Get organizer ticket statistics
export const getOrganizerTicketStats = query({
  args: { organizerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all events by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    const eventIds = events.map((e) => e._id);

    // Get all tickets for these events
    let totalTicketsSold = 0;
    let ticketsByEvent: Record<string, number> = {};

    for (const eventId of eventIds) {
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) =>
          q.or(q.eq(q.field("status"), "VALID"), q.eq(q.field("status"), "SCANNED"))
        )
        .collect();

      const eventTickets = tickets.length;
      totalTicketsSold += eventTickets;

      const event = events.find((e) => e._id === eventId);
      if (event) {
        ticketsByEvent[event.name] = eventTickets;
      }
    }

    return {
      totalTicketsSold,
      ticketsByEvent,
    };
  },
});

// Get organizer attendee statistics
export const getOrganizerAttendeeStats = query({
  args: { organizerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all events by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    const eventIds = events.map((e) => e._id);

    // Count unique attendees
    let totalAttendees = 0;
    let attendeesByEvent: Record<string, number> = {};

    for (const eventId of eventIds) {
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("status"), "SCANNED"))
        .collect();

      const eventAttendees = tickets.length;
      totalAttendees += eventAttendees;

      const event = events.find((e) => e._id === eventId);
      if (event) {
        attendeesByEvent[event.name] = eventAttendees;
      }
    }

    return {
      totalAttendees,
      attendeesByEvent,
    };
  },
});

// Get revenue over time (for charts)
export const getRevenueOverTime = query({
  args: { organizerId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysToFetch = args.days || 30;
    const startDate = Date.now() - daysToFetch * 24 * 60 * 60 * 1000;

    // Get all events by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    const eventIds = events.map((e) => e._id);

    // Get orders in the time period
    const dataPoints: { date: string; revenue: number }[] = [];
    const revenueByDate: Record<string, number> = {};

    for (const eventId of eventIds) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) =>
          q.and(
            q.gte(q.field("createdAt"), startDate),
            q.or(q.eq(q.field("status"), "CONFIRMED"), q.eq(q.field("status"), "COMPLETED"))
          )
        )
        .collect();

      for (const order of orders) {
        const date = new Date(order.createdAt).toISOString().split("T")[0];
        revenueByDate[date] = (revenueByDate[date] || 0) + (order.totalCents || 0);
      }
    }

    // Convert to array sorted by date
    const sortedDates = Object.keys(revenueByDate).sort();
    for (const date of sortedDates) {
      dataPoints.push({ date, revenue: revenueByDate[date] / 100 }); // Convert to dollars
    }

    return dataPoints;
  },
});

// Get ticket sales over time (for charts)
export const getTicketSalesOverTime = query({
  args: { organizerId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysToFetch = args.days || 30;
    const startDate = Date.now() - daysToFetch * 24 * 60 * 60 * 1000;

    // Get all events by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    const eventIds = events.map((e) => e._id);

    // Get tickets in the time period
    const salesByDate: Record<string, number> = {};

    for (const eventId of eventIds) {
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) => q.gte(q.field("createdAt"), startDate))
        .collect();

      for (const ticket of tickets) {
        const date = new Date(ticket.createdAt).toISOString().split("T")[0];
        salesByDate[date] = (salesByDate[date] || 0) + 1;
      }
    }

    // Convert to array sorted by date
    const dataPoints: { date: string; tickets: number }[] = [];
    const sortedDates = Object.keys(salesByDate).sort();
    for (const date of sortedDates) {
      dataPoints.push({ date, tickets: salesByDate[date] });
    }

    return dataPoints;
  },
});

// Get event performance breakdown
export const getEventPerformanceBreakdown = query({
  args: { organizerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all events by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    const performance = [];

    for (const event of events) {
      // Get orders for this event
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .filter((q) =>
          q.or(q.eq(q.field("status"), "COMPLETED"), q.eq(q.field("status"), "PENDING_PAYMENT"))
        )
        .collect();

      // Get tickets for this event
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();

      const revenue = orders.reduce((sum, order) => sum + (order.totalCents || 0), 0);
      const ticketsSold = tickets.filter(
        (t) => t.status === "VALID" || t.status === "SCANNED"
      ).length;
      const attendees = tickets.filter((t) => t.status === "SCANNED").length;

      performance.push({
        eventId: event._id,
        eventName: event.name,
        status: event.status,
        revenue: revenue / 100, // Convert to dollars
        ticketsSold,
        attendees,
        startDate: event.startDate,
      });
    }

    // Sort by revenue descending
    performance.sort((a, b) => b.revenue - a.revenue);

    return performance;
  },
});
