import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Create a ticket bundle (single-event or multi-event)
 */
export const createTicketBundle = mutation({
  args: {
    // Bundle type
    bundleType: v.optional(v.union(v.literal("SINGLE_EVENT"), v.literal("MULTI_EVENT"))),

    // For single-event bundles (legacy support)
    eventId: v.optional(v.id("events")),

    // For multi-event bundles
    eventIds: v.optional(v.array(v.id("events"))),

    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // Bundle price in cents

    // For single-event bundles (legacy format)
    includedTiers: v.optional(
      v.array(
        v.object({
          tierId: v.id("ticketTiers"),
          tierName: v.string(),
          quantity: v.number(),
        })
      )
    ),

    // For multi-event bundles (new format with event info)
    includedTiersWithEvents: v.optional(
      v.array(
        v.object({
          tierId: v.id("ticketTiers"),
          tierName: v.string(),
          quantity: v.number(),
          eventId: v.id("events"),
          eventName: v.string(),
        })
      )
    ),

    totalQuantity: v.number(),
    saleStart: v.optional(v.number()),
    saleEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for creating ticket bundles
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to create ticket bundles.");
    }

    // Determine bundle type (default to SINGLE_EVENT for backward compatibility)
    const bundleType = args.bundleType || "SINGLE_EVENT";

    // Validate bundle type configuration
    if (bundleType === "SINGLE_EVENT") {
      if (!args.eventId) {
        throw new Error("eventId is required for single-event bundles");
      }
      if (!args.includedTiers) {
        throw new Error("includedTiers is required for single-event bundles");
      }
    } else if (bundleType === "MULTI_EVENT") {
      if (!args.eventIds || args.eventIds.length < 2) {
        throw new Error("eventIds with at least 2 events is required for multi-event bundles");
      }
      if (!args.includedTiersWithEvents) {
        throw new Error("includedTiersWithEvents is required for multi-event bundles");
      }
    }

    // Verify event ownership
    const eventsToCheck = bundleType === "SINGLE_EVENT" ? [args.eventId!] : args.eventIds!;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    // Verify all events belong to the organizer
    for (const eventId of eventsToCheck) {
      const event = await ctx.db.get(eventId);
      if (!event) throw new Error(`Event ${eventId} not found`);
      if (event.organizerId !== user._id) {
        throw new Error(`Not authorized to create bundles for event: ${event.name}`);
      }
    }

    // Verify all events exist
    const eventsToVerify = bundleType === "SINGLE_EVENT" ? [args.eventId!] : args.eventIds!;

    for (const eventId of eventsToVerify) {
      const event = await ctx.db.get(eventId);
      if (!event) throw new Error(`Event not found: ${eventId}`);
    }

    // Verify all included tiers exist and calculate regular price
    let regularPrice = 0;
    const tiersToVerify = args.includedTiers || args.includedTiersWithEvents!;

    for (const includedTier of tiersToVerify) {
      const tier = await ctx.db.get(includedTier.tierId);
      if (!tier) {
        throw new Error(`Ticket tier ${includedTier.tierName} not found`);
      }

      // For single-event bundles, verify tier belongs to the event
      if (bundleType === "SINGLE_EVENT" && tier.eventId !== args.eventId) {
        throw new Error(`Ticket tier ${includedTier.tierName} does not belong to this event`);
      }

      // For multi-event bundles, verify tier belongs to one of the events
      if (bundleType === "MULTI_EVENT") {
        const tierWithEvent = includedTier as any;
        if (tier.eventId !== tierWithEvent.eventId) {
          throw new Error(
            `Ticket tier ${includedTier.tierName} does not belong to event ${tierWithEvent.eventName}`
          );
        }
      }

      regularPrice += tier.price * includedTier.quantity;
    }

    // Calculate savings
    const savings = regularPrice - args.price;

    // Normalize includedTiers format
    const normalizedTiers =
      bundleType === "SINGLE_EVENT"
        ? args.includedTiers!.map((tier) => ({
            tierId: tier.tierId,
            tierName: tier.tierName,
            quantity: tier.quantity,
            eventId: args.eventId!,
            eventName: "",
          }))
        : args.includedTiersWithEvents!;

    // Create the bundle
    const bundleId = await ctx.db.insert("ticketBundles", {
      bundleType,
      eventId: bundleType === "SINGLE_EVENT" ? args.eventId : args.eventIds![0], // Primary event for multi-event
      eventIds: bundleType === "MULTI_EVENT" ? args.eventIds : undefined,
      name: args.name,
      description: args.description,
      price: args.price,
      includedTiers: normalizedTiers,
      totalQuantity: args.totalQuantity,
      sold: 0,
      regularPrice,
      savings,
      saleStart: args.saleStart,
      saleEnd: args.saleEnd,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return bundleId;
  },
});

/**
 * Update a ticket bundle
 */
export const updateTicketBundle = mutation({
  args: {
    bundleId: v.id("ticketBundles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    totalQuantity: v.optional(v.number()),
    saleStart: v.optional(v.number()),
    saleEnd: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for updating bundles
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to update bundles");
    }

    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) throw new Error("Bundle not found");

    // Verify event ownership
    if (!bundle.eventId) {
      throw new Error("Bundle has no primary event ID");
    }

    const event = await ctx.db.get(bundle.eventId);
    if (!event) throw new Error("Event not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || event.organizerId !== user._id) {
      throw new Error("Not authorized to update this bundle");
    }

    // SAFEGUARD: Cannot reduce quantity below sold count
    if (args.totalQuantity !== undefined && args.totalQuantity < bundle.sold) {
      throw new Error(
        `Cannot reduce quantity to ${args.totalQuantity} because ${bundle.sold} bundle${bundle.sold === 1 ? " has" : "s have"} already been sold. ` +
          `Quantity must be at least ${bundle.sold}.`
      );
    }

    // SAFEGUARD: Cannot change price after bundles sold (creates pricing inconsistency)
    if (bundle.sold > 0 && args.price !== undefined && args.price !== bundle.price) {
      throw new Error(
        `Cannot change bundle price after ${bundle.sold} bundle${bundle.sold === 1 ? " has" : "s have"} been sold. ` +
          `This would create pricing inconsistency for customers who already purchased at $${(bundle.price / 100).toFixed(2)}. ` +
          `If you need different pricing, please create a new bundle.`
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.totalQuantity !== undefined) updates.totalQuantity = args.totalQuantity;
    if (args.saleStart !== undefined) updates.saleStart = args.saleStart;
    if (args.saleEnd !== undefined) updates.saleEnd = args.saleEnd;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // If price changed, recalculate savings
    if (args.price !== undefined) {
      updates.price = args.price;
      updates.savings = bundle.regularPrice ? bundle.regularPrice - args.price : 0;
    }

    await ctx.db.patch(args.bundleId, updates);

    return { success: true };
  },
});

/**
 * Purchase a ticket bundle
 */
export const createBundlePurchase = mutation({
  args: {
    bundleId: v.id("ticketBundles"),
    quantity: v.number(),
    buyerName: v.string(),
    buyerEmail: v.string(),
    buyerPhone: v.optional(v.string()),
    paymentId: v.string(),
    paymentStatus: v.string(),
    totalPaid: v.number(),
  },
  handler: async (ctx, args) => {
    // Get bundle details
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) throw new Error("Bundle not found");

    // Check if bundle is active
    if (!bundle.isActive) {
      throw new Error("This bundle is no longer available");
    }

    // Check sale period
    const now = Date.now();
    if (bundle.saleStart && now < bundle.saleStart) {
      throw new Error("This bundle is not yet available for purchase");
    }
    if (bundle.saleEnd && now > bundle.saleEnd) {
      throw new Error("This bundle sale has ended");
    }

    // Check availability
    const available = bundle.totalQuantity - bundle.sold;
    if (available < args.quantity) {
      throw new Error(`Only ${available} bundle${available === 1 ? "" : "s"} available`);
    }

    // Update bundle sold count
    await ctx.db.patch(args.bundleId, {
      sold: bundle.sold + args.quantity,
      updatedAt: Date.now(),
    });

    // Create individual tickets for each included tier
    const ticketIds: string[] = [];

    for (let i = 0; i < args.quantity; i++) {
      for (const includedTier of bundle.includedTiers) {
        for (let j = 0; j < includedTier.quantity; j++) {
          // Get tier details
          const tier = await ctx.db.get(includedTier.tierId);
          if (!tier) continue;

          // Generate ticket code
          const ticketCode = `${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

          // Create ticket
          const ticketId = await ctx.db.insert("tickets", {
            eventId: includedTier.eventId || bundle.eventId!,
            ticketTierId: includedTier.tierId,
            bundleId: args.bundleId,
            ticketCode,
            attendeeName: args.buyerName,
            attendeeEmail: args.buyerEmail,
            status: "VALID",
            createdAt: Date.now(),
          });

          ticketIds.push(ticketId);

          // Update tier sold count
          await ctx.db.patch(includedTier.tierId, {
            sold: tier.sold + 1,
          });
        }
      }
    }

    // Look up user by email if authenticated
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.buyerEmail))
      .first();
    const userId = user?._id;

    // Create bundle purchase record
    const purchaseId = await ctx.db.insert("bundlePurchases", {
      bundleId: args.bundleId,
      userId,
      quantity: args.quantity,
      buyerName: args.buyerName,
      buyerEmail: args.buyerEmail,
      buyerPhone: args.buyerPhone,
      paymentId: args.paymentId,
      paymentStatus: args.paymentStatus,
      totalPaidCents: args.totalPaid,
      ticketIds,
      purchaseDate: Date.now(),
      status: "COMPLETED",
    });

    // Schedule confirmation email to be sent
    await ctx.scheduler.runAfter(
      0, // Send immediately
      api.bundles.bundleEmails.sendBundlePurchaseConfirmation,
      { purchaseId }
    );

    return {
      purchaseId,
      ticketIds,
      ticketCodes: ticketIds.length,
    };
  },
});

/**
 * Delete a ticket bundle
 */
export const deleteTicketBundle = mutation({
  args: {
    bundleId: v.id("ticketBundles"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for deleting bundles
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to delete bundles");
    }

    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) throw new Error("Bundle not found");

    // Check if any bundles have been sold
    if (bundle.sold > 0) {
      throw new Error(`Cannot delete bundle with ${bundle.sold} sold. Set to inactive instead.`);
    }

    // Verify event ownership
    if (!bundle.eventId) {
      throw new Error("Bundle has no primary event ID");
    }

    const event = await ctx.db.get(bundle.eventId);
    if (!event) throw new Error("Event not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || event.organizerId !== user._id) {
      throw new Error("Not authorized to delete this bundle");
    }

    await ctx.db.delete(args.bundleId);

    return { success: true };
  },
});

// =====================================================
// SIMPLIFIED BUNDLE CREATION HELPERS
// =====================================================

/**
 * Quick Couple Bundle - Create a 2-ticket bundle with automatic discount
 *
 * Instead of manually specifying all the tier details, just provide:
 * - The event ID and tier ID
 * - A discount percentage
 *
 * The system automatically creates a "Couples Bundle" with 2 tickets.
 */
export const createCouplesBundle = mutation({
  args: {
    eventId: v.id("events"),
    tierId: v.id("ticketTiers"),
    discountPercent: v.number(), // e.g., 10 for 10% off
    quantity: v.optional(v.number()), // Total bundles available (default: 50)
    bundleName: v.optional(v.string()), // Default: "Couples Bundle"
    saleEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get tier details
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Calculate bundle price (2 tickets with discount)
    const regularPrice = tier.price * 2;
    const bundlePrice = Math.round(regularPrice * (1 - args.discountPercent / 100));

    // Create the bundle
    const bundleId = await ctx.db.insert("ticketBundles", {
      bundleType: "SINGLE_EVENT",
      eventId: args.eventId,
      name: args.bundleName || "Couples Bundle",
      description: `Save ${args.discountPercent}% when you buy 2 ${tier.name} tickets together!`,
      price: bundlePrice,
      includedTiers: [
        {
          tierId: args.tierId,
          tierName: tier.name,
          quantity: 2,
          eventId: args.eventId,
          eventName: event.name,
        },
      ],
      totalQuantity: args.quantity || 50,
      sold: 0,
      regularPrice,
      savings: regularPrice - bundlePrice,
      saleEnd: args.saleEnd,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      bundleId,
      bundlePrice,
      regularPrice,
      savings: regularPrice - bundlePrice,
      savingsPercent: args.discountPercent,
    };
  },
});

/**
 * Quick Group Bundle - Create a group ticket bundle (4, 6, 8, or 10 tickets)
 *
 * Common for dance events where groups want to attend together.
 * Larger groups get bigger discounts.
 */
export const createGroupBundle = mutation({
  args: {
    eventId: v.id("events"),
    tierId: v.id("ticketTiers"),
    groupSize: v.union(v.literal(4), v.literal(6), v.literal(8), v.literal(10)),
    discountPercent: v.number(),
    quantity: v.optional(v.number()), // Total bundles available
    bundleName: v.optional(v.string()),
    saleEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const regularPrice = tier.price * args.groupSize;
    const bundlePrice = Math.round(regularPrice * (1 - args.discountPercent / 100));

    const defaultName = `Group of ${args.groupSize} Bundle`;

    const bundleId = await ctx.db.insert("ticketBundles", {
      bundleType: "SINGLE_EVENT",
      eventId: args.eventId,
      name: args.bundleName || defaultName,
      description: `Save ${args.discountPercent}% when you buy ${args.groupSize} ${tier.name} tickets together!`,
      price: bundlePrice,
      includedTiers: [
        {
          tierId: args.tierId,
          tierName: tier.name,
          quantity: args.groupSize,
          eventId: args.eventId,
          eventName: event.name,
        },
      ],
      totalQuantity: args.quantity || 25,
      sold: 0,
      regularPrice,
      savings: regularPrice - bundlePrice,
      saleEnd: args.saleEnd,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      bundleId,
      groupSize: args.groupSize,
      bundlePrice,
      regularPrice,
      savings: regularPrice - bundlePrice,
      savingsPercent: args.discountPercent,
      pricePerPerson: Math.round(bundlePrice / args.groupSize),
    };
  },
});

/**
 * VIP Bundle - Combine VIP and General Admission tickets
 *
 * Perfect for groups where some want VIP and others want GA.
 * Example: "2 VIP + 2 GA at 15% off"
 */
export const createMixedBundle = mutation({
  args: {
    eventId: v.id("events"),
    tiers: v.array(
      v.object({
        tierId: v.id("ticketTiers"),
        quantity: v.number(),
      })
    ),
    discountPercent: v.number(),
    bundleName: v.string(),
    description: v.optional(v.string()),
    quantity: v.optional(v.number()),
    saleEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Build included tiers with full details
    let regularPrice = 0;
    let totalTickets = 0;
    const includedTiers = [];

    for (const tierSpec of args.tiers) {
      const tier = await ctx.db.get(tierSpec.tierId);
      if (!tier) throw new Error(`Ticket tier ${tierSpec.tierId} not found`);

      regularPrice += tier.price * tierSpec.quantity;
      totalTickets += tierSpec.quantity;

      includedTiers.push({
        tierId: tierSpec.tierId,
        tierName: tier.name,
        quantity: tierSpec.quantity,
        eventId: args.eventId,
        eventName: event.name,
      });
    }

    const bundlePrice = Math.round(regularPrice * (1 - args.discountPercent / 100));

    const bundleId = await ctx.db.insert("ticketBundles", {
      bundleType: "SINGLE_EVENT",
      eventId: args.eventId,
      name: args.bundleName,
      description:
        args.description || `Save ${args.discountPercent}% on this mixed ticket bundle!`,
      price: bundlePrice,
      includedTiers,
      totalQuantity: args.quantity || 20,
      sold: 0,
      regularPrice,
      savings: regularPrice - bundlePrice,
      saleEnd: args.saleEnd,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      bundleId,
      totalTickets,
      bundlePrice,
      regularPrice,
      savings: regularPrice - bundlePrice,
      savingsPercent: args.discountPercent,
    };
  },
});

/**
 * Table Bundle - Create a bundle for a table with seats
 *
 * Perfect for seated events where tables are sold as units.
 */
export const createTableBundle = mutation({
  args: {
    eventId: v.id("events"),
    tierId: v.id("ticketTiers"), // Should be a table tier
    seatsPerTable: v.number(),
    discountPercent: v.number(),
    quantity: v.optional(v.number()), // Number of tables available
    bundleName: v.optional(v.string()),
    saleEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Calculate price for table (seats × seat price with discount)
    const regularPrice = tier.price * args.seatsPerTable;
    const bundlePrice = Math.round(regularPrice * (1 - args.discountPercent / 100));

    const bundleId = await ctx.db.insert("ticketBundles", {
      bundleType: "SINGLE_EVENT",
      eventId: args.eventId,
      name: args.bundleName || `Table of ${args.seatsPerTable}`,
      description: `Reserve a full table with ${args.seatsPerTable} seats and save ${args.discountPercent}%!`,
      price: bundlePrice,
      includedTiers: [
        {
          tierId: args.tierId,
          tierName: tier.name,
          quantity: args.seatsPerTable,
          eventId: args.eventId,
          eventName: event.name,
        },
      ],
      totalQuantity: args.quantity || 10,
      sold: 0,
      regularPrice,
      savings: regularPrice - bundlePrice,
      saleEnd: args.saleEnd,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      bundleId,
      seatsPerTable: args.seatsPerTable,
      bundlePrice,
      regularPrice,
      pricePerSeat: Math.round(bundlePrice / args.seatsPerTable),
      savings: regularPrice - bundlePrice,
      savingsPercent: args.discountPercent,
    };
  },
});
