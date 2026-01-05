import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser, requireEventOwnership } from "../lib/auth";

/**
 * Self-hosted Convex backend URL.
 * IMPORTANT: This is hardcoded because Convex functions run in an isolated runtime
 * where Next.js environment variables are NOT available.
 */
const CONVEX_BACKEND_URL = "https://convex.toolboxhosting.com";

/**
 * Helper to resolve storage URLs to full absolute URLs.
 * Self-hosted Convex returns relative paths like /api/storage/...
 * This ensures we always return a full URL that browsers can access.
 */
function resolveStorageUrl(url: string | null): string | undefined {
  if (!url) return undefined;

  // If it's already an absolute URL (http:// or https://), return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // If it's a relative storage path, prepend the Convex backend URL
  if (url.startsWith("/api/storage/")) {
    return `${CONVEX_BACKEND_URL}${url}`;
  }

  // For other relative paths, prepend anyway
  if (url.startsWith("/")) {
    return `${CONVEX_BACKEND_URL}${url}`;
  }

  return url;
}

/**
 * Get event by ID
 */
export const getEventById = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    return event;
  },
});

/**
 * Get payment configuration for an event
 */
export const getPaymentConfig = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    return config;
  },
});

/**
 * Get organizer's events
 * Get events for the current organizer
 *
 * SECURITY: Filters events by user ownership and role.
 * - Admins see all events (including classes)
 * - Organizers see only their own NON-CLASS events
 * - Instructors should use getOrganizerClasses instead
 * - Returns empty array if user not found or wrong role
 */
export const getOrganizerEvents = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Return empty array if no userId provided
    if (!args.userId) {
      return [];
    }

    // Get user from database (frontend passes authenticated user's ID)
    const user = await ctx.db.get(args.userId);

    if (!user) {
      console.error("[getOrganizerEvents] User not found:", args.userId);
      return [];
    }

    // Instructors should not see events - they use getOrganizerClasses
    if (user.role === "instructor") {
      return [];
    }

    // Admins see all events, organizers see only their events
    let events;
    if (user.role === "admin") {
      events = await ctx.db.query("events").order("desc").collect();
    } else {
      // Filter events by organizerId for non-admin users
      events = await ctx.db
        .query("events")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .order("desc")
        .collect();

      // ROLE-BASED FILTERING: Organizers should NOT see CLASS events
      // Classes are managed by instructors through /instructor routes
      events = events.filter((e) => e.eventType !== "CLASS");
    }


    // Convert storage IDs to URLs for images and add inline stats
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        // Resolve existing imageUrl (may be relative path from self-hosted Convex)
        let imageUrl = resolveStorageUrl(event.imageUrl ?? null);

        // If images array exists and has items, get URL for first image
        if (event.images && event.images.length > 0) {
          try {
            const url = await ctx.storage.getUrl(event.images[0]);
            if (url) {
              imageUrl = resolveStorageUrl(url);
            }
          } catch (error) {
            console.error("[getOrganizerEvents] Error getting image URL:", error);
          }
        }

        // Get inline stats: tickets sold, capacity, revenue
        let ticketsSold = event.ticketsSold || 0;
        let capacity = 0;
        let revenue = 0;

        try {
          // Get ticket tiers for capacity
          const tiers = await ctx.db
            .query("ticketTiers")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect();

          capacity = tiers.reduce((sum, tier) => sum + (tier.quantity || 0), 0);
          // Use tier.sold as more accurate than event.ticketsSold
          ticketsSold = tiers.reduce((sum, tier) => sum + (tier.sold || 0), 0);

          // Get completed orders for revenue
          const orders = await ctx.db
            .query("orders")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .filter((q) => q.eq(q.field("status"), "COMPLETED"))
            .collect();

          revenue = orders.reduce((sum, order) => sum + (order.totalCents || 0), 0);
        } catch (error) {
          // Stats are optional, don't fail if we can't get them
          console.error("[getOrganizerEvents] Error getting stats:", error);
        }

        return {
          ...event,
          imageUrl,
          ticketsSold,
          capacity,
          revenue,
        };
      })
    );

    return eventsWithStats;
  },
});

/**
 * Get ticket tiers for an event
 */
export const getEventTicketTiers = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return tiers;
  },
});

/**
 * Get event statistics (sales, revenue, attendees)
 */
export const getEventStatistics = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this event
    await requireEventOwnership(ctx, args.eventId);

    // Get all orders for this event
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get all tickets for this event
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get ticket tiers
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Calculate statistics
    const completedOrders = orders.filter((o) => o.status === "COMPLETED");
    const pendingOrders = orders.filter((o) => o.status === "PENDING");
    const totalOrders = orders.length;

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalCents, 0);
    const totalTicketsSold = tiers.reduce((sum, tier) => sum + tier.sold, 0);
    const totalTicketsAvailable = tiers.reduce((sum, tier) => sum + tier.quantity, 0);
    const totalAttendees = tickets.length;

    // Recent orders (last 5)
    const recentOrders = completedOrders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

    // Sales by tier
    const salesByTier = tiers.map((tier) => ({
      tierId: tier._id,
      name: tier.name,
      sold: tier.sold,
      quantity: tier.quantity,
      revenue: tier.sold * tier.price,
      percentageSold: tier.quantity > 0 ? (tier.sold / tier.quantity) * 100 : 0,
    }));

    return {
      totalRevenue,
      totalOrders,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length,
      totalTicketsSold,
      totalTicketsAvailable,
      totalAttendees,
      percentageSold:
        totalTicketsAvailable > 0 ? (totalTicketsSold / totalTicketsAvailable) * 100 : 0,
      recentOrders,
      salesByTier,
    };
  },
});

