import { v } from "convex/values";
import { query } from "../_generated/server";
import { EVENT_CATEGORIES } from "../../src/lib/constants";

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
 * Get filtered events with time-based quick filters (Tonight, This Weekend, This Month)
 * Story 3.5: "This Weekend" Quick Filter
 *
 * @param filter - Time-based filter: 'tonight' | 'weekend' | 'month' | 'all'
 * @param startTime - Start timestamp for the filter range (client calculates based on timezone)
 * @param endTime - End timestamp for the filter range (optional, null for 'all')
 * @param category - Optional category filter
 * @param searchTerm - Optional search term
 *
 * @returns Object with events array and counts for each filter type
 */
export const getFilteredEvents = query({
  args: {
    filter: v.optional(v.union(
      v.literal("tonight"),
      v.literal("weekend"),
      v.literal("month"),
      v.literal("all")
    )),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    category: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const filterType = args.filter || "all";

    // Get all published non-CLASS events
    const eventsQuery = ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .order("desc");

    let events = await eventsQuery.collect();
    events = events.filter((e) => e.eventType !== "CLASS");

    // Filter out past events
    events = events.filter((e) => {
      const eventDate = e.endDate || e.startDate;
      return eventDate && eventDate >= now;
    });

    // Apply time-based filter using client-provided timestamps
    if (filterType !== "all" && args.startTime) {
      events = events.filter((e) => {
        if (!e.startDate) return false;
        // Event should start after filter start
        if (e.startDate < args.startTime!) return false;
        // If endTime specified, event should start before filter end
        if (args.endTime && e.startDate > args.endTime) return false;
        return true;
      });
    }

    // Apply category filter
    if (args.category) {
      events = events.filter((e) => e.categories?.includes(args.category!));
    }

    // Apply search term
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.city &&
            e.location.city.toLowerCase().includes(searchLower))
      );
    }

    // Sort by date chronologically
    events.sort((a, b) => {
      const aDate = a.startDate || 0;
      const bDate = b.startDate || 0;
      return aDate - bDate;
    });

    // Calculate counts for all filter types (for badges)
    // We need the base set of events (before time filter) for counting
    let allUpcomingEvents = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .order("desc")
      .collect();

    allUpcomingEvents = allUpcomingEvents.filter((e) => {
      if (e.eventType === "CLASS") return false;
      const eventDate = e.endDate || e.startDate;
      return eventDate && eventDate >= now;
    });

    // Apply category filter to counts too
    if (args.category) {
      allUpcomingEvents = allUpcomingEvents.filter((e) => e.categories?.includes(args.category!));
    }

    // Apply search to counts too
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      allUpcomingEvents = allUpcomingEvents.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.city &&
            e.location.city.toLowerCase().includes(searchLower))
      );
    }

    // Counts are calculated on the client side to respect timezone
    // Server just returns total count of all upcoming events
    const counts = {
      all: allUpcomingEvents.length,
      // Client will calculate these based on timezone
      tonight: 0,
      weekend: 0,
      month: 0,
    };

    // Convert storage IDs to URLs for images and add hotel info
    const eventsWithImageUrls = await Promise.all(
      events.map(async (event) => {
        let imageUrl = resolveStorageUrl(event.imageUrl ?? null);

        if (!imageUrl && event.images && event.images.length > 0) {
          const url = await ctx.storage.getUrl(event.images[0]);
          imageUrl = resolveStorageUrl(url);
        }

        const hotelPackages = await ctx.db
          .query("hotelPackages")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        return {
          ...event,
          imageUrl,
          hasHotels: hotelPackages.length > 0,
          hotelCount: hotelPackages.length,
        };
      })
    );

    return {
      events: eventsWithImageUrls,
      counts,
      filter: filterType,
    };
  },
});

/**
 * Get event counts for quick filter badges
 * Story 3.5: Returns counts for Tonight, This Weekend, This Month, All
 *
 * Client passes timezone-aware timestamps for each filter range
 */
