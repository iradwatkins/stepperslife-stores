import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireEventOwnership } from "../lib/auth";

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
 * Get all tickets for the currently authenticated user with enriched details.
 * Used for "My Tickets" page showing purchased tickets.
 *
 * @returns Array of tickets with:
 *   - Event details (name, date, location, image)
 *   - Tier information (name, price)
 *   - Order details (total, payment date)
 *   - Seat information (section, row, seat number) if reserved seating
 *
 * @throws Error if user is not authenticated
 *
 * @example
 * const myTickets = useQuery(api.tickets.queries.getMyTickets)
 */
export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    // Check authentication - return empty array if not logged in
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return [];
    }

    // Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return [];
    }

    // Get all tickets for this user
    const tickets = await ctx.db
      .query("tickets")
      .filter((q) => q.eq(q.field("attendeeId"), user._id))
      .collect();

    // Enrich tickets with event, tier, order, and seat details
    const enrichedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);
        const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;
        const order = ticket.orderId ? await ctx.db.get(ticket.orderId) : null;

        // Get image URL if exists
        let imageUrl = resolveStorageUrl(event?.imageUrl ?? null);
        if (!imageUrl && event?.images && event.images.length > 0) {
          const url = await ctx.storage.getUrl(event.images[0]);
          imageUrl = resolveStorageUrl(url);
        }

        // Get seat reservation if exists
        const seatReservation = await ctx.db
          .query("seatReservations")
          .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
          .filter((q) => q.eq(q.field("status"), "RESERVED"))
          .first();

        // Get section and row names from seating chart
        let seatInfo = null;
        if (seatReservation) {
          const seatingChart = await ctx.db.get(seatReservation.seatingChartId);
          if (seatingChart) {
            const section = seatingChart.sections.find(
              (s: any) => s.id === seatReservation.sectionId
            );
            if (section) {
              const row = section.rows?.find((r: any) => r.id === seatReservation.rowId);
              seatInfo = {
                sectionName: section.name,
                rowLabel: row?.label || "",
                seatNumber: seatReservation.seatNumber,
              };
            }
          }
        }

        return {
          _id: ticket._id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          scannedAt: ticket.scannedAt,
          createdAt: ticket.createdAt,
          eventId: ticket.eventId,
          attendeeEmail: ticket.attendeeEmail,
          attendeeName: ticket.attendeeName,
          bundleId: ticket.bundleId,
          bundleName: ticket.bundleName,
          event: event
            ? {
                _id: event._id,
                name: event.name,
                startDate: event.startDate,
                endDate: event.endDate,
                location: event.location,
                imageUrl,
                eventType: event.eventType,
              }
            : null,
          tier: tier
            ? {
                name: tier.name,
                price: tier.price,
              }
            : null,
          order: order
            ? {
                _id: order._id,
                totalCents: order.totalCents,
                paidAt: order.paidAt,
              }
            : null,
          seat: seatInfo,
        };
      })
    );

    // Sort by creation date (newest first)
    return enrichedTickets.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get ticket by order number (for magic link access)
 */
export const getTicketByOrderNumber = query({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Function temporarily disabled - orderNumber field doesn't exist in schema
    return null;
  },
});

/**
 * Get single ticket instance (for QR code display)
 */
export const getTicketInstance = query({
  args: {
    ticketNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("ticketInstances")
      .withIndex("by_ticket_number", (q) => q.eq("ticketNumber", args.ticketNumber))
      .first();

    if (!ticket) return null;

    // Return ticket - enrichment temporarily disabled due to schema mismatch
    return ticket;
  },
});

/**
 * Get upcoming events for user (events with tickets not yet scanned)
 */
export const getMyUpcomingEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    // Get completed orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "COMPLETED"))
      .collect();

    // Get unique events
    const eventIds = [...new Set(orders.map((o) => o.eventId))];
    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        const event = await ctx.db.get(eventId);
        if (!event) return null;

        // Only return upcoming events
        if (event.startDate && event.startDate < Date.now()) return null;

        // Get user's actual tickets for this event (not orders)
        const userTickets = await ctx.db
          .query("tickets")
          .withIndex("by_attendee", (q) => q.eq("attendeeId", user._id))
          .filter((q) => q.eq(q.field("eventId"), eventId))
          .collect();

        const totalTickets = userTickets.length;

        return {
          ...event,
          totalTickets,
        };
      })
    );

    return events.filter((e) => e !== null);
  },
});

/**
 * Get past events for user
 */
export const getMyPastEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "COMPLETED"))
      .collect();

    const eventIds = [...new Set(orders.map((o) => o.eventId))];
    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        const event = await ctx.db.get(eventId);
        if (!event) return null;

        // Only return past events
        if (!event.startDate || event.startDate >= Date.now()) return null;

        // Get user's actual tickets for this event (not orders)
        const userTickets = await ctx.db
          .query("tickets")
          .withIndex("by_attendee", (q) => q.eq("attendeeId", user._id))
          .filter((q) => q.eq(q.field("eventId"), eventId))
          .collect();

        const totalTickets = userTickets.length;

        return {
          ...event,
          totalTickets,
        };
      })
    );

    return events.filter((e) => e !== null);
  },
});