/**
 * Get all orders for an event
 */
export const getEventOrders = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this event
    await requireEventOwnership(ctx, args.eventId);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    // Enrich orders with ticket count
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        return {
          ...order,
          ticketCount: orderItems.length,
          tickets: tickets.length,
        };
      })
    );

    return enrichedOrders;
  },
});

/**
 * Get all attendees for an event
 */
export const getEventAttendees = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this event
    await requireEventOwnership(ctx, args.eventId);

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Enrich with tier information
    const enrichedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;

        const order = ticket.orderId ? await ctx.db.get(ticket.orderId) : null;

        return {
          ...ticket,
          tierName: tier?.name || "General Admission",
          orderNumber: order?._id || "",
          purchaseDate: ticket.createdAt,
        };
      })
    );

    return enrichedTickets;
  },
});

/**
 * Get events available for claiming
 * Returns events that are marked as claimable and don't have an organizer yet
 */
export const getClaimableEvents = query({
  args: {},
  handler: async (ctx) => {
    // Find all events that are claimable and have no organizer
    const claimableEvents = await ctx.db
      .query("events")
      .withIndex("by_claimable", (q) => q.eq("isClaimable", true))
      .filter((q) => q.eq(q.field("organizerId"), undefined))
      .order("desc")
      .collect();

    // Convert storage IDs to URLs for images
    const eventsWithImageUrls = await Promise.all(
      claimableEvents.map(async (event) => {
        // Resolve existing imageUrl (may be relative path from self-hosted Convex)
        let imageUrl = resolveStorageUrl(event.imageUrl ?? null);

        // If images array exists and has items, get URL for first image
        if (event.images && event.images.length > 0) {
          try {
            const url = await ctx.storage.getUrl(event.images[0]);
            if (url) {
              imageUrl = resolveStorageUrl(url);
            }
          } catch (error) {
            console.error("[getClaimableEvents] Error getting image URL:", error);
          }
        }

        return {
          ...event,
          imageUrl,
        };
      })
    );

    return eventsWithImageUrls;
  },
});

/**
 * Search events available for claiming
 * Returns empty array if no search term provided (keeps UI clean)
 */
export const searchClaimableEvents = query({
  args: {
    searchTerm: v.optional(v.string()),
    category: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // If no search term and no filters, return empty array
    if (!args.searchTerm && !args.category && !args.dateFrom && !args.dateTo) {
      return [];
    }

    // Find all events that are claimable and have no organizer
    let claimableEvents = await ctx.db
      .query("events")
      .withIndex("by_claimable", (q) => q.eq("isClaimable", true))
      .filter((q) => q.eq(q.field("organizerId"), undefined))
      .order("desc")
      .collect();

    // Apply search term filter
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      claimableEvents = claimableEvents.filter((event) => {
        const locationString =
          typeof event.location === "string"
            ? event.location
            : event.location?.venueName || event.location?.city || "";

        return (
          event.name.toLowerCase().includes(searchLower) ||
          (event.description?.toLowerCase().includes(searchLower) ?? false) ||
          (locationString?.toLowerCase().includes(searchLower) ?? false)
        );
      });
    }

    // Apply category filter
    if (args.category) {
      claimableEvents = claimableEvents.filter((event) =>
        event.categories?.includes(args.category as string)
      );
    }

    // Apply date range filter
    if (args.dateFrom || args.dateTo) {
      claimableEvents = claimableEvents.filter((event) => {
        if (!event.startDate) return false;
        if (args.dateFrom && event.startDate < args.dateFrom) return false;
        if (args.dateTo && event.startDate > args.dateTo) return false;
        return true;
      });
    }

    // Convert storage IDs to URLs for images
    const eventsWithImageUrls = await Promise.all(
      claimableEvents.map(async (event) => {
        // Resolve existing imageUrl (may be relative path from self-hosted Convex)
        let imageUrl = resolveStorageUrl(event.imageUrl ?? null);

        // If images array exists and has items, get URL for first image
        if (event.images && event.images.length > 0) {
          try {
            const url = await ctx.storage.getUrl(event.images[0]);
            if (url) {
              imageUrl = resolveStorageUrl(url);
            }
          } catch (error) {
            console.error("[searchClaimableEvents] Error getting image URL:", error);
          }
        }

        return {
          ...event,
          imageUrl,
        };
      })
    );

    return eventsWithImageUrls;
  },
});

// =============================================================================
// CLASSES QUERIES - Instructor queries for class management
// =============================================================================

