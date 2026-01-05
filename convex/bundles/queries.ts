import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all bundles for an event
 */
export const getBundlesForEvent = query({
  args: {
    eventId: v.id("events"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const bundles = await ctx.db
      .query("ticketBundles")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Filter by active status if requested
    const filteredBundles = args.includeInactive ? bundles : bundles.filter((b) => b.isActive);

    // Enrich with tier information
    const enrichedBundles = await Promise.all(
      filteredBundles.map(async (bundle) => {
        // Get full tier details for each included tier
        const tierDetails = await Promise.all(
          bundle.includedTiers.map(async (includedTier) => {
            const tier = await ctx.db.get(includedTier.tierId);
            return {
              ...includedTier,
              tierDetails: tier
                ? {
                    name: tier.name,
                    description: tier.description,
                    price: tier.price,
                    available: tier.quantity - tier.sold,
                  }
                : null,
            };
          })
        );

        // Calculate availability based on included tier availability
        const maxAvailable = Math.min(
          bundle.totalQuantity - bundle.sold,
          ...tierDetails.map((td) =>
            td.tierDetails ? Math.floor(td.tierDetails.available / td.quantity) : 0
          )
        );

        return {
          ...bundle,
          includedTiersDetails: tierDetails,
          available: maxAvailable,
          percentageSavings:
            bundle.regularPrice && bundle.regularPrice > 0
              ? Math.round((bundle.savings! / bundle.regularPrice) * 100)
              : 0,
        };
      })
    );

    return enrichedBundles;
  },
});

/**
 * Get bundle details by ID
 */
export const getBundleDetails = query({
  args: {
    bundleId: v.id("ticketBundles"),
  },
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) return null;

    // Get full tier details for each included tier
    const tierDetails = await Promise.all(
      bundle.includedTiers.map(async (includedTier) => {
        const tier = await ctx.db.get(includedTier.tierId);
        return {
          ...includedTier,
          tierDetails: tier
            ? {
                name: tier.name,
                description: tier.description,
                price: tier.price,
                quantity: tier.quantity,
                sold: tier.sold,
                available: tier.quantity - tier.sold,
              }
            : null,
        };
      })
    );

    // Calculate availability
    const maxAvailable = Math.min(
      bundle.totalQuantity - bundle.sold,
      ...tierDetails.map((td) =>
        td.tierDetails ? Math.floor(td.tierDetails.available / td.quantity) : 0
      )
    );

    return {
      ...bundle,
      includedTiersDetails: tierDetails,
      available: maxAvailable,
      percentageSavings:
        bundle.regularPrice && bundle.regularPrice > 0
          ? Math.round((bundle.savings! / bundle.regularPrice) * 100)
          : 0,
    };
  },
});

/**
 * Check if bundle is available for purchase
 */
export const isBundleAvailable = query({
  args: {
    bundleId: v.id("ticketBundles"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) {
      return {
        available: false,
        reason: "Bundle not found",
      };
    }

    // Check if bundle is active
    if (!bundle.isActive) {
      return {
        available: false,
        reason: "Bundle is no longer active",
      };
    }

    // Check sale period
    const now = Date.now();
    if (bundle.saleStart && now < bundle.saleStart) {
      return {
        available: false,
        reason: "Bundle sales have not started yet",
        saleStartsAt: bundle.saleStart,
      };
    }
    if (bundle.saleEnd && now > bundle.saleEnd) {
      return {
        available: false,
        reason: "Bundle sales have ended",
      };
    }

    // Check bundle quantity
    const bundlesLeft = bundle.totalQuantity - bundle.sold;
    if (bundlesLeft < args.quantity) {
      return {
        available: false,
        reason: `Only ${bundlesLeft} bundle${bundlesLeft === 1 ? "" : "s"} remaining`,
        maxQuantity: bundlesLeft,
      };
    }

    // Check each included tier availability
    for (const includedTier of bundle.includedTiers) {
      const tier = await ctx.db.get(includedTier.tierId);
      if (!tier) {
        return {
          available: false,
          reason: `Ticket tier ${includedTier.tierName} not found`,
        };
      }

      const tiersNeeded = includedTier.quantity * args.quantity;
      const tiersAvailable = tier.quantity - tier.sold;

      if (tiersAvailable < tiersNeeded) {
        return {
          available: false,
          reason: `Not enough ${includedTier.tierName} tickets available`,
          tierName: includedTier.tierName,
          needed: tiersNeeded,
          tiersAvailable: tiersAvailable,
        };
      }
    }

    return {
      available: true,
    };
  },
});

