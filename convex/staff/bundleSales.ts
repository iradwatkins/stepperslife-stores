/**
 * Staff Bundle Sales
 * Allow staff to sell bundles from their tier-specific inventory
 */

import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get authenticated user - requires valid authentication
 * @throws Error if not authenticated
 */
async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) {
    throw new Error("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Internal helper function to check bundle eligibility
 * Can be called from both queries and mutations
 */
async function checkBundleEligibility(
  ctx: QueryCtx | MutationCtx,
  staffId: Id<"eventStaff">,
  bundleId: Id<"ticketBundles">
) {
  // Get bundle
  const bundle = await ctx.db.get(bundleId);
  if (!bundle) {
    return { canSell: false, reason: "Bundle not found" };
  }

  // Get staff allocations
  const allocations = await ctx.db
    .query("staffTierAllocations")
    .withIndex("by_staff", (q) => q.eq("staffId", staffId))
    .collect();

  // Check if staff has allocations for all required tiers
  const missingTiers: string[] = [];
  const insufficientTiers: Array<{ name: string; has: number; needs: number }> = [];

  for (const includedTier of bundle.includedTiers) {
    const allocation = allocations.find((a) => a.tierId === includedTier.tierId);

    if (!allocation) {
      // Get tier name for better error message
      const tier = await ctx.db.get(includedTier.tierId);
      missingTiers.push(tier?.name || "Unknown Tier");
    } else if (allocation.remainingQuantity < includedTier.quantity) {
      const tier = await ctx.db.get(includedTier.tierId);
      insufficientTiers.push({
        name: tier?.name || "Unknown Tier",
        has: allocation.remainingQuantity,
        needs: includedTier.quantity,
      });
    }
  }

  if (missingTiers.length > 0) {
    return {
      canSell: false,
      reason: `Missing allocations for: ${missingTiers.join(", ")}`,
      missingTiers,
    };
  }

  if (insufficientTiers.length > 0) {
    return {
      canSell: false,
      reason: `Insufficient tickets for: ${insufficientTiers.map((t) => `${t.name} (has ${t.has}, needs ${t.needs})`).join(", ")}`,
      insufficientTiers,
    };
  }

  return { canSell: true, reason: "Staff has all required tickets" };
}

/**
 * Check if staff can sell a specific bundle
 * Validates they have at least 1 ticket from each required tier
 */
export const canStaffSellBundle = query({
  args: {
    staffId: v.id("eventStaff"),
    bundleId: v.id("ticketBundles"),
  },
  handler: async (ctx, args) => {
    return await checkBundleEligibility(ctx, args.staffId, args.bundleId);
  },
});

/**
 * Get all bundles a staff member is eligible to sell
 */
export const getStaffEligibleBundles = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    // Get staff member
    const staff = await ctx.db.get(args.staffId);
    if (!staff || !staff.eventId) {
      return [];
    }

    // Get all bundles for this event
    const bundles = await ctx.db
      .query("ticketBundles")
      .filter((q) => q.eq(q.field("eventId"), staff.eventId))
      .collect();

    // Check eligibility for each
    const eligibilityChecks = await Promise.all(
      bundles.map(async (bundle) => {
        const check = await checkBundleEligibility(ctx, args.staffId, bundle._id);

        return {
          bundle: {
            _id: bundle._id,
            name: bundle.name,
            price: bundle.price,
            regularPrice: bundle.regularPrice,
            savings: bundle.savings,
            includedTiers: bundle.includedTiers,
          },
          ...check,
        };
      })
    );

    return eligibilityChecks;
  },
});

/**
 * Create a bundle sale by staff member
 * Deducts from tier-specific allocations and creates tickets
 */
