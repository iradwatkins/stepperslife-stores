import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all discount codes for an event (organizer only)
 */
export const getEventDiscountCodes = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // PRODUCTION: Require authentication
    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to manage discount codes.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Verify user owns the event or is admin
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const isOrganizer = event.organizerId === user._id;
    const isAdmin = user.role === "admin";

    if (!isOrganizer && !isAdmin) {
      throw new Error("Not authorized");
    }

    const discountCodes = await ctx.db
      .query("discountCodes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return discountCodes;
  },
});

/**
 * Validate and get discount code details (public - for checkout)
 */
export const validateDiscountCode = query({
  args: {
    eventId: v.id("events"),
    code: v.string(),
    userEmail: v.string(),
    orderTotalCents: v.number(),
    selectedTierIds: v.optional(v.array(v.id("ticketTiers"))),
  },
  handler: async (ctx, args) => {
    const discountCode = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .first();

    if (!discountCode) {
      return { valid: false, error: "Invalid discount code" };
    }

    if (!discountCode.isActive) {
      return { valid: false, error: "This discount code is no longer active" };
    }

    const now = Date.now();

    // Check validity period
    if (discountCode.validFrom && now < discountCode.validFrom) {
      return { valid: false, error: "This discount code is not yet valid" };
    }

    if (discountCode.validUntil && now > discountCode.validUntil) {
      return { valid: false, error: "This discount code has expired" };
    }

    // Check max uses
    if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
      return { valid: false, error: "This discount code has reached its usage limit" };
    }

    // Check max uses per user
    if (discountCode.maxUsesPerUser) {
      const userUsageCount = await ctx.db
        .query("discountCodeUsage")
        .withIndex("by_user_email", (q) => q.eq("userEmail", args.userEmail))
        .filter((q) => q.eq(q.field("discountCodeId"), discountCode._id))
        .collect();

      if (userUsageCount.length >= discountCode.maxUsesPerUser) {
        return {
          valid: false,
          error: "You have already used this discount code the maximum number of times",
        };
      }
    }

    // Check minimum purchase amount
    if (discountCode.minPurchaseAmount && args.orderTotalCents < discountCode.minPurchaseAmount) {
      return {
        valid: false,
        error: `Minimum purchase of $${(discountCode.minPurchaseAmount / 100).toFixed(2)} required for this code`,
      };
    }

    // Check tier restrictions
    if (discountCode.applicableToTierIds && discountCode.applicableToTierIds.length > 0) {
      if (!args.selectedTierIds || args.selectedTierIds.length === 0) {
        return { valid: false, error: "This code is only valid for specific ticket types" };
      }

      const hasApplicableTier = args.selectedTierIds.some((tierId) =>
        discountCode.applicableToTierIds!.includes(tierId)
      );

      if (!hasApplicableTier) {
        return { valid: false, error: "This code is not valid for the selected ticket types" };
      }
    }

    // Calculate discount amount
    let discountAmountCents = 0;

    if (discountCode.discountType === "PERCENTAGE") {
      discountAmountCents = Math.round((args.orderTotalCents * discountCode.discountValue) / 100);
    } else if (discountCode.discountType === "FIXED_AMOUNT") {
      discountAmountCents = discountCode.discountValue;
    }

    // Discount cannot exceed order total
    discountAmountCents = Math.min(discountAmountCents, args.orderTotalCents);

    return {
      valid: true,
      discountCode: {
        _id: discountCode._id,
        code: discountCode.code,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        discountAmountCents,
      },
    };
  },
});

/**
 * Get discount code usage statistics
 */
export const getDiscountCodeStats = query({
  args: {
    discountCodeId: v.id("discountCodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    const discountCode = await ctx.db.get(args.discountCodeId);
    if (!discountCode) {
      throw new Error("Discount code not found");
    }

    const isOrganizer = discountCode.organizerId === user._id;
    const isAdmin = user.role === "admin";

    if (!isOrganizer && !isAdmin) {
      throw new Error("Not authorized");
    }

    const usageRecords = await ctx.db
      .query("discountCodeUsage")
      .withIndex("by_code", (q) => q.eq("discountCodeId", args.discountCodeId))
      .collect();

    const totalDiscountGiven = usageRecords.reduce(
      (sum, record) => sum + record.discountAmountCents,
      0
    );

    return {
      usedCount: discountCode.usedCount,
      maxUses: discountCode.maxUses,
      totalDiscountGiven,
      recentUsage: usageRecords.slice(-10).reverse(), // Last 10 uses
    };
  },
});