/**
 * Get order details (for confirmation page)
 */
export const getOrderDetails = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const event = await ctx.db.get(order.eventId);

    // Get all tickets for this order
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Enrich tickets with tier information
    const enrichedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;
        return {
          code: ticket.ticketCode,
          tierName: tier?.name || "General Admission",
          status: ticket.status,
        };
      })
    );

    return {
      order,
      event,
      tickets: enrichedTickets,
    };
  },
});

/**
 * Get ticket details by ticket code for QR code scanning and validation.
 * Used by staff/organizers at event check-in.
 *
 * @param ticketCode - The unique ticket code (from QR scan or manual entry)
 *
 * @returns Object with ticket, event, tier, order, attendee, and seat info
 * @returns null if ticket not found
 *
 * @example
 * // Staff check-in page
 * const ticketInfo = useQuery(api.tickets.queries.getTicketByCode, { ticketCode: scannedCode })
 * if (ticketInfo?.ticket.status === 'USED') showAlreadyScannedError()
 */
export const getTicketByCode = query({
  args: {
    ticketCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Find ticket by code
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_ticket_code", (q) => q.eq("ticketCode", args.ticketCode))
      .first();

    if (!ticket) return null;

    // Get event details
    const event = await ctx.db.get(ticket.eventId);
    if (!event) return null;

    // Get tier details
    const tier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;

    // Get order details
    const order = ticket.orderId ? await ctx.db.get(ticket.orderId) : null;

    // Get attendee details
    const attendee = ticket.attendeeId ? await ctx.db.get(ticket.attendeeId) : null;

    // Get image URL
    let imageUrl = resolveStorageUrl(event.imageUrl ?? null);
    if (!imageUrl && event.images && event.images.length > 0) {
      const url = await ctx.storage.getUrl(event.images[0]);
      imageUrl = resolveStorageUrl(url);
    }

    // Get seat reservation if exists
    const seatReservation = await ctx.db
      .query("seatReservations")
      .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
      .filter((q) => q.eq(q.field("status"), "RESERVED"))
      .first();

    // Get section and row names from seating chart
    let seatInfo = null;
    if (seatReservation) {
      const seatingChart = await ctx.db.get(seatReservation.seatingChartId);
      if (seatingChart) {
        const section = seatingChart.sections.find((s: any) => s.id === seatReservation.sectionId);
        if (section) {
          const row = section.rows?.find((r: any) => r.id === seatReservation.rowId);
          seatInfo = {
            sectionName: section.name,
            rowLabel: row?.label || "",
            seatNumber: seatReservation.seatNumber,
          };
        }
      }
    }

    return {
      ticket: {
        _id: ticket._id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        createdAt: ticket.createdAt,
        scannedAt: ticket.scannedAt,
      },
      event: {
        _id: event._id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        imageUrl,
        eventType: event.eventType,
      },
      tier: tier
        ? {
            name: tier.name,
            price: tier.price,
            description: tier.description,
          }
        : null,
      order: order
        ? {
            _id: order._id,
            totalCents: order.totalCents,
            paidAt: order.paidAt,
          }
        : null,
      attendee: attendee
        ? {
            name: attendee.name,
            email: attendee.email,
          }
        : null,
      seat: seatInfo,
    };
  },
});

/**
 * Get the current active price for a ticket tier based on pricing tiers.
 * Handles early bird, regular, and late pricing automatically.
 *
 * @param tierId - The ticket tier ID
 *
 * @returns Object with:
 *   - currentPrice: Active price in dollars
 *   - tierName: Name of current pricing tier (e.g., "Early Bird")
 *   - nextPriceChange: Timestamp when price changes
 *   - nextPrice: What the price will change to
 *   - savings: How much buyer saves by purchasing now
 *
 * @throws Error if ticket tier not found
 *
 * @example
 * const pricing = useQuery(api.tickets.queries.getCurrentPrice, { tierId })
 * // Show: "Early Bird: $50 (Save $25, price increases in 3 days)"
 */
export const getCurrentPrice = query({
  args: {
    tierId: v.id("ticketTiers"),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    const now = Date.now();

    // If no pricing tiers, return base price
    if (!tier.pricingTiers || tier.pricingTiers.length === 0) {
      return {
        currentPrice: tier.price,
        tierName: null,
        nextPriceChange: null,
        nextPrice: null,
        nextTierName: null,
      };
    }

    // Find current active pricing tier
    let currentTier = null;
    let nextTier = null;

    // Sort pricing tiers by availableFrom (earliest first)
    const sortedTiers = [...tier.pricingTiers].sort((a, b) => a.availableFrom - b.availableFrom);

    for (let i = 0; i < sortedTiers.length; i++) {
      const pricingTier = sortedTiers[i];
      const nextPricingTier = i < sortedTiers.length - 1 ? sortedTiers[i + 1] : null;

      // Check if current time is within this tier's range
      const isAfterStart = now >= pricingTier.availableFrom;
      const isBeforeEnd = !pricingTier.availableUntil || now < pricingTier.availableUntil;

      if (isAfterStart && isBeforeEnd) {
        currentTier = pricingTier;
        nextTier = nextPricingTier;
        break;
      }
    }

    // If no current tier found (before first tier starts), use first tier
    if (!currentTier) {
      currentTier = sortedTiers[0];
      nextTier = sortedTiers.length > 1 ? sortedTiers[1] : null;
    }

    return {
      currentPrice: currentTier.price,
      tierName: currentTier.name,
      nextPriceChange: currentTier.availableUntil || nextTier?.availableFrom || null,
      nextPrice: nextTier?.price || null,
      nextTierName: nextTier?.name || null,
      savings: nextTier ? nextTier.price - currentTier.price : 0, // How much saved by buying now
    };
  },
});

