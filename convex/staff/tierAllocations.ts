/**
 * Tier-Specific Staff Allocations
 * For multi-day events and bundles, track which staff have which tier tickets
 */

import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "../_generated/server";
import { requireEventOwnership } from "../lib/auth";

/**
 * Get authenticated user - requires valid authentication
 * @throws Error if not authenticated
 */
async function getAuthenticatedUser(ctx: MutationCtx | QueryCtx) {
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
 * Allocate specific quantity of a ticket tier to a staff member
 * Used for multi-day events where staff need specific day tickets
 */
export const allocateTierToStaff = mutation({
  args: {
    staffId: v.id("eventStaff"),
    tierId: v.id("ticketTiers"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Get staff member
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify user is the organizer
    if (staff.organizerId !== user._id) {
      throw new Error("Only the event organizer can allocate tickets");
    }

    // Get tier
    const tier = await ctx.db.get(args.tierId);
    if (!tier) {
      throw new Error("Ticket tier not found");
    }

    // Verify tier belongs to staff's event
    if (staff.eventId !== tier.eventId) {
      throw new Error("Tier does not belong to staff member's event");
    }

    // Check if allocation already exists
    const existing = await ctx.db
      .query("staffTierAllocations")
      .withIndex("by_staff_and_tier", (q) =>
        q.eq("staffId", args.staffId).eq("tierId", args.tierId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing allocation
      await ctx.db.patch(existing._id, {
        allocatedQuantity: existing.allocatedQuantity + args.quantity,
        remainingQuantity: existing.remainingQuantity + args.quantity,
        updatedAt: now,
      });

      return { allocationId: existing._id, added: args.quantity };
    } else {
      // Create new allocation
      const allocationId = await ctx.db.insert("staffTierAllocations", {
        staffId: args.staffId,
        eventId: tier.eventId,
        tierId: args.tierId,
        allocatedQuantity: args.quantity,
        soldQuantity: 0,
        remainingQuantity: args.quantity,
        createdAt: now,
        updatedAt: now,
      });

      return { allocationId, added: args.quantity };
    }
  },
});

/**
 * Get all tier allocations for a staff member
 */
export const getStaffTierAllocations = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const allocations = await ctx.db
      .query("staffTierAllocations")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    // Enrich with tier details
    const enriched = await Promise.all(
      allocations.map(async (allocation) => {
        const tier = await ctx.db.get(allocation.tierId);
        return {
          ...allocation,
          tier: tier
            ? {
                _id: tier._id,
                name: tier.name,
                price: tier.price,
                dayNumber: tier.dayNumber,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get tier allocations for a specific event
 * Shows which staff have which tier tickets
 */
export const getEventTierAllocations = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Verify ownership (handles both organizers and admins)
    await requireEventOwnership(ctx, args.eventId);

    const allocations = await ctx.db
      .query("staffTierAllocations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Enrich with staff and tier details
    const enriched = await Promise.all(
      allocations.map(async (allocation) => {
        const [staff, tier] = await Promise.all([
          ctx.db.get(allocation.staffId),
          ctx.db.get(allocation.tierId),
        ]);

        return {
          ...allocation,
          staff: staff
            ? {
                _id: staff._id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
              }
            : null,
          tier: tier
            ? {
                _id: tier._id,
                name: tier.name,
                price: tier.price,
                dayNumber: tier.dayNumber,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Record a tier-specific sale by staff
 * Updates both the tier allocation and overall staff sales
 */
export const recordTierSale = mutation({
  args: {
    staffId: v.id("eventStaff"),
    tierId: v.id("ticketTiers"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the allocation
    const allocation = await ctx.db
      .query("staffTierAllocations")
      .withIndex("by_staff_and_tier", (q) =>
        q.eq("staffId", args.staffId).eq("tierId", args.tierId)
      )
      .first();

    if (!allocation) {
      throw new Error("No allocation found for this staff member and tier");
    }

    if (allocation.remainingQuantity < args.quantity) {
      throw new Error(
        `Insufficient allocation: has ${allocation.remainingQuantity}, needs ${args.quantity}`
      );
    }

    // Update allocation
    await ctx.db.patch(allocation._id, {
      soldQuantity: allocation.soldQuantity + args.quantity,
      remainingQuantity: allocation.remainingQuantity - args.quantity,
      updatedAt: Date.now(),
    });

    // Update overall staff ticketsSold count
    const staff = await ctx.db.get(args.staffId);
    if (staff) {
      await ctx.db.patch(args.staffId, {
        ticketsSold: staff.ticketsSold + args.quantity,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Check which tiers a staff member has allocations for
 * Useful for determining if they can sell bundles
 */
export const getStaffAvailableTiers = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const allocations = await ctx.db
      .query("staffTierAllocations")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    // Filter to only tiers with remaining quantity
    const available = allocations.filter((a) => a.remainingQuantity > 0);

    // Enrich with tier details
    const enriched = await Promise.all(
      available.map(async (allocation) => {
        const tier = await ctx.db.get(allocation.tierId);
        return {
          tierId: allocation.tierId,
          tierName: tier?.name || "Unknown",
          dayNumber: tier?.dayNumber,
          remainingQuantity: allocation.remainingQuantity,
        };
      })
    );

    return enriched;
  },
});

/**
 * Team Member allocates tier-specific tickets to an Associate
 * Transfers from Team Member's allocation to Associate's allocation
 */
export const transferTierToAssociate = mutation({
  args: {
    fromStaffId: v.id("eventStaff"), // Team Member
    toStaffId: v.id("eventStaff"), // Associate
    tierId: v.id("ticketTiers"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Get both staff members
    const [teamMember, associate] = await Promise.all([
      ctx.db.get(args.fromStaffId),
      ctx.db.get(args.toStaffId),
    ]);

    if (!teamMember || !associate) {
      throw new Error("Staff member not found");
    }

    // Verify user is the team member doing the transfer (or organizer in testing mode)
    if (teamMember.staffUserId !== user._id && teamMember.organizerId !== user._id) {
      throw new Error("Only the team member can transfer their tickets");
    }

    // Verify associate is actually assigned by this team member
    if (associate.assignedByStaffId !== args.fromStaffId) {
      throw new Error("Can only transfer to associates you have assigned");
    }

    // Get team member's allocation for this tier
    const teamMemberAllocation = await ctx.db
      .query("staffTierAllocations")
      .withIndex("by_staff_and_tier", (q) =>
        q.eq("staffId", args.fromStaffId).eq("tierId", args.tierId)
      )
      .first();

    if (!teamMemberAllocation) {
      throw new Error("Team member has no allocation for this tier");
    }

    if (teamMemberAllocation.remainingQuantity < args.quantity) {
      throw new Error(
        `Insufficient allocation: has ${teamMemberAllocation.remainingQuantity}, trying to transfer ${args.quantity}`
      );
    }

    const now = Date.now();

    // Deduct from team member
    await ctx.db.patch(teamMemberAllocation._id, {
      allocatedQuantity: teamMemberAllocation.allocatedQuantity - args.quantity,
      remainingQuantity: teamMemberAllocation.remainingQuantity - args.quantity,
      updatedAt: now,
    });

    // Add to associate
    const associateAllocation = await ctx.db
      .query("staffTierAllocations")
      .withIndex("by_staff_and_tier", (q) =>
        q.eq("staffId", args.toStaffId).eq("tierId", args.tierId)
      )
      .first();

    if (associateAllocation) {
      // Update existing allocation
      await ctx.db.patch(associateAllocation._id, {
        allocatedQuantity: associateAllocation.allocatedQuantity + args.quantity,
        remainingQuantity: associateAllocation.remainingQuantity + args.quantity,
        updatedAt: now,
      });
    } else {
      // Create new allocation
      await ctx.db.insert("staffTierAllocations", {
        staffId: args.toStaffId,
        eventId: associate.eventId!,
        tierId: args.tierId,
        allocatedQuantity: args.quantity,
        soldQuantity: 0,
        remainingQuantity: args.quantity,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, transferred: args.quantity };
  },
});
