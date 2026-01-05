import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { requireEventOwnership } from "../lib/auth";

// Constants
const FIRST_EVENT_FREE_TICKETS = 1000; // First event gets 1000 FREE tickets (ONE-TIME, EXPIRES WITH EVENT)
const PRICE_PER_TICKET_CENTS = 30; // $0.30 per ticket for subsequent events

/**
 * Allocate tickets to an event
 * - First event: Automatically gets 1000 FREE tickets (EXPIRES WHEN EVENT ENDS)
 * - Subsequent events: Requires prepaid purchase
 * - Unused first-event credits DO NOT carry over to other events
 */
export const allocateEventTickets = mutation({
  args: {
    eventId: v.id("events"),
    ticketQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify ownership (handles both organizers and admins)
    const { user, event } = await requireEventOwnership(ctx, args.eventId);

    // Check if this is the organizer's first event
    const allOrganizerEvents = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const isFirstEvent =
      allOrganizerEvents.length === 1 && allOrganizerEvents[0]._id === args.eventId;

    // Check if allocation already exists
    const existingConfig = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existingConfig && existingConfig.ticketsAllocated) {
      throw new Error(
        `This event already has ${existingConfig.ticketsAllocated} tickets allocated. ` +
          `Use the ticket management interface to adjust quantities.`
      );
    }

    // Get organizer credits
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!credits) {
      throw new Error(
        `No credit balance found. Please contact support to initialize your account.`
      );
    }

    // Check if organizer has enough credits
    if (credits.creditsRemaining < args.ticketQuantity) {
      throw new Error(
        `Insufficient credits! You have ${credits.creditsRemaining} credits remaining, but you need ${args.ticketQuantity}. ` +
          `You need ${args.ticketQuantity - credits.creditsRemaining} more credits ($${(((args.ticketQuantity - credits.creditsRemaining) * PRICE_PER_TICKET_CENTS) / 100).toFixed(2)} at $0.30 each). ` +
          `Please visit the Credits page to purchase additional tickets.`
      );
    }

    // First event: Use FREE credits
    if (isFirstEvent) {
      if (args.ticketQuantity > FIRST_EVENT_FREE_TICKETS) {
        throw new Error(
          `Your first event gets ${FIRST_EVENT_FREE_TICKETS} FREE tickets (risk-free trial). ` +
            `You requested ${args.ticketQuantity} tickets. Please reduce your quantity to ${FIRST_EVENT_FREE_TICKETS} or less.`
        );
      }

      // Create or update payment config with free allocation
      if (existingConfig) {
        await ctx.db.patch(existingConfig._id, {
          ticketsAllocated: args.ticketQuantity,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("eventPaymentConfig", {
          eventId: args.eventId,
          organizerId: user._id,
          paymentModel: "PREPAY",
          ticketsAllocated: args.ticketQuantity,
          // Allow all customer payment methods for PREPAY (organizer receives 100%, no split needed)
          customerPaymentMethods: ["CASH", "STRIPE", "PAYPAL"],
          stripeConnectAccountId: user.stripeConnectedAccountId,
          paypalMerchantId: user.paypalMerchantId,
          isActive: true,
          activatedAt: Date.now(),
          platformFeePercent: 0,
          platformFeeFixed: 0,
          processingFeePercent: 0,
          charityDiscount: false,
          lowPriceDiscount: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Subtract tickets from global credit balance and link to this event
      await ctx.db.patch(credits._id, {
        creditsUsed: credits.creditsUsed + args.ticketQuantity,
        creditsRemaining: credits.creditsRemaining - args.ticketQuantity,
        firstEventFreeUsed: true,
        firstEventId: args.eventId, // Link credits to this specific event
        updatedAt: Date.now(),
      });

      return {
        success: true,
        allocated: args.ticketQuantity,
        isFree: true,
        isFirstEvent: true,
        remainingCredits: credits.creditsRemaining - args.ticketQuantity,
        message: `Congratulations! Allocated ${args.ticketQuantity} FREE tickets to your first event. You have ${credits.creditsRemaining - args.ticketQuantity} credits remaining.`,
      };
    }

    // Subsequent events: Use remaining credits (must be prepurchased)
    // Create or update payment config
    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        ticketsAllocated: args.ticketQuantity,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("eventPaymentConfig", {
        eventId: args.eventId,
        organizerId: user._id,
        paymentModel: "PREPAY",
        ticketsAllocated: args.ticketQuantity,
        // Allow all customer payment methods for PREPAY (organizer receives 100%, no split needed)
        customerPaymentMethods: ["CASH", "STRIPE", "PAYPAL"],
        stripeConnectAccountId: user.stripeConnectedAccountId,
        paypalMerchantId: user.paypalMerchantId,
        isActive: true,
        activatedAt: Date.now(),
        platformFeePercent: 0,
        platformFeeFixed: 0,
        processingFeePercent: 0,
        charityDiscount: false,
        lowPriceDiscount: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Subtract tickets from global credit balance
    await ctx.db.patch(credits._id, {
      creditsUsed: credits.creditsUsed + args.ticketQuantity,
      creditsRemaining: credits.creditsRemaining - args.ticketQuantity,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      allocated: args.ticketQuantity,
      isFree: false,
      isFirstEvent: false,
      remainingCredits: credits.creditsRemaining - args.ticketQuantity,
      message: `Allocated ${args.ticketQuantity} tickets to your event. You have ${credits.creditsRemaining - args.ticketQuantity} credits remaining.`,
    };
  },
});

/**
 * Get ticket allocation for a specific event
 */
export const getEventAllocation = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!config || !config.ticketsAllocated) {
      return {
        allocated: 0,
        used: 0,
        remaining: 0,
        hasAllocation: false,
      };
    }

    // Calculate tickets used by counting all ticket tiers for this event
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalAllocated = tiers.reduce((sum, tier) => sum + tier.quantity, 0);
    const totalSold = tiers.reduce((sum, tier) => sum + tier.sold, 0);

    return {
      allocated: config.ticketsAllocated,
      used: totalAllocated,
      remaining: config.ticketsAllocated - totalAllocated,
      sold: totalSold,
      hasAllocation: true,
    };
  },
});

/**
 * Get all event allocations for an organizer
 */
export const getOrganizerAllocations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    // Get all events for this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    // Get allocation for each event
    const allocations = await Promise.all(
      events.map(async (event) => {
        const config = await ctx.db
          .query("eventPaymentConfig")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .first();

        if (!config || !config.ticketsAllocated) {
          return {
            eventId: event._id,
            eventName: event.name,
            allocated: 0,
            used: 0,
            remaining: 0,
            hasAllocation: false,
          };
        }

        // Count tickets created for this event
        const tiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const totalAllocated = tiers.reduce((sum, tier) => sum + tier.quantity, 0);
        const totalSold = tiers.reduce((sum, tier) => sum + tier.sold, 0);

        return {
          eventId: event._id,
          eventName: event.name,
          allocated: config.ticketsAllocated,
          used: totalAllocated,
          remaining: config.ticketsAllocated - totalAllocated,
          sold: totalSold,
          hasAllocation: true,
        };
      })
    );

    return allocations;
  },
});