export const createStaffBundleSale = mutation({
  args: {
    staffId: v.id("eventStaff"),
    bundleId: v.id("ticketBundles"),
    buyerName: v.string(),
    buyerEmail: v.string(),
    paymentMethod: v.union(v.literal("CASH"), v.literal("CASH_APP")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Get staff member
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify staff has an event assigned
    if (!staff.eventId) {
      throw new Error("Staff member must be assigned to a specific event");
    }

    // Verify user is the staff member or organizer
    if (staff.staffUserId !== user._id && staff.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    // Get bundle
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) {
      throw new Error("Bundle not found");
    }

    // Verify bundle belongs to staff's event
    if (bundle.eventId !== staff.eventId) {
      throw new Error("Bundle does not belong to staff member's event");
    }

    // Check if staff can sell this bundle
    const eligibility = await checkBundleEligibility(ctx, args.staffId, args.bundleId);

    if (!eligibility.canSell) {
      throw new Error(`Cannot sell bundle: ${eligibility.reason}`);
    }

    const now = Date.now();

    // Create order
    const orderId = await ctx.db.insert("orders", {
      eventId: staff.eventId,
      buyerId: staff.staffUserId, // Staff member acts as buyer proxy
      buyerEmail: args.buyerEmail,
      buyerName: args.buyerName,
      status: "COMPLETED", // Staff sales are instant
      subtotalCents: bundle.price,
      platformFeeCents: 0,
      processingFeeCents: 0,
      totalCents: bundle.price,
      paidAt: now,
      paymentMethod: args.paymentMethod,
      soldByStaffId: args.staffId,
      bundleId: args.bundleId,
      isBundlePurchase: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create tickets for each tier in the bundle
    const ticketIds: Id<"tickets">[] = [];
    let totalCommission = 0;

    for (const includedTier of bundle.includedTiers) {
      // Get tier details
      const tier = await ctx.db.get(includedTier.tierId);
      if (!tier) {
        throw new Error(`Tier ${includedTier.tierId} not found`);
      }

      // Create tickets for this tier
      for (let i = 0; i < includedTier.quantity; i++) {
        // Generate unique ticket code
        const ticketCode =
          `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase();

        // Calculate pro-rated price for this ticket
        const proRatedPrice = Math.floor(
          bundle.price / bundle.includedTiers.reduce((sum, t) => sum + t.quantity, 0)
        );

        const ticketId = await ctx.db.insert("tickets", {
          eventId: staff.eventId,
          orderId,
          ticketTierId: includedTier.tierId,
          attendeeId: staff.staffUserId,
          attendeeName: args.buyerName,
          attendeeEmail: args.buyerEmail,
          ticketCode,
          status: "VALID",
          price: proRatedPrice,
          soldByStaffId: args.staffId,
          bundleId: args.bundleId as string,
          createdAt: now,
          updatedAt: now,
        });

        ticketIds.push(ticketId);
      }

      // Update tier sold count
      await ctx.db.patch(includedTier.tierId, {
        sold: tier.sold + includedTier.quantity,
        updatedAt: now,
      });

      // Record tier sale in allocation
      const allocation = await ctx.db
        .query("staffTierAllocations")
        .withIndex("by_staff_and_tier", (q) =>
          q.eq("staffId", args.staffId).eq("tierId", includedTier.tierId)
        )
        .first();

      if (allocation) {
        await ctx.db.patch(allocation._id, {
          soldQuantity: allocation.soldQuantity + includedTier.quantity,
          remainingQuantity: allocation.remainingQuantity - includedTier.quantity,
          updatedAt: now,
        });
      }
    }

    // Update bundle sold count
    await ctx.db.patch(args.bundleId, {
      sold: bundle.sold + 1,
      updatedAt: now,
    });

    // Calculate and record commission
    if (staff.commissionType && staff.commissionValue) {
      if (staff.commissionType === "FIXED") {
        totalCommission = staff.commissionValue; // cents
      } else if (staff.commissionType === "PERCENTAGE") {
        totalCommission = Math.floor((bundle.price * staff.commissionValue) / 100);
      }
    }

    // Update staff stats
    await ctx.db.patch(args.staffId, {
      ticketsSold: staff.ticketsSold + bundle.includedTiers.reduce((sum, t) => sum + t.quantity, 0),
      commissionEarned: staff.commissionEarned + totalCommission,
      cashCollected: (staff.cashCollected || 0) + bundle.price,
      updatedAt: now,
    });

    // Record staff sale
    await ctx.db.insert("staffSales", {
      orderId,
      eventId: staff.eventId,
      staffId: args.staffId,
      staffUserId: staff.staffUserId,
      ticketCount: bundle.includedTiers.reduce((sum, t) => sum + t.quantity, 0),
      commissionAmount: totalCommission,
      paymentMethod: args.paymentMethod,
      createdAt: now,
    });

    return {
      orderId,
      ticketIds,
      bundleName: bundle.name,
      totalPrice: bundle.price,
      commission: totalCommission,
      ticketCount: ticketIds.length,
    };
  },
});

/**
 * Get bundle sales history for a staff member
 */
export const getStaffBundleSales = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    // Get all orders by this staff that are bundle purchases
    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(q.eq(q.field("soldByStaffId"), args.staffId), q.eq(q.field("isBundlePurchase"), true))
      )
      .collect();

    // Enrich with bundle details
    const enriched = await Promise.all(
      orders.map(async (order) => {
        const bundle = order.bundleId ? await ctx.db.get(order.bundleId) : null;

        return {
          orderId: order._id,
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          bundleName: bundle?.name || "Unknown Bundle",
          totalAmount: order.totalCents,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});
