import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Constants
const FIRST_EVENT_FREE_TICKETS = 1000; // First 1,000 tickets are FREE!
const PRICE_PER_TICKET_CENTS = 30; // $0.30 per ticket

/**
 * Initialize credit balance for new organizer
 */
export const initializeCredits = mutation({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if credits already exist
    const existing = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new credit account with first event free tickets
    const creditId = await ctx.db.insert("organizerCredits", {
      organizerId: args.organizerId,
      creditsTotal: FIRST_EVENT_FREE_TICKETS,
      creditsUsed: 0,
      creditsRemaining: FIRST_EVENT_FREE_TICKETS,
      firstEventFreeUsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return creditId;
  },
});

/**
 * Purchase additional ticket credits via Stripe or PayPal
 */
export const purchaseCredits = mutation({
  args: {
    userId: v.id("users"),
    credits: v.number(),
    amountPaid: v.number(),
    squarePaymentId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user's current credit balance
    let userCredits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.userId))
      .first();

    // Initialize credits if they don't exist
    if (!userCredits) {
      const creditId = await ctx.db.insert("organizerCredits", {
        organizerId: args.userId,
        creditsTotal: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
        firstEventFreeUsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      userCredits = await ctx.db.get(creditId);
      if (!userCredits) {
        throw new Error("Failed to initialize user credits");
      }
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("creditTransactions", {
      organizerId: args.userId,
      ticketsPurchased: args.credits,
      amountPaid: args.amountPaid,
      pricePerTicket: PRICE_PER_TICKET_CENTS,
      squarePaymentId: args.squarePaymentId,
      paypalOrderId: args.paypalOrderId,
      status: "COMPLETED",
      purchasedAt: Date.now(),
    });

    // Add credits to user balance
    await ctx.db.patch(userCredits._id, {
      creditsTotal: userCredits.creditsTotal + args.credits,
      creditsRemaining: userCredits.creditsRemaining + args.credits,
      updatedAt: Date.now(),
    });

    return {
      transactionId,
      newBalance: userCredits.creditsTotal + args.credits,
    };
  },
});

/**
 * Create a pending credit purchase transaction
 * Called when Stripe payment intent is created (before payment)
 */
export const createPendingCreditPurchase = mutation({
  args: {
    organizerId: v.id("users"),
    ticketsPurchased: v.number(),
    amountPaid: v.number(),
    pricePerTicket: v.number(),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if transaction already exists (idempotency)
    const existing = await ctx.db
      .query("creditTransactions")
      .filter((q) => q.eq(q.field("stripePaymentIntentId"), args.stripePaymentIntentId))
      .first();

    if (existing) {
      return { transactionId: existing._id, alreadyExists: true };
    }

    // Create pending transaction record
    const transactionId = await ctx.db.insert("creditTransactions", {
      organizerId: args.organizerId,
      ticketsPurchased: args.ticketsPurchased,
      amountPaid: args.amountPaid,
      pricePerTicket: args.pricePerTicket,
      stripePaymentIntentId: args.stripePaymentIntentId,
      status: "PENDING",
      purchasedAt: Date.now(),
    });

    return { transactionId, alreadyExists: false };
  },
});

/**
 * Confirm credit purchase after Stripe webhook
 * Can work with or without a pre-existing pending transaction
 */
export const confirmCreditPurchase = mutation({
  args: {
    organizerId: v.id("users"),
    stripePaymentIntentId: v.string(),
    ticketsPurchased: v.number(),
    amountPaid: v.number(),
    pricePerTicket: v.number(),
  },
  handler: async (ctx, args) => {
    // Find existing transaction (if created during payment intent creation)
    let transaction = await ctx.db
      .query("creditTransactions")
      .filter((q) => q.eq(q.field("stripePaymentIntentId"), args.stripePaymentIntentId))
      .first();

    if (transaction) {
      // Transaction exists - check if already completed
      if (transaction.status === "COMPLETED") {
        return { success: true, message: "Already completed", creditId: null };
      }

      // Update transaction status to completed
      await ctx.db.patch(transaction._id, {
        status: "COMPLETED",
      });
    } else {
      // No pending transaction - create a completed one directly
      // This can happen if the pending creation failed or webhook arrives first
      await ctx.db.insert("creditTransactions", {
        organizerId: args.organizerId,
        ticketsPurchased: args.ticketsPurchased,
        amountPaid: args.amountPaid,
        pricePerTicket: args.pricePerTicket,
        stripePaymentIntentId: args.stripePaymentIntentId,
        status: "COMPLETED",
        purchasedAt: Date.now(),
      });
    }

    // Get or create credit balance
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!credits) {
      // Initialize if doesn't exist
      const creditId = await ctx.db.insert("organizerCredits", {
        organizerId: args.organizerId,
        creditsTotal: args.ticketsPurchased,
        creditsUsed: 0,
        creditsRemaining: args.ticketsPurchased,
        firstEventFreeUsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true, creditId };
    }

    // Add purchased credits to balance
    await ctx.db.patch(credits._id, {
      creditsTotal: credits.creditsTotal + args.ticketsPurchased,
      creditsRemaining: credits.creditsRemaining + args.ticketsPurchased,
      updatedAt: Date.now(),
    });

    return { success: true, creditId: credits._id };
  },
});

/**
 * Use credits when ticket is sold (called from order completion)
 */
export const useCredits = mutation({
  args: {
    organizerId: v.id("users"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!credits) {
      throw new Error("No credit balance found");
    }

    if (credits.creditsRemaining < args.quantity) {
      throw new Error(
        `Insufficient credits. Available: ${credits.creditsRemaining}, Needed: ${args.quantity}`
      );
    }

    // Deduct credits
    await ctx.db.patch(credits._id, {
      creditsUsed: credits.creditsUsed + args.quantity,
      creditsRemaining: credits.creditsRemaining - args.quantity,
      updatedAt: Date.now(),
    });

    return { success: true, remaining: credits.creditsRemaining - args.quantity };
  },
});

/**
 * Mark first event free tickets as used
 */
export const markFirstEventUsed = mutation({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!credits) {
      throw new Error("No credit balance found");
    }

    await ctx.db.patch(credits._id, {
      firstEventFreeUsed: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Purchase tickets for an event using credits
 * This is an atomic operation that deducts credits and increases event capacity
 */
export const purchaseTicketsForEvent = mutation({
  args: {
    eventId: v.id("events"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized - must be logged in");
    }

    const userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    const email = userInfo.email || identity.email;
    if (!email) {
      throw new Error("Invalid authentication token");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.organizerId !== user._id) {
      throw new Error("You can only purchase tickets for your own events");
    }

    // Check credit balance
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!credits) {
      throw new Error("No credit balance found. Please purchase credits first.");
    }

    if (credits.creditsRemaining < args.quantity) {
      throw new Error(
        `Insufficient credits. Available: ${credits.creditsRemaining}, Needed: ${args.quantity}`
      );
    }

    // Deduct credits
    await ctx.db.patch(credits._id, {
      creditsUsed: credits.creditsUsed + args.quantity,
      creditsRemaining: credits.creditsRemaining - args.quantity,
      updatedAt: Date.now(),
    });

    // Increase event capacity
    const currentCapacity = event.capacity || 0;
    await ctx.db.patch(args.eventId, {
      capacity: currentCapacity + args.quantity,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      ticketsPurchased: args.quantity,
      newCapacity: currentCapacity + args.quantity,
      creditsRemaining: credits.creditsRemaining - args.quantity,
    };
  },
});

/**
 * Reset organizer credits to 1000 (for fixing accounts created with wrong initial value)
 */
export const resetToFreeCredits = mutation({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .first();

    if (!credits) {
      throw new Error("No credit balance found");
    }

    // Reset to 1000 free credits
    await ctx.db.patch(credits._id, {
      creditsTotal: FIRST_EVENT_FREE_TICKETS,
      creditsUsed: 0,
      creditsRemaining: FIRST_EVENT_FREE_TICKETS,
      firstEventFreeUsed: false,
      updatedAt: Date.now(),
    });

    return { success: true, credits: FIRST_EVENT_FREE_TICKETS };
  },
});