/**
 * Check if organizer has used their first event free tickets
 */
export const hasUsedFirstEventFree = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return true; // Assume used if not logged in

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return true;

    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    return credits?.firstEventFreeUsed ?? false;
  },
});

/**
 * Purchase prepaid tickets for an event (subsequent events after first)
 */
export const purchaseEventTickets = mutation({
  args: {
    eventId: v.id("events"),
    ticketQuantity: v.number(),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership (handles both organizers and admins)
    const { user } = await requireEventOwnership(ctx, args.eventId);

    // Calculate cost
    const totalCostCents = args.ticketQuantity * PRICE_PER_TICKET_CENTS;

    // Create transaction record
    const transactionId = await ctx.db.insert("creditTransactions", {
      organizerId: user._id,
      ticketsPurchased: args.ticketQuantity,
      amountPaid: totalCostCents,
      pricePerTicket: PRICE_PER_TICKET_CENTS,
      stripePaymentIntentId: args.stripePaymentIntentId,
      status: "PENDING",
      purchasedAt: Date.now(),
    });

    return {
      success: true,
      transactionId,
      amountPaid: totalCostCents,
      ticketQuantity: args.ticketQuantity,
      eventId: args.eventId,
    };
  },
});

/**
 * Create event payment config directly (for admin/migration use)
 * INTERNAL USE ONLY - No auth check for migration scripts
 */