export const getEventFilterCounts = query({
  args: {
    tonightStart: v.number(),
    tonightEnd: v.number(),
    weekendStart: v.number(),
    weekendEnd: v.number(),
    monthEnd: v.number(),
    category: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all published non-CLASS events
    let events = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    events = events.filter((e) => {
      if (e.eventType === "CLASS") return false;
      const eventDate = e.endDate || e.startDate;
      return eventDate && eventDate >= now;
    });

    // Apply category filter
    if (args.category) {
      events = events.filter((e) => e.categories?.includes(args.category!));
    }

    // Apply search term
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.city &&
            e.location.city.toLowerCase().includes(searchLower))
      );
    }

    // Count events for each filter
    const counts = {
      tonight: events.filter((e) => {
        if (!e.startDate) return false;
        return e.startDate >= args.tonightStart && e.startDate <= args.tonightEnd;
      }).length,
      weekend: events.filter((e) => {
        if (!e.startDate) return false;
        return e.startDate >= args.weekendStart && e.startDate <= args.weekendEnd;
      }).length,
      month: events.filter((e) => {
        if (!e.startDate) return false;
        return e.startDate >= now && e.startDate <= args.monthEnd;
      }).length,
      all: events.length,
    };

    return counts;
  },
});

/**
 * Get all published events for the public homepage and browse pages.
 * Filters out CLASS type events (use getPublishedClasses for those).
 *
 * @param limit - Maximum number of events to return
 * @param category - Filter by event category (e.g., "Steppin", "Line Dancing")
 * @param searchTerm - Filter by name, description, or city
 * @param includePast - Include past events (default: false)
 *
 * @returns Array of events with image URLs resolved and hotel availability info
 *
 * @example
 * // Get next 10 upcoming Steppin events
 * useQuery(api.public.queries.getPublishedEvents, { limit: 10, category: "Steppin" })
 */
export const getPublishedEvents = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
    includePast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const eventsQuery = ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .order("desc");

    let events = await eventsQuery.collect();

    // Filter out CLASS events - classes have their own dedicated queries
    events = events.filter((e) => e.eventType !== "CLASS");

    // Filter out past events by default (unless includePast is true)
    if (!args.includePast) {
      events = events.filter((e) => {
        // Use endDate if available, otherwise use startDate
        const eventDate = e.endDate || e.startDate;
        return eventDate && eventDate >= now;
      });
    }

    // Filter by category if specified
    if (args.category) {
      events = events.filter((e) => e.categories?.includes(args.category!));
    }

    // Filter by search term if specified
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.city &&
            e.location.city.toLowerCase().includes(searchLower))
      );
    }

    // Sort by date in chronological order (oldest to newest)
    events.sort((a, b) => {
      const aDate = a.startDate || 0;
      const bDate = b.startDate || 0;
      return aDate - bDate; // Ascending order (oldest first)
    });

    // Limit results
    if (args.limit) {
      events = events.slice(0, args.limit);
    }

    // Convert storage IDs to URLs for images and add hotel info
    const eventsWithImageUrls = await Promise.all(
      events.map(async (event) => {
        // Resolve existing imageUrl (may be relative path from self-hosted Convex)
        let imageUrl = resolveStorageUrl(event.imageUrl ?? null);

        // If no imageUrl but has images array with storage IDs
        if (!imageUrl && event.images && event.images.length > 0) {
          const url = await ctx.storage.getUrl(event.images[0]);
          imageUrl = resolveStorageUrl(url);
        }

        // Check for hotel packages
        const hotelPackages = await ctx.db
          .query("hotelPackages")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        return {
          ...event,
          imageUrl,
          hasHotels: hotelPackages.length > 0,
          hotelCount: hotelPackages.length,
        };
      })
    );

    return eventsWithImageUrls;
  },
});

/**
 * Get upcoming published events for homepage featured section.
 * Returns events sorted by start date (soonest first).
 * Excludes CLASS type events - use getPublishedClasses for those.
 *
 * @param limit - Maximum number of events (default: 20)
 *
 * @returns Array of upcoming events sorted by start date
 */
export const getUpcomingEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_published", (q) => q.eq("status", "PUBLISHED"))
      .filter((q) => q.gte(q.field("startDate"), now))
      .order("asc")
      .take((args.limit || 20) * 2); // Fetch extra to account for filtered classes

    // Filter out CLASS events - classes have their own dedicated queries
    const events = allEvents.filter((e) => e.eventType !== "CLASS").slice(0, args.limit || 20);

    return events;
  },
});