/**
 * Get instructor's classes (events with eventType: CLASS)
 *
 * SECURITY: Filters classes by user ownership and role.
 * - Admins see all classes
 * - Instructors see only their own classes
 * - Organizers should NOT use this - they use getOrganizerEvents
 * - Returns empty array if user not found or wrong role
 */
export const getOrganizerClasses = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Return empty array if no userId provided
    if (!args.userId) {
      return [];
    }

    // Get user from database
    const user = await ctx.db.get(args.userId);

    if (!user) {
      console.error("[getOrganizerClasses] User not found:", args.userId);
      return [];
    }

    // ROLE-BASED ACCESS CONTROL: Only instructors and admins can view classes
    // Organizers should use getOrganizerEvents for their events
    if (user.role !== "instructor" && user.role !== "admin") {
      return [];
    }

    // Admins see all classes, instructors see only their classes
    let classes;
    if (user.role === "admin") {
      const allEvents = await ctx.db.query("events").order("desc").collect();
      classes = allEvents.filter((e) => e.eventType === "CLASS");
    } else {
      // Filter events by organizerId for instructors
      const userEvents = await ctx.db
        .query("events")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .order("desc")
        .collect();
      classes = userEvents.filter((e) => e.eventType === "CLASS");
    }

    // Convert storage IDs to URLs and add enrollment stats
    const classesWithStats = await Promise.all(
      classes.map(async (classItem) => {
        // Resolve existing imageUrl (may be relative path from self-hosted Convex)
        let imageUrl = resolveStorageUrl(classItem.imageUrl ?? null);

        if (classItem.images && classItem.images.length > 0) {
          try {
            const url = await ctx.storage.getUrl(classItem.images[0]);
            if (url) {
              imageUrl = resolveStorageUrl(url);
            }
          } catch (error) {
            console.error("[getOrganizerClasses] Error getting image URL:", error);
          }
        }

        // Get enrollment stats
        let enrollmentCount = 0;
        let revenue = 0;
        let capacity = 0;

        try {
          // Get ticket tiers for capacity
          const tiers = await ctx.db
            .query("ticketTiers")
            .withIndex("by_event", (q) => q.eq("eventId", classItem._id))
            .collect();

          capacity = tiers.reduce((sum, tier) => sum + (tier.quantity || 0), 0);
          enrollmentCount = tiers.reduce((sum, tier) => sum + (tier.sold || 0), 0);

          // Get completed orders for revenue
          const orders = await ctx.db
            .query("orders")
            .withIndex("by_event", (q) => q.eq("eventId", classItem._id))
            .filter((q) => q.eq(q.field("status"), "COMPLETED"))
            .collect();

          revenue = orders.reduce((sum, order) => sum + (order.totalCents || 0), 0);
        } catch (error) {
          // Stats are optional, don't fail if we can't get them
          console.error("[getOrganizerClasses] Error getting stats:", error);
        }

        // Get series count if part of a series
        let totalInSeries = 1;
        if (classItem.seriesId) {
          try {
            const seriesClasses = await ctx.db
              .query("events")
              .withIndex("by_series", (q) => q.eq("seriesId", classItem.seriesId))
              .collect();
            totalInSeries = seriesClasses.length;
          } catch (error) {
            console.error("[getOrganizerClasses] Error getting series count:", error);
          }
        }

        return {
          ...classItem,
          imageUrl,
          enrollmentCount,
          revenue,
          capacity,
          totalInSeries,
        };
      })
    );

    return classesWithStats;
  },
});

/**
 * Get series information for a class
 * Returns count and list of all classes in the same series
 */
export const getSeriesInfo = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get the class
    const classItem = await ctx.db.get(args.eventId);
    if (!classItem) {
      return null;
    }

    // If not part of a series, return single class info
    if (!classItem.seriesId) {
      return {
        isSeries: false,
        seriesId: null,
        totalCount: 1,
        upcomingCount: 1,
        position: 1,
        classes: [
          {
            _id: classItem._id,
            name: classItem.name,
            startDate: classItem.startDate,
            status: classItem.status,
          },
        ],
      };
    }

    // Get all classes in the series
    const seriesClasses = await ctx.db
      .query("events")
      .withIndex("by_series", (q) => q.eq("seriesId", classItem.seriesId))
      .collect();

    // Sort by start date
    const sortedClasses = seriesClasses.sort(
      (a, b) => (a.startDate || 0) - (b.startDate || 0)
    );

    // Find position of current class in series
    const position = sortedClasses.findIndex((c) => c._id === args.eventId) + 1;

    // Count upcoming classes
    const now = Date.now();
    const upcomingCount = sortedClasses.filter(
      (c) => c.startDate && c.startDate > now
    ).length;

    return {
      isSeries: true,
      seriesId: classItem.seriesId,
      totalCount: sortedClasses.length,
      upcomingCount,
      position,
      classes: sortedClasses.map((c) => ({
        _id: c._id,
        name: c.name,
        startDate: c.startDate,
        status: c.status,
      })),
    };
  },
});