export const createEventPaymentConfig = mutation({
  args: {
    eventId: v.id("events"),
    organizerId: v.id("users"),
    ticketsAllocated: v.number(),
    paymentModel: v.union(
      v.literal("PREPAY"),
      v.literal("CREDIT_CARD"),
      v.literal("PRE_PURCHASE"),
      v.literal("PAY_AS_SELL")
    ),
  },
  handler: async (ctx, args) => {
    // Check if config already exists
    const existing = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      // Update existing config
      await ctx.db.patch(existing._id, {
        ticketsAllocated: args.ticketsAllocated,
        updatedAt: Date.now(),
      });
      return { success: true, configId: existing._id, action: "updated" };
    }

    // Create new config
    // Note: For admin/migration use, we set all payment methods but organizer accounts may not be connected
    const configId = await ctx.db.insert("eventPaymentConfig", {
      eventId: args.eventId,
      organizerId: args.organizerId,
      paymentModel: args.paymentModel,
      ticketsAllocated: args.ticketsAllocated,
      // Allow all customer payment methods for PREPAY (organizer receives 100%, no split needed)
      customerPaymentMethods: ["CASH", "STRIPE", "PAYPAL"],
      isActive: true,
      activatedAt: Date.now(),
      platformFeePercent: 0,
      platformFeeFixed: 0,
      processingFeePercent: 0,
      charityDiscount: false,
      lowPriceDiscount: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, configId, action: "created" };
  },
});

/**
 * Confirm prepaid ticket purchase after Stripe payment succeeds
 * Allocates purchased tickets to the specific event
 */
export const confirmEventTicketPurchase = mutation({
  args: {
    stripePaymentIntentId: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Find transaction
    const transaction = await ctx.db
      .query("creditTransactions")
      .filter((q) => q.eq(q.field("stripePaymentIntentId"), args.stripePaymentIntentId))
      .first();

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === "COMPLETED") {
      return { success: true, message: "Already completed" };
    }

    // Update transaction status
    await ctx.db.patch(transaction._id, {
      status: "COMPLETED",
    });

    // Get or create event payment config
    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!config) {
      // Get organizer's payment accounts for the config
      const organizer = await ctx.db.get(transaction.organizerId);

      // Create new config with purchased allocation
      const configId = await ctx.db.insert("eventPaymentConfig", {
        eventId: args.eventId,
        organizerId: transaction.organizerId,
        paymentModel: "PREPAY",
        ticketsAllocated: transaction.ticketsPurchased,
        // Allow all customer payment methods for PREPAY (organizer receives 100%, no split needed)
        customerPaymentMethods: ["CASH", "STRIPE", "PAYPAL"],
        stripeConnectAccountId: organizer?.stripeConnectedAccountId,
        paypalMerchantId: organizer?.paypalMerchantId,
        isActive: true,
        activatedAt: Date.now(),
        platformFeePercent: 0,
        platformFeeFixed: 0,
        processingFeePercent: 0,
        charityDiscount: false,
        lowPriceDiscount: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return {
        success: true,
        configId,
        allocated: transaction.ticketsPurchased,
      };
    }

    // Add to existing allocation
    const newAllocation = (config.ticketsAllocated || 0) + transaction.ticketsPurchased;
    await ctx.db.patch(config._id, {
      ticketsAllocated: newAllocation,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      configId: config._id,
      allocated: newAllocation,
    };
  },
});

/**
 * Expire unused first-event free credits when event ends
 * Should be called when event status changes to CANCELLED or COMPLETED
 * INTERNAL MUTATION - called via scheduler from updateEventStatus
 */
export const expireFirstEventCredits = internalMutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {

    // Find credits linked to this event
    const creditsRecord = await ctx.db
      .query("organizerCredits")
      .filter((q) => q.eq(q.field("firstEventId"), args.eventId))
      .first();

    if (!creditsRecord) {
      return { success: true, expired: 0, message: "No credits linked to this event" };
    }

    // Check if there are any remaining credits from the first event free allocation
    if (creditsRecord.creditsRemaining <= 0) {
      return { success: true, expired: 0, message: "No remaining credits to expire" };
    }

    // Get event payment config to see how many tickets were actually allocated
    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!config) {
      return { success: true, expired: 0, message: "No payment config found" };
    }

    // Calculate unused credits for this specific event
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalAllocated = tiers.reduce((sum, tier) => sum + tier.quantity, 0);
    const unusedForThisEvent = (config.ticketsAllocated || 0) - totalAllocated;

    if (unusedForThisEvent <= 0) {
      return {
        success: true,
        expired: 0,
        message: "All allocated tickets for this event were used",
      };
    }

    // Expire the unused credits
    const expiredAmount = Math.min(unusedForThisEvent, creditsRecord.creditsRemaining);

    await ctx.db.patch(creditsRecord._id, {
      creditsRemaining: creditsRecord.creditsRemaining - expiredAmount,
      updatedAt: Date.now(),
    });


    return {
      success: true,
      expired: expiredAmount,
      remainingCredits: creditsRecord.creditsRemaining - expiredAmount,
      message: `Expired ${expiredAmount} unused first-event credits. Event has ended.`,
    };
  },
});