/**
 * Get past published events (events that have already occurred)
 * Excludes CLASS type events - classes have their own dedicated queries
 */
export const getPastEvents = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const eventsQuery = ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .order("desc");

    let events = await eventsQuery.collect();

    // Filter out CLASS events - classes have their own dedicated queries
    events = events.filter((e) => e.eventType !== "CLASS");

    // Only show past events (where endDate or startDate < now)
    events = events.filter((e) => {
      const eventDate = e.endDate || e.startDate;
      return eventDate && eventDate < now;
    });

    // Filter by category if specified
    if (args.category) {
      events = events.filter((e) => e.categories?.includes(args.category!));
    }

    // Filter by search term if specified
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.city &&
            e.location.city.toLowerCase().includes(searchLower))
      );
    }

    // Sort by date in chronological order (oldest to newest)
    events.sort((a, b) => {
      const aDate = a.startDate || 0;
      const bDate = b.startDate || 0;
      return aDate - bDate; // Ascending order (oldest first)
    });

    // Limit results
    if (args.limit) {
      events = events.slice(0, args.limit);
    }

    // Convert storage IDs to URLs for images
    const eventsWithImageUrls = await Promise.all(
      events.map(async (event) => {
        // Resolve existing imageUrl (may be relative path from self-hosted Convex)
        let imageUrl = resolveStorageUrl(event.imageUrl ?? null);

        // If no imageUrl but has images array with storage IDs
        if (!imageUrl && event.images && event.images.length > 0) {
          const url = await ctx.storage.getUrl(event.images[0]);
          imageUrl = resolveStorageUrl(url);
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
 * Get complete public event details for the event detail page.
 * Includes ticket tiers with dynamic pricing, bundles, ticketing status,
 * and organizer information.
 *
 * @param eventId - The event ID to fetch
 *
 * @returns Full event details with:
 *   - Event data with resolved image URL
 *   - ticketTiers with current pricing (early bird, regular, etc.)
 *   - bundles with availability and savings calculations
 *   - ticketingStatus indicating availability, sold out, or why tickets are hidden
 *   - Organizer name and email
 *
 * @returns null if event not found or not published
 */
export const getPublicEventDetails = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);

    if (!event || event.status !== "PUBLISHED") {
      return null;
    }

    // Get payment config to check if tickets are visible
    const paymentConfig = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    // Get tickets if visible
    let tickets = null;
    if (event.ticketsVisible && paymentConfig?.isActive) {
      tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .filter((q) => q.eq(q.field("active"), true))
        .collect();
    }

    // Get ticket tiers if visible
    let ticketTiers = null;
    if (event.ticketsVisible && paymentConfig?.isActive) {
      const tiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Enrich tiers with current pricing information
      const now = Date.now();
      ticketTiers = tiers.map((tier) => {
        let currentPrice = tier.price;
        let currentTierName: string | undefined = undefined;
        let nextPriceChange: { date: number; price: number; tierName: string } | undefined =
          undefined;
        let isEarlyBird = false;

        // Calculate current price based on pricing tiers
        if (tier.pricingTiers && tier.pricingTiers.length > 0) {
          // Sort pricing tiers by date
          const sortedTiers = [...tier.pricingTiers].sort(
            (a, b) => a.availableFrom - b.availableFrom
          );

          // Find current active tier
          for (let i = 0; i < sortedTiers.length; i++) {
            const pricingTier = sortedTiers[i];
            const isActive =
              now >= pricingTier.availableFrom &&
              (!pricingTier.availableUntil || now <= pricingTier.availableUntil);

            if (isActive) {
              currentPrice = pricingTier.price;
              currentTierName = pricingTier.name;
              isEarlyBird = true;

              // Check for next price change
              if (pricingTier.availableUntil && i + 1 < sortedTiers.length) {
                const nextTier = sortedTiers[i + 1];
                nextPriceChange = {
                  date: nextTier.availableFrom,
                  price: nextTier.price,
                  tierName: nextTier.name,
                };
              }
              break;
            }
          }

          // If no active tier found, check if we're before first tier or after last tier
          if (currentTierName === undefined) {
            if (now < sortedTiers[0].availableFrom) {
              // Before first tier - use base price
              currentPrice = tier.price;
              nextPriceChange = {
                date: sortedTiers[0].availableFrom,
                price: sortedTiers[0].price,
                tierName: sortedTiers[0].name,
              };
            } else {
              // After all tiers - use last tier price or base price
              const lastTier = sortedTiers[sortedTiers.length - 1];
              if (!lastTier.availableUntil || now <= lastTier.availableUntil) {
                currentPrice = lastTier.price;
                currentTierName = lastTier.name;
                isEarlyBird = true;
              }
            }
          }
        }

        return {
          ...tier,
          currentPrice,
          currentTierName,
          nextPriceChange,
          isEarlyBird,
        };
      });
    }

    // Get bundles if tickets are visible
    let bundles = null;
    if (event.ticketsVisible && paymentConfig?.isActive) {
      const activeBundles = await ctx.db
        .query("ticketBundles")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Check sale period for each bundle
      const now = Date.now();
      bundles = activeBundles
        .filter((bundle) => {
          const saleActive =
            (!bundle.saleStart || now >= bundle.saleStart) &&
            (!bundle.saleEnd || now <= bundle.saleEnd);
          const hasStock = bundle.totalQuantity - bundle.sold > 0;
          return saleActive && hasStock;
        })
        .map((bundle) => ({
          ...bundle,
          available: bundle.totalQuantity - bundle.sold,
          percentageSavings:
            bundle.regularPrice && bundle.regularPrice > 0
              ? Math.round((bundle.savings! / bundle.regularPrice) * 100)
              : 0,
        }));
    }

    // Get organizer info
    const organizer = event.organizerId ? await ctx.db.get(event.organizerId) : null;

    // Convert storage IDs to URLs for images
    // Resolve existing imageUrl (may be relative path from self-hosted Convex)
    let imageUrl = resolveStorageUrl(event.imageUrl ?? null);
    if (!imageUrl && event.images && event.images.length > 0) {
      const url = await ctx.storage.getUrl(event.images[0]);
      imageUrl = resolveStorageUrl(url);
    }

    // Determine ticketing status for better error messaging
    const now = Date.now();
    const isPastEvent = event.endDate ? event.endDate < now : false;
    const allTiersSoldOut = ticketTiers && ticketTiers.length > 0
      ? ticketTiers.every((tier: any) => tier.sold >= tier.quantity)
      : false;

    let ticketingStatus: {
      status: "available" | "hidden" | "payment_not_configured" | "sold_out" | "event_ended";
      message: string;
    };

    if (isPastEvent) {
      ticketingStatus = {
        status: "event_ended",
        message: "This event has already taken place.",
      };
    } else if (!event.ticketsVisible) {
      ticketingStatus = {
        status: "hidden",
        message: "Tickets are not yet available for this event. Check back soon!",
      };
    } else if (!paymentConfig?.isActive) {
      ticketingStatus = {
        status: "payment_not_configured",
        message: "The organizer is still setting up ticket sales. Please check back later or contact the organizer.",
      };
    } else if (allTiersSoldOut) {
      ticketingStatus = {
        status: "sold_out",
        message: "All tickets for this event have sold out!",
      };
    } else {
      ticketingStatus = {
        status: "available",
        message: "Tickets available for purchase.",
      };
    }

    return {
      ...event,
      imageUrl,
      tickets,
      ticketTiers,
      bundles,
      ticketingStatus,
      organizer: {
        name: organizer?.name,
        email: organizer?.email,
      },
      paymentConfigured: !!paymentConfig?.isActive,
    };
  },
});