/**
 * Get all multi-event bundles for an organizer
 */
export const getMultiEventBundles = query({
  args: {
    organizerId: v.id("users"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get all events by this organizer
    const organizerEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("organizerId"), args.organizerId))
      .collect();

    const eventIds = organizerEvents.map((e) => e._id);

    // Get all bundles
    const allBundles = await ctx.db.query("ticketBundles").collect();

    // Filter to multi-event bundles owned by this organizer
    const multiEventBundles = allBundles.filter((bundle) => {
      // Must be multi-event type
      if (bundle.bundleType !== "MULTI_EVENT") return false;

      // Filter by active status if requested
      if (!args.includeInactive && !bundle.isActive) return false;

      // Check if any of the bundle's events belong to this organizer
      if (bundle.eventIds && bundle.eventIds.length > 0) {
        return bundle.eventIds.some((eid) => eventIds.includes(eid));
      }

      return false;
    });

    // Enrich with event and tier information
    const enrichedBundles = await Promise.all(
      multiEventBundles.map(async (bundle) => {
        // Get event details
        const eventDetails = await Promise.all(
          (bundle.eventIds || []).map(async (eventId) => {
            const event = await ctx.db.get(eventId);
            return event
              ? {
                  _id: event._id,
                  name: event.name,
                  startDate: event.startDate,
                  imageUrl: event.imageUrl,
                }
              : null;
          })
        );

        // Get tier details
        const tierDetails = await Promise.all(
          bundle.includedTiers.map(async (includedTier) => {
            const tier = await ctx.db.get(includedTier.tierId);
            return {
              ...includedTier,
              tierDetails: tier
                ? {
                    name: tier.name,
                    description: tier.description,
                    price: tier.price,
                    available: tier.quantity - tier.sold,
                  }
                : null,
            };
          })
        );

        // Calculate availability
        const maxAvailable = Math.min(
          bundle.totalQuantity - bundle.sold,
          ...tierDetails.map((td) =>
            td.tierDetails ? Math.floor(td.tierDetails.available / td.quantity) : 0
          )
        );

        return {
          ...bundle,
          events: eventDetails.filter((e) => e !== null),
          includedTiersDetails: tierDetails,
          available: maxAvailable,
          percentageSavings:
            bundle.regularPrice && bundle.regularPrice > 0
              ? Math.round((bundle.savings! / bundle.regularPrice) * 100)
              : 0,
        };
      })
    );

    return enrichedBundles;
  },
});

/**
 * Get all bundles (single and multi-event) for an organizer
 */
