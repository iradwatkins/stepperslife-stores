import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Fee constants
const DEFAULT_PLATFORM_FEE_PERCENT = 3.7;
const DEFAULT_PLATFORM_FEE_FIXED_CENTS = 179; // $1.79
const DEFAULT_PROCESSING_FEE_PERCENT = 2.9;

/**
 * Select Prepay payment model for event (pay upfront for tickets)
 */
export const selectPrepayModel = mutation({
  args: {
    eventId: v.id("events"),
    ticketsAllocated: v.number(),
    customerPaymentMethods: v.array(
      v.union(
        v.literal("CASH"),
        v.literal("STRIPE"),
        v.literal("PAYPAL"),
        v.literal("CASHAPP")
      )
    ),
    organizerPaymentMethod: v.optional(
      v.union(v.literal("SQUARE"), v.literal("CASHAPP"), v.literal("PAYPAL"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify event ownership
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    // Check if config already exists
    const existing = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      throw new Error("Payment model already configured for this event");
    }

    // Validate at least one payment method is selected
    if (args.customerPaymentMethods.length === 0) {
      throw new Error("At least one customer payment method must be selected");
    }

    // Check if Stripe/PayPal are selected but not connected
    if (args.customerPaymentMethods.includes("STRIPE") && !user.stripeConnectedAccountId) {
      throw new Error("Stripe account not connected. Please connect Stripe in Settings.");
    }

    if (
      (args.customerPaymentMethods.includes("PAYPAL") ||
        args.customerPaymentMethods.includes("CASHAPP")) &&
      !user.paypalMerchantId
    ) {
      throw new Error(
        "PayPal account not connected. Please connect PayPal in Settings for PayPal/CashApp payments."
      );
    }

    // Check credit balance
    const credits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    const availableCredits = credits ? credits.creditsRemaining : 0;

    if (availableCredits < args.ticketsAllocated) {
      throw new Error(
        `Insufficient credits. Available: ${availableCredits}, Needed: ${args.ticketsAllocated}`
      );
    }

    // Create payment config
    const configId = await ctx.db.insert("eventPaymentConfig", {
      eventId: args.eventId,
      organizerId: user._id,
      paymentModel: "PREPAY",
      customerPaymentMethods: args.customerPaymentMethods,
      organizerPaymentMethod: args.organizerPaymentMethod,
      stripeConnectAccountId: user.stripeConnectedAccountId,
      paypalMerchantId: user.paypalMerchantId,
      isActive: true,
      activatedAt: Date.now(),
      ticketsAllocated: args.ticketsAllocated,
      platformFeePercent: 0, // No additional fees for prepay model
      platformFeeFixed: 0,
      processingFeePercent: DEFAULT_PROCESSING_FEE_PERCENT, // Only Stripe processing
      charityDiscount: false,
      lowPriceDiscount: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update event
    await ctx.db.patch(args.eventId, {
      paymentModelSelected: true,
      ticketsVisible: true,
      updatedAt: Date.now(),
    });

    // Reserve credits (they'll be deducted as tickets sell)
    // Note: Credits are used when orders are completed, not upfront

    return { configId, success: true };
  },
});

/**
 * Select Credit Card payment model for event (split payments with automatic fees)
 * For CREDIT_CARD model, Stripe is the only supported payment method
 */
export const selectCreditCardModel = mutation({
  args: {
    eventId: v.id("events"),
    charityDiscount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify event ownership
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    // Check if config already exists
    const existing = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      throw new Error("Payment model already configured for this event");
    }

    // Check if Stripe Connect is set up
    if (!user.stripeConnectedAccountId || !user.stripeAccountSetupComplete) {
      throw new Error("Stripe Connect account required for Credit Card payment model");
    }

    // Calculate fees (apply 50% discount if charity)
    const isCharity = args.charityDiscount || false;
    const platformFeePercent = isCharity
      ? DEFAULT_PLATFORM_FEE_PERCENT / 2
      : DEFAULT_PLATFORM_FEE_PERCENT;
    const platformFeeFixed = isCharity
      ? Math.round(DEFAULT_PLATFORM_FEE_FIXED_CENTS / 2)
      : DEFAULT_PLATFORM_FEE_FIXED_CENTS;

    // Create payment config
    // CREDIT_CARD model only uses Stripe (automatic split payment)
    const configId = await ctx.db.insert("eventPaymentConfig", {
      eventId: args.eventId,
      organizerId: user._id,
      paymentModel: "CREDIT_CARD",
      customerPaymentMethods: ["STRIPE"], // Only Stripe for split payment model
      stripeConnectAccountId: user.stripeConnectedAccountId,
      isActive: true,
      activatedAt: Date.now(),
      platformFeePercent,
      platformFeeFixed,
      processingFeePercent: DEFAULT_PROCESSING_FEE_PERCENT,
      charityDiscount: isCharity,
      lowPriceDiscount: false, // TODO: Implement low-price detection
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update event
    await ctx.db.patch(args.eventId, {
      paymentModelSelected: true,
      ticketsVisible: true,
      updatedAt: Date.now(),
    });

    return { configId, success: true };
  },
});

/**
 * Calculate fees for an order based on payment config
 */
export const calculateOrderFees = mutation({
  args: {
    eventId: v.id("events"),
    subtotal: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!config) {
      throw new Error("Payment configuration not found");
    }

    let platformFee = 0;
    let processingFee = 0;

    if (config.paymentModel === "CREDIT_CARD") {
      // Calculate platform fee: percentage + fixed
      platformFee =
        Math.round((args.subtotal * config.platformFeePercent) / 100) + config.platformFeeFixed;

      // Calculate processing fee on total (subtotal + platform fee)
      const totalBeforeProcessing = args.subtotal + platformFee;
      processingFee = Math.round((totalBeforeProcessing * config.processingFeePercent) / 100);
    } else {
      // Prepay model: only Stripe processing fee
      processingFee = Math.round((args.subtotal * config.processingFeePercent) / 100);
    }

    const totalAmount = args.subtotal + platformFee + processingFee;

    return {
      subtotal: args.subtotal,
      platformFee,
      processingFee,
      totalAmount,
      paymentModel: config.paymentModel,
    };
  },
});

/**
 * Apply low-price discount to payment config
 */
export const applyLowPriceDiscount = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!config) {
      throw new Error("Payment configuration not found");
    }

    if (config.paymentModel !== "CREDIT_CARD") {
      throw new Error("Low-price discount only applies to Credit Card payment model");
    }

    // Apply 50% discount
    const newPlatformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT / 2;
    const newPlatformFeeFixed = Math.round(DEFAULT_PLATFORM_FEE_FIXED_CENTS / 2);

    await ctx.db.patch(config._id, {
      platformFeePercent: newPlatformFeePercent,
      platformFeeFixed: newPlatformFeeFixed,
      lowPriceDiscount: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Deactivate payment config
 */
export const deactivatePaymentConfig = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!config) {
      throw new Error("Payment configuration not found");
    }

    await ctx.db.patch(config._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.eventId, {
      ticketsVisible: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update payment methods (merchant processor and payment options)
 */
export const updatePaymentMethods = mutation({
  args: {
    eventId: v.id("events"),
    merchantProcessor: v.union(v.literal("STRIPE"), v.literal("PAYPAL")),
    creditCardEnabled: v.boolean(),
    cashAppEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify event ownership
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    // Get payment config
    const config = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!config) {
      throw new Error("Payment configuration not found for this event");
    }

    // Update payment config
    // Note: creditCardEnabled and cashAppEnabled are managed via customerPaymentMethods array
    await ctx.db.patch(config._id, {
      merchantProcessor: args.merchantProcessor,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