/**
 * Search events by query
 * Excludes CLASS type events - classes have their own dedicated queries
 */
export const searchEvents = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchLower = args.query.toLowerCase();

    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    // Filter out CLASS events and apply search
    const filtered = allEvents.filter(
      (e) =>
        e.eventType !== "CLASS" &&
        (e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.city &&
            e.location.city.toLowerCase().includes(searchLower)) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.state &&
            e.location.state.toLowerCase().includes(searchLower)) ||
          (e.categories && e.categories.some((c) => c.toLowerCase().includes(searchLower))))
    );

    const limited = args.limit ? filtered.slice(0, args.limit) : filtered;

    return limited;
  },
});

/**
 * Get events by category
 * Excludes CLASS type events - classes have their own dedicated queries
 */
export const getEventsByCategory = query({
  args: {
    category: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    // Filter out CLASS events and filter by category
    const filtered = allEvents.filter(
      (e) => e.eventType !== "CLASS" && e.categories?.includes(args.category)
    );

    const limited = args.limit ? filtered.slice(0, args.limit) : filtered;

    return limited;
  },
});

/**
 * Get events by location (city or state)
 * Excludes CLASS type events - classes have their own dedicated queries
 */
export const getEventsByLocation = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    // Filter out CLASS events first
    let filtered = allEvents.filter((e) => e.eventType !== "CLASS");

    if (args.city) {
      filtered = filtered.filter(
        (e) =>
          e.location &&
          typeof e.location === "object" &&
          e.location.city &&
          e.location.city.toLowerCase() === args.city!.toLowerCase()
      );
    }

    if (args.state) {
      filtered = filtered.filter(
        (e) =>
          e.location &&
          typeof e.location === "object" &&
          e.location.state &&
          e.location.state.toLowerCase() === args.state!.toLowerCase()
      );
    }

    const limited = args.limit ? filtered.slice(0, args.limit) : filtered;

    return limited;
  },
});