export const getAllOrganizerBundles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // PRODUCTION: Require authentication
    if (!identity?.email) {
      return []; // Not authenticated, return empty
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    // Get all events by this organizer
    const organizerEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("organizerId"), user._id))
      .collect();

    const eventIds = organizerEvents.map((e) => e._id);

    // Get all bundles
    const allBundles = await ctx.db.query("ticketBundles").collect();

    // Filter bundles owned by this organizer
    const organizerBundles = allBundles.filter((bundle) => {
      // Single-event bundles: check if eventId belongs to organizer
      if (bundle.bundleType === "SINGLE_EVENT" || !bundle.bundleType) {
        return bundle.eventId && eventIds.includes(bundle.eventId);
      }

      // Multi-event bundles: check if any eventIds belong to organizer
      if (bundle.bundleType === "MULTI_EVENT") {
        return bundle.eventIds && bundle.eventIds.some((eid) => eventIds.includes(eid));
      }

      return false;
    });

    // Enrich with event and tier information
    const enrichedBundles = await Promise.all(
      organizerBundles.map(async (bundle) => {
        // Get event details
        const bundleEventIds =
          bundle.bundleType === "MULTI_EVENT" && bundle.eventIds
            ? bundle.eventIds
            : bundle.eventId
              ? [bundle.eventId]
              : [];

        const eventDetails = await Promise.all(
          bundleEventIds.map(async (eventId) => {
            const event = await ctx.db.get(eventId);
            return event
              ? {
                  _id: event._id,
                  name: event.name,
                  startDate: event.startDate,
                  imageUrl: event.imageUrl,
                }
              : null;
          })
        );

        // Get tier details
        const tierDetails = await Promise.all(
          bundle.includedTiers.map(async (includedTier) => {
            const tier = await ctx.db.get(includedTier.tierId);
            return {
              ...includedTier,
              tierDetails: tier
                ? {
                    name: tier.name,
                    description: tier.description,
                    price: tier.price,
                    available: tier.quantity - tier.sold,
                  }
                : null,
            };
          })
        );

        // Calculate availability
        const maxAvailable = Math.min(
          bundle.totalQuantity - bundle.sold,
          ...tierDetails.map((td) =>
            td.tierDetails ? Math.floor(td.tierDetails.available / td.quantity) : 0
          )
        );

        return {
          ...bundle,
          events: eventDetails.filter((e) => e !== null),
          includedTiersDetails: tierDetails,
          available: maxAvailable,
          percentageSavings:
            bundle.regularPrice && bundle.regularPrice > 0
              ? Math.round((bundle.savings! / bundle.regularPrice) * 100)
              : 0,
        };
      })
    );

    // Sort by creation date (newest first)
    return enrichedBundles.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
});

/**
 * Get bundles available for a specific event (for event detail page)
 * Returns both single-event bundles for this event AND multi-event bundles that include this event
 */
export const getBundlesForPublicEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all active bundles
    const allBundles = await ctx.db
      .query("ticketBundles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter bundles that include this event
    const relevantBundles = allBundles.filter((bundle) => {
      // Check sale period
      const onSale =
        (!bundle.saleStart || now >= bundle.saleStart) &&
        (!bundle.saleEnd || now <= bundle.saleEnd);

      if (!onSale) return false;

      // Single-event bundles: must match this eventId
      if (bundle.bundleType === "SINGLE_EVENT" || !bundle.bundleType) {
        return bundle.eventId === args.eventId;
      }

      // Multi-event bundles: must include this eventId
      if (bundle.bundleType === "MULTI_EVENT") {
        return bundle.eventIds && bundle.eventIds.includes(args.eventId);
      }

      return false;
    });

    // Enrich with event and tier information
    const enrichedBundles = await Promise.all(
      relevantBundles.map(async (bundle) => {
        // Get event details
        const bundleEventIds =
          bundle.bundleType === "MULTI_EVENT" && bundle.eventIds
            ? bundle.eventIds
            : bundle.eventId
              ? [bundle.eventId]
              : [];

        const eventDetails = await Promise.all(
          bundleEventIds.map(async (eventId) => {
            const event = await ctx.db.get(eventId);
            return event
              ? {
                  _id: event._id,
                  name: event.name,
                  startDate: event.startDate,
                  imageUrl: event.imageUrl,
                  location: event.location,
                }
              : null;
          })
        );

        // Get tier details
        const tierDetails = await Promise.all(
          bundle.includedTiers.map(async (includedTier) => {
            const tier = await ctx.db.get(includedTier.tierId);
            return {
              ...includedTier,
              tierDetails: tier
                ? {
                    name: tier.name,
                    description: tier.description,
                    price: tier.price,
                    available: tier.quantity - tier.sold,
                  }
                : null,
            };
          })
        );

        // Calculate availability
        const maxAvailable = Math.min(
          bundle.totalQuantity - bundle.sold,
          ...tierDetails.map((td) =>
            td.tierDetails ? Math.floor(td.tierDetails.available / td.quantity) : 0
          )
        );

        return {
          ...bundle,
          events: eventDetails.filter((e) => e !== null),
          includedTiersDetails: tierDetails,
          available: maxAvailable,
          percentageSavings:
            bundle.regularPrice && bundle.regularPrice > 0
              ? Math.round((bundle.savings! / bundle.regularPrice) * 100)
              : 0,
        };
      })
    );

    // Only return bundles with availability
    return enrichedBundles.filter((b) => b.available > 0);
  },
});