/**
 * Get pricing information for all tiers of an event
 * Useful for displaying on event detail pages
 */
export const getEventPricingInfo = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();

    // Get current pricing for each tier (inline logic to avoid nested query call)
    const tiersWithPricing = tiers.map((tier) => {
      // If no pricing tiers, use base price
      if (!tier.pricingTiers || tier.pricingTiers.length === 0) {
        return {
          ...tier,
          pricingInfo: {
            currentPrice: tier.price,
            tierName: null,
            nextPriceChange: null,
            nextPrice: null,
            nextTierName: null,
            savings: 0,
          },
        };
      }

      // Find current active pricing tier
      const sortedTiers = [...tier.pricingTiers].sort((a, b) => a.availableFrom - b.availableFrom);

      let currentTier = null;
      let nextTier = null;

      for (let i = 0; i < sortedTiers.length; i++) {
        const pricingTier = sortedTiers[i];
        const nextPricingTier = i < sortedTiers.length - 1 ? sortedTiers[i + 1] : null;

        const isAfterStart = now >= pricingTier.availableFrom;
        const isBeforeEnd = !pricingTier.availableUntil || now < pricingTier.availableUntil;

        if (isAfterStart && isBeforeEnd) {
          currentTier = pricingTier;
          nextTier = nextPricingTier;
          break;
        }
      }

      // If no current tier found, use first tier
      if (!currentTier) {
        currentTier = sortedTiers[0];
        nextTier = sortedTiers.length > 1 ? sortedTiers[1] : null;
      }

      return {
        ...tier,
        pricingInfo: {
          currentPrice: currentTier.price,
          tierName: currentTier.name,
          nextPriceChange: currentTier.availableUntil || nextTier?.availableFrom || null,
          nextPrice: nextTier?.price || null,
          nextTierName: nextTier?.name || null,
          savings: nextTier ? nextTier.price - currentTier.price : 0,
        },
      };
    });

    return tiersWithPricing;
  },
});

/**
 * Get a single ticket tier by ID
 */
export const getTicketTier = query({
  args: { tierId: v.id("ticketTiers") },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    return tier;
  },
});

/**
 * Get ticket tiers from multiple events (for multi-event bundle creation)
 */
export const getTiersFromMultipleEvents = query({
  args: {
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args) => {
    const tiersWithEventInfo: Array<{
      _id: string;
      name: string;
      price: number;
      quantity: number;
      sold: number;
      available: number;
      eventId: string;
      eventName: string;
    }> = [];

    // Fetch tiers for each event
    for (const eventId of args.eventIds) {
      const event = await ctx.db.get(eventId);
      if (!event) continue;

      const tiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Add event info to each tier
      tiers.forEach((tier) => {
        tiersWithEventInfo.push({
          _id: tier._id,
          name: tier.name,
          price: tier.price,
          quantity: tier.quantity,
          sold: tier.sold,
          available: tier.quantity - tier.sold,
          eventId: eventId,
          eventName: event.name,
        });
      });
    }

    return tiersWithEventInfo;
  },
});

/**
 * Get all ticket tiers for an event (for organizer management)
 * Works with events in any status (DRAFT, PUBLISHED, etc.)
 */
export const getTicketsByEvent = query({
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
 * Get a single ticket tier for editing
 * Includes sold count and live status check
 */
export const getTicketTierForEdit = query({
  args: {
    tierId: v.id("ticketTiers"),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) return null;

    // Verify event ownership
    const event = await ctx.db.get(tier.eventId);
    if (!event) return null;

    // Verify user owns this event
    try {
      await requireEventOwnership(ctx, tier.eventId);
    } catch {
      return null; // Not authorized
    }

    // Calculate if event has started - tickets lock when event begins
    const now = Date.now();
    const eventHasStarted = event.startDate && now >= event.startDate;
    const canEdit = !eventHasStarted;

    // Calculate time until event starts
    let hoursUntilLock = null;
    if (event.startDate && !eventHasStarted) {
      hoursUntilLock = Math.ceil((event.startDate - now) / (60 * 60 * 1000));
    }

    return {
      ...tier,
      isLive: eventHasStarted,
      canEdit,
      hoursUntilLock,
      eventStartDate: event.startDate,
    };
  },
});