/**
 * Get featured events (for homepage carousel)
 * Excludes CLASS type events - classes have their own dedicated queries
 */
export const getFeaturedEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // For now, just return upcoming events sorted by share count
    // Later, you can add a "featured" flag to events
    const events = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    const upcoming = events
      .filter((e) => e.eventType !== "CLASS" && e.startDate && e.startDate >= Date.now())
      .sort((a, b) => (b.socialShareCount || 0) - (a.socialShareCount || 0))
      .slice(0, args.limit || 10);

    return upcoming;
  },
});

/**
 * Get all event categories with event counts for filter UI.
 * Returns all 10 approved categories from EVENT_CATEGORIES constant.
 * Excludes CLASS type events in counts.
 *
 * @returns Array of { name: string, count: number } for each category
 *
 * @example
 * // Use for category filter chips
 * const categories = useQuery(api.public.queries.getCategories)
 * // Returns: [{ name: "Steppin", count: 15 }, { name: "Line Dancing", count: 8 }, ...]
 */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    // Filter out CLASS events
    const events = allEvents.filter((e) => e.eventType !== "CLASS");

    // Initialize counts for all approved categories
    const categoryCounts = new Map<string, number>();
    EVENT_CATEGORIES.forEach((cat) => categoryCounts.set(cat, 0));

    // Count events per category (only count if it's a valid category)
    events.forEach((event) => {
      event.categories?.forEach((category) => {
        if (categoryCounts.has(category)) {
          categoryCounts.set(category, categoryCounts.get(category)! + 1);
        }
      });
    });

    // Return all approved categories with their counts
    return EVENT_CATEGORIES.map((name) => ({
      name,
      count: categoryCounts.get(name) || 0,
    }));
  },
});

/**
 * Get all active restaurants (public API)
 */
export const getActiveRestaurants = query({
  args: {},
  handler: async (ctx) => {
    const allRestaurants = await ctx.db.query("restaurants").collect();
    return allRestaurants.filter((r) => r.isActive === true);
  },
});

// =============================================================================
// CLASSES QUERIES - Public queries for class listings
// =============================================================================

/**
 * Get all published classes (eventType: CLASS)
 * Supports multi-select filtering by class types and days of the week
 */