/**
 * Get all bundles (single and multi-event) for public display
 */
export const getAllActiveBundles = query({
  args: {},
  handler: async (ctx) => {
    const allBundles = await ctx.db
      .query("ticketBundles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Check sale periods and enrich
    const now = Date.now();
    const enrichedBundles = await Promise.all(
      allBundles.map(async (bundle) => {
        // Check if currently on sale
        const onSale =
          (!bundle.saleStart || now >= bundle.saleStart) &&
          (!bundle.saleEnd || now <= bundle.saleEnd);

        if (!onSale) return null;

        // Get event details
        const eventIds =
          bundle.bundleType === "MULTI_EVENT" && bundle.eventIds
            ? bundle.eventIds
            : [bundle.eventId!];

        const eventDetails = await Promise.all(
          eventIds.map(async (eventId) => {
            const event = await ctx.db.get(eventId);
            return event
              ? {
                  _id: event._id,
                  name: event.name,
                  startDate: event.startDate,
                  imageUrl: event.imageUrl,
                  location: event.location,
                }
              : null;
          })
        );

        // Get tier details
        const tierDetails = await Promise.all(
          bundle.includedTiers.map(async (includedTier) => {
            const tier = await ctx.db.get(includedTier.tierId);
            return {
              ...includedTier,
              tierDetails: tier
                ? {
                    name: tier.name,
                    description: tier.description,
                    price: tier.price,
                    available: tier.quantity - tier.sold,
                  }
                : null,
            };
          })
        );

        // Calculate availability
        const maxAvailable = Math.min(
          bundle.totalQuantity - bundle.sold,
          ...tierDetails.map((td) =>
            td.tierDetails ? Math.floor(td.tierDetails.available / td.quantity) : 0
          )
        );

        return {
          ...bundle,
          events: eventDetails.filter((e) => e !== null),
          includedTiersDetails: tierDetails,
          available: maxAvailable,
          percentageSavings:
            bundle.regularPrice && bundle.regularPrice > 0
              ? Math.round((bundle.savings! / bundle.regularPrice) * 100)
              : 0,
        };
      })
    );

    return enrichedBundles.filter((b) => b !== null && b.available > 0);
  },
});

/**
 * Get user's bundle purchases
 */
export const getUserBundlePurchases = query({
  args: {
    status: v.optional(v.string()), // Filter by status
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return [];
    }

    // Get purchases by user ID
    let purchases = await ctx.db
      .query("bundlePurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Also get purchases by email (for older records without userId)
    const purchasesByEmail = await ctx.db
      .query("bundlePurchases")
      .withIndex("by_email", (q) => q.eq("buyerEmail", identity.email!))
      .collect();

    // Merge and dedupe
    const purchaseIds = new Set(purchases.map((p) => p._id));
    for (const p of purchasesByEmail) {
      if (!purchaseIds.has(p._id)) {
        purchases.push(p);
      }
    }

    // Filter by status if requested
    if (args.status) {
      purchases = purchases.filter((p) => p.status === args.status);
    }

    // Enrich with bundle details
    const enrichedPurchases = await Promise.all(
      purchases.map(async (purchase) => {
        const bundle = await ctx.db.get(purchase.bundleId);
        if (!bundle) {
          return {
            ...purchase,
            bundle: null,
            events: [],
          };
        }

        // Get event details
        const bundleEventIds =
          bundle.bundleType === "MULTI_EVENT" && bundle.eventIds
            ? bundle.eventIds
            : bundle.eventId
              ? [bundle.eventId]
              : [];

        const eventDetails = await Promise.all(
          bundleEventIds.map(async (eventId) => {
            const event = await ctx.db.get(eventId);
            return event
              ? {
                  _id: event._id,
                  name: event.name,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  imageUrl: event.imageUrl,
                  location: event.location,
                }
              : null;
          })
        );

        return {
          ...purchase,
          bundle: {
            _id: bundle._id,
            name: bundle.name,
            description: bundle.description,
            bundleType: bundle.bundleType,
            includedTiers: bundle.includedTiers,
            price: bundle.price,
            regularPrice: bundle.regularPrice,
            savings: bundle.savings,
          },
          events: eventDetails.filter((e) => e !== null),
        };
      })
    );

    // Sort by purchase date (newest first)
    return enrichedPurchases.sort((a, b) => (b.purchaseDate || 0) - (a.purchaseDate || 0));
  },
});

/**
 * Get a single bundle purchase by ID
 */
export const getBundlePurchaseById = query({
  args: {
    purchaseId: v.id("bundlePurchases"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return null;
    }

    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      return null;
    }

    // Verify ownership - either by userId or email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    const isOwner =
      (user && purchase.userId === user._id) || purchase.buyerEmail === identity.email;

    if (!isOwner) {
      return null;
    }

    // Get bundle details
    const bundle = await ctx.db.get(purchase.bundleId);

    // Get event details
    const bundleEventIds =
      bundle?.bundleType === "MULTI_EVENT" && bundle.eventIds
        ? bundle.eventIds
        : bundle?.eventId
          ? [bundle.eventId]
          : [];

    const eventDetails = await Promise.all(
      bundleEventIds.map(async (eventId) => {
        const event = await ctx.db.get(eventId);
        return event
          ? {
              _id: event._id,
              name: event.name,
              startDate: event.startDate,
              endDate: event.endDate,
              imageUrl: event.imageUrl,
              location: event.location,
            }
          : null;
      })
    );

    // Get ticket details - batch fetch all tickets in the purchase
    // First get all tickets for this bundle purchase
    const allTickets = await ctx.db
      .query("tickets")
      .filter((q) => q.eq(q.field("bundleId"), purchase.bundleId))
      .collect();

    // Match tickets by ID (stored as strings in ticketIds array)
    const ticketDetails = purchase.ticketIds.map((ticketId) => {
      const ticket = allTickets.find((t) => String(t._id) === String(ticketId));
      if (!ticket) return null;

      return {
        _id: ticket._id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        tierName: "", // Will populate below
        eventName: "", // Will populate below
        eventDate: undefined as number | undefined,
        ticketTierId: ticket.ticketTierId,
        eventId: ticket.eventId,
      };
    });

    // Enrich with tier and event names
    const enrichedTicketDetails = await Promise.all(
      ticketDetails.map(async (ticket) => {
        if (!ticket) return null;

        const tier = ticket.ticketTierId
          ? await ctx.db.get(ticket.ticketTierId)
          : null;
        const event = ticket.eventId ? await ctx.db.get(ticket.eventId) : null;

        return {
          _id: ticket._id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          tierName: tier?.name,
          eventName: event?.name,
          eventDate: event?.startDate,
        };
      })
    );

    return {
      ...purchase,
      bundle: bundle
        ? {
            _id: bundle._id,
            name: bundle.name,
            description: bundle.description,
            bundleType: bundle.bundleType,
            includedTiers: bundle.includedTiers,
            price: bundle.price,
            regularPrice: bundle.regularPrice,
            savings: bundle.savings,
          }
        : null,
      events: eventDetails.filter((e) => e !== null),
      tickets: enrichedTicketDetails.filter((t) => t !== null),
    };
  },
});