export const getPublishedClasses = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()), // Legacy single category (backwards compat)
    categories: v.optional(v.array(v.string())), // Multi-select class types (Steppin, Line Dancing, Walking)
    searchTerm: v.optional(v.string()),
    includePast: v.optional(v.boolean()),
    dayOfWeek: v.optional(v.number()), // Legacy single day (backwards compat)
    daysOfWeek: v.optional(v.array(v.number())), // Multi-select days: 0=Sun, 1=Mon, etc.
    level: v.optional(v.string()), // Single level filter (backwards compat)
    levels: v.optional(v.array(v.string())), // Multi-select levels: Beginner, Intermediate, Advanced
    instructorId: v.optional(v.id("instructors")), // Filter by instructor ID
    instructorSlug: v.optional(v.string()), // Filter by instructor slug
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all published events with eventType CLASS
    const eventsQuery = ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .order("desc");

    let classes = await eventsQuery.collect();

    // Filter to only CLASS type events
    classes = classes.filter((e) => e.eventType === "CLASS");

    // Filter out past classes by default (unless includePast is true)
    if (!args.includePast) {
      classes = classes.filter((e) => {
        const classDate = e.endDate || e.startDate;
        return classDate && classDate >= now;
      });
    }

    // Filter by categories (multi-select) - class must have at least one of the selected categories
    // Categories = Class Types: Steppin, Line Dancing, Walking
    if (args.categories && args.categories.length > 0) {
      classes = classes.filter((e) =>
        e.categories?.some((cat) => args.categories!.includes(cat))
      );
    } else if (args.category) {
      // Legacy single category filter (backwards compatibility)
      classes = classes.filter((e) => e.categories?.includes(args.category!));
    }

    // Filter by skill levels (multi-select) - Beginner, Intermediate, Advanced
    if (args.levels && args.levels.length > 0) {
      classes = classes.filter((e) => e.classLevel && args.levels!.includes(e.classLevel));
    } else if (args.level) {
      // Legacy single level filter (backwards compatibility)
      classes = classes.filter((e) => e.classLevel === args.level);
    }

    // Filter by search term if specified
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      classes = classes.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          (e.location &&
            typeof e.location === "object" &&
            e.location.city &&
            e.location.city.toLowerCase().includes(searchLower))
      );
    }

    // Filter by days of week (multi-select) - uses classDays field stored on the class
    if (args.daysOfWeek && args.daysOfWeek.length > 0) {
      classes = classes.filter((e) => {
        // Use classDays field if available (preferred)
        if (e.classDays && e.classDays.length > 0) {
          return e.classDays.some((day: number) => args.daysOfWeek!.includes(day));
        }
        // Fallback to startDate day for backwards compatibility
        if (!e.startDate) return false;
        const date = new Date(e.startDate);
        return args.daysOfWeek!.includes(date.getDay());
      });
    } else if (args.dayOfWeek !== undefined) {
      // Legacy single day filter (backwards compatibility)
      classes = classes.filter((e) => {
        // Use classDays field if available (preferred)
        if (e.classDays && e.classDays.length > 0) {
          return e.classDays.includes(args.dayOfWeek!);
        }
        // Fallback to startDate day for backwards compatibility
        if (!e.startDate) return false;
        const date = new Date(e.startDate);
        return date.getDay() === args.dayOfWeek;
      });
    }

    // Filter by instructor ID or slug
    if (args.instructorId) {
      classes = classes.filter((e) => e.instructorId === args.instructorId);
    } else if (args.instructorSlug) {
      classes = classes.filter((e) => e.instructorSlug === args.instructorSlug);
    }

    // Sort by date in chronological order (oldest to newest)
    classes.sort((a, b) => {
      const aDate = a.startDate || 0;
      const bDate = b.startDate || 0;
      return aDate - bDate;
    });

    // Limit results
    if (args.limit) {
      classes = classes.slice(0, args.limit);
    }

    // Convert storage IDs to URLs for images and add UI-expected fields
    const classesWithEnrichedData = await Promise.all(
      classes.map(async (classItem) => {
        // Resolve existing imageUrl (may be relative path from self-hosted Convex)
        let imageUrl = resolveStorageUrl(classItem.imageUrl ?? null);

        if (!imageUrl && classItem.images && classItem.images.length > 0) {
          const url = await ctx.storage.getUrl(classItem.images[0]);
          imageUrl = resolveStorageUrl(url);
        }

        // Get ticket tiers for enrollment and pricing data
        const ticketTiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event", (q) => q.eq("eventId", classItem._id))
          .collect();

        // Calculate enrollment and pricing
        const totalSold = ticketTiers.reduce((sum, tier) => sum + (tier.sold || 0), 0);
        const totalCapacity = ticketTiers.reduce((sum, tier) => sum + (tier.quantity || 0), 0);
        const lowestPriceCents = ticketTiers.length > 0
          ? Math.min(...ticketTiers.map((t) => t.price))
          : null;

        // Use ticketTiers capacity if available, otherwise fall back to event capacity
        const maxCapacity = totalCapacity > 0 ? totalCapacity : classItem.capacity;

        // Get class reviews for average rating
        const reviews = await ctx.db
          .query("classReviews")
          .withIndex("by_class", (q) =>
            q.eq("classId", classItem._id).eq("status", "approved")
          )
          .collect();

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

        return {
          ...classItem,
          imageUrl,
          // Map schema fields to UI-expected names
          level: classItem.classLevel,
          instructorName: classItem.organizerName,
          instructorSlug: classItem.instructorSlug,
          maxCapacity,
          currentEnrollment: totalSold,
          lowestPriceCents,
          // Add rating data
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
        };
      })
    );

    return classesWithEnrichedData;
  },
});

/**
 * Get class categories with counts
 */
export const getClassCategories = query({
  args: {},
  handler: async (ctx) => {
    const classes = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    // Filter to only CLASS type
    const classEvents = classes.filter((e) => e.eventType === "CLASS");

    // Count classes per category
    const categoryCounts = new Map<string, number>();

    classEvents.forEach((classItem) => {
      classItem.categories?.forEach((category) => {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    });

    // Convert to array and sort by count
    const categories = Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return categories;
  },
});

/**
 * Get instructors who have classes (for filter dropdown)
 */
export const getClassInstructors = query({
  args: {},
  handler: async (ctx) => {
    // Get all active instructors
    const instructors = await ctx.db
      .query("instructors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Return simplified instructor list for filter dropdown
    return instructors.map((i) => ({
      _id: i._id,
      name: i.name,
      slug: i.slug,
      photoUrl: i.photoUrl,
      verified: i.verified,
    }));
  },
});

/**
 * Get public class details by ID
 */
export const getPublicClassDetails = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const classItem = await ctx.db.get(args.classId);

    if (!classItem || classItem.status !== "PUBLISHED" || classItem.eventType !== "CLASS") {
      return null;
    }

    // Get organizer info
    const organizer = classItem.organizerId ? await ctx.db.get(classItem.organizerId) : null;

    // Get instructor info if available
    const instructor = classItem.instructorId ? await ctx.db.get(classItem.instructorId) : null;

    // Convert storage IDs to URLs for images
    // Resolve existing imageUrl (may be relative path from self-hosted Convex)
    let imageUrl = resolveStorageUrl(classItem.imageUrl ?? null);
    if (!imageUrl && classItem.images && classItem.images.length > 0) {
      const url = await ctx.storage.getUrl(classItem.images[0]);
      imageUrl = resolveStorageUrl(url);
    }

    // Get ticket tiers for enrollment options
    const ticketTiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.classId))
      .collect();

    // Map tiers with availability info
    const enrollmentTiers = ticketTiers.map((tier) => ({
      _id: tier._id,
      name: tier.name,
      description: tier.description,
      priceCents: tier.price, // Already stored in cents per schema
      quantity: tier.quantity,
      sold: tier.sold,
      available: tier.quantity - tier.sold,
      isAvailable: tier.quantity - tier.sold > 0,
    }));

    // Calculate lowest price for display (in cents)
    const lowestPriceCents = enrollmentTiers.length > 0
      ? Math.min(...enrollmentTiers.map((t) => t.priceCents))
      : null;

    return {
      ...classItem,
      imageUrl,
      organizer: {
        name: organizer?.name,
        email: organizer?.email,
      },
      instructor: instructor ? {
        _id: instructor._id,
        name: instructor.name,
        slug: instructor.slug,
        photoUrl: instructor.photoUrl,
        bio: instructor.bio,
        specialties: instructor.specialties,
        verified: instructor.verified,
        location: instructor.location,
        experienceYears: instructor.experienceYears,
      } : null,
      enrollmentTiers,
      lowestPriceCents,
      hasAvailableSpots: enrollmentTiers.some((t) => t.isAvailable),
    };
  },
});

/**
 * Get related classes for an event - helps attendees prepare for events
 * Story 8.4: Cross-link events with classes
 *
 * Matching criteria (in priority order):
 * 1. Same city as the event
 * 2. Classes happening before the event (to help attendees prepare)
 * 3. Beginner classes if event is beginner-friendly
 * 4. Same dance style categories
 *
 * @param eventId - The event to find related classes for
 * @returns Array of up to 3 related classes
 */
export const getRelatedClasses = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "PUBLISHED") {
      return [];
    }

    const now = Date.now();

    // Get all published classes
    let classes = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    // Filter to only CLASS type events
    classes = classes.filter((e) => e.eventType === "CLASS");

    // Filter to upcoming classes only
    classes = classes.filter((e) => {
      const classDate = e.endDate || e.startDate;
      return classDate && classDate >= now;
    });

    // If event has a date, prefer classes happening before the event
    if (event.startDate) {
      classes = classes.filter((e) => {
        if (!e.startDate) return true;
        // Class should happen before the event (to help prepare)
        return e.startDate < event.startDate!;
      });
    }

    // Score and rank classes by relevance
    const scoredClasses = classes.map((classItem) => {
      let score = 0;

      // +3 points: Same city
      if (
        event.location &&
        classItem.location &&
        typeof event.location === "object" &&
        typeof classItem.location === "object" &&
        event.location.city &&
        classItem.location.city &&
        event.location.city.toLowerCase() === classItem.location.city.toLowerCase()
      ) {
        score += 3;
      }

      // +2 points: Same state (if city doesn't match)
      else if (
        event.location &&
        classItem.location &&
        typeof event.location === "object" &&
        typeof classItem.location === "object" &&
        event.location.state &&
        classItem.location.state &&
        event.location.state.toLowerCase() === classItem.location.state.toLowerCase()
      ) {
        score += 2;
      }

      // +2 points: Beginner class if event is beginner-friendly
      if (event.beginnerFriendly && classItem.classLevel === "Beginner") {
        score += 2;
      }

      // +1 point: Matching categories (dance styles)
      if (event.categories && classItem.categories) {
        const matchingCategories = event.categories.filter((cat) =>
          classItem.categories?.includes(cat)
        );
        score += matchingCategories.length;
      }

      return { classItem, score };
    });

    // Sort by score (highest first), then by date (soonest first)
    scoredClasses.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aDate = a.classItem.startDate || 0;
      const bDate = b.classItem.startDate || 0;
      return aDate - bDate;
    });

    // Take top 3 with score > 0 (only truly related classes)
    const topClasses = scoredClasses
      .filter((sc) => sc.score > 0)
      .slice(0, 3)
      .map((sc) => sc.classItem);

    // If we have less than 3 related classes, fill with any classes from same city
    if (topClasses.length < 3) {
      const cityClasses = scoredClasses
        .filter((sc) => sc.score >= 2 && !topClasses.includes(sc.classItem))
        .slice(0, 3 - topClasses.length)
        .map((sc) => sc.classItem);
      topClasses.push(...cityClasses);
    }

    // Enrich with image URLs and basic info
    const enrichedClasses = await Promise.all(
      topClasses.map(async (classItem) => {
        let imageUrl = resolveStorageUrl(classItem.imageUrl ?? null);
        if (!imageUrl && classItem.images && classItem.images.length > 0) {
          const url = await ctx.storage.getUrl(classItem.images[0]);
          imageUrl = resolveStorageUrl(url);
        }

        return {
          _id: classItem._id,
          name: classItem.name,
          imageUrl,
          location: classItem.location,
          startDate: classItem.startDate,
          classLevel: classItem.classLevel,
          instructorName: classItem.organizerName,
          categories: classItem.categories,
        };
      })
    );

    return enrichedClasses;
  },
});
