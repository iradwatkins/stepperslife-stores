import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all staff members for an event
 */
export const getEventStaff = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const staffMembers = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return staffMembers.map((staff) => ({
      ...staff,
      ticketsRemaining: (staff.allocatedTickets || 0) - staff.ticketsSold,
      netPayout: staff.commissionEarned - (staff.cashCollected || 0),
    }));
  },
});

/**
 * Get staff member details with sales statistics
 */
export const getStaffMemberDetails = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const staffMember = await ctx.db.get(args.staffId);
    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    // Get sales breakdown by payment method
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_staff", (q) => q.eq("soldByStaffId", args.staffId))
      .collect();

    const onlineSales = tickets.filter(
      (t) =>
        t.paymentMethod === "ONLINE" || t.paymentMethod === "SQUARE" || t.paymentMethod === "STRIPE"
    ).length;
    const cashSales = tickets.filter((t) => t.paymentMethod === "CASH").length;
    const cashAppSales = tickets.filter((t) => t.paymentMethod === "CASH_APP").length;

    const ticketsRemaining = (staffMember.allocatedTickets || 0) - staffMember.ticketsSold;
    const netPayout = staffMember.commissionEarned - (staffMember.cashCollected || 0);

    return {
      ...staffMember,
      ticketsRemaining,
      netPayout,
      salesBreakdown: {
        online: onlineSales,
        cash: cashSales,
        cashApp: cashAppSales,
        total: staffMember.ticketsSold,
      },
    };
  },
});

/**
 * Get staff sales history
 */
export const getStaffSales = query({
  args: {
    staffId: v.id("eventStaff"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const sales = await ctx.db
      .query("staffSales")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .order("desc")
      .take(limit);

    return sales;
  },
});

/**
 * Get staff dashboard data for a staff member
 */
export const getStaffDashboard = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return [];
    }

    // Get all staff positions for this user
    const staffPositions = await ctx.db
      .query("eventStaff")
      .withIndex("by_staff_user", (q) => q.eq("staffUserId", currentUser._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Enrich with event details
    const enrichedPositions = await Promise.all(
      staffPositions.map(async (staff) => {
        const event = staff.eventId ? await ctx.db.get(staff.eventId) : null;

        return {
          _id: staff._id,
          event: event
            ? {
                _id: event._id,
                name: event.name,
                startDate: event.startDate,
                imageUrl: event.imageUrl,
              }
            : null,
          role: staff.role,
          allocatedTickets: staff.allocatedTickets || 0,
          ticketsSold: staff.ticketsSold,
          ticketsRemaining: (staff.allocatedTickets || 0) - staff.ticketsSold,
          commissionEarned: staff.commissionEarned,
          cashCollected: staff.cashCollected || 0,
          netPayout: staff.commissionEarned - (staff.cashCollected || 0),
          referralCode: staff.referralCode,
          commissionType: staff.commissionType,
          commissionValue: staff.commissionValue,
          hierarchyLevel: staff.hierarchyLevel,
          canAssignSubSellers: staff.canAssignSubSellers,
          canScan: staff.canScan,
        };
      })
    );

    return enrichedPositions.filter((p) => p.event !== null);
  },
});

/**
 * Get all events where the current user is a staff member
 */
export const getStaffEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    // Get all staff positions for this user
    const staffPositions = await ctx.db
      .query("eventStaff")
      .withIndex("by_staff_user", (q) => q.eq("staffUserId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get event details for each position
    const eventsWithStaffInfo = await Promise.all(
      staffPositions.map(async (staff) => {
        const event = staff.eventId ? await ctx.db.get(staff.eventId) : null;
        if (!event) return null;

        return {
          eventId: event._id,
          eventName: event.name,
          eventDate: event.startDate,
          staffId: staff._id,
          role: staff.role,
          allocatedTickets: staff.allocatedTickets || 0,
          ticketsSold: staff.ticketsSold || 0,
          commissionEarned: staff.commissionEarned || 0,
          cashCollected: staff.cashCollected || 0,
        };
      })
    );

    return eventsWithStaffInfo.filter((e) => e !== null);
  },
});

/**
 * Get staff member by referral code (for tracking sales)
 */
export const getStaffByReferralCode = query({
  args: {
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    const staffMember = await ctx.db
      .query("eventStaff")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .first();

    if (!staffMember || !staffMember.isActive) {
      return null;
    }

    return {
      _id: staffMember._id,
      eventId: staffMember.eventId,
      name: staffMember.name,
      commissionType: staffMember.commissionType,
      commissionValue: staffMember.commissionValue,
    };
  },
});

/**
 * Get organizer's staff performance summary
 */
export const getOrganizerStaffSummary = query({
  args: {
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    let allStaff;

    if (args.eventId) {
      // Get staff for specific event
      allStaff = await ctx.db
        .query("eventStaff")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();
    } else {
      // Get all staff by organizer
      allStaff = await ctx.db
        .query("eventStaff")
        .withIndex("by_organizer", (q) => q.eq("organizerId", currentUser._id))
        .collect();
    }

    const activeStaff = allStaff.filter((s) => s.isActive);
    const totalCommissionEarned = activeStaff.reduce((sum, s) => sum + s.commissionEarned, 0);
    const totalCashCollected = activeStaff.reduce((sum, s) => sum + (s.cashCollected || 0), 0);
    const totalTicketsSold = activeStaff.reduce((sum, s) => sum + s.ticketsSold, 0);

    return {
      totalStaff: activeStaff.length,
      totalTicketsSold,
      totalCommissionEarned,
      totalCashCollected,
      netPayoutOwed: totalCommissionEarned - totalCashCollected,
      topPerformers: activeStaff
        .sort((a, b) => b.ticketsSold - a.ticketsSold)
        .slice(0, 5)
        .map((s) => ({
          name: s.name,
          ticketsSold: s.ticketsSold,
          commissionEarned: s.commissionEarned,
        })),
    };
  },
});

/**
 * Get all sub-sellers assigned by the current staff member
 */
export const getMySubSellers = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return [];
    }

    // Find the current user's staff record for this event
    const myStaffRecord = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) =>
        q.and(q.eq(q.field("staffUserId"), currentUser._id), q.eq(q.field("isActive"), true))
      )
      .first();

    if (!myStaffRecord) {
      return [];
    }

    // Get all sub-sellers assigned by this staff member
    const subSellers = await ctx.db
      .query("eventStaff")
      .withIndex("by_assigned_by", (q) => q.eq("assignedByStaffId", myStaffRecord._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get sales for each sub-seller
    const subSellersWithStats = await Promise.all(
      subSellers.map(async (subSeller) => {
        const sales = await ctx.db
          .query("staffSales")
          .withIndex("by_staff", (q) => q.eq("staffId", subSeller._id))
          .collect();

        const availableTickets = (subSeller.allocatedTickets || 0) - (subSeller.ticketsSold || 0);

        return {
          ...subSeller,
          availableTickets,
          totalSales: sales.length,
          recentSales: sales.slice(-5).reverse(), // Last 5 sales
        };
      })
    );

    return subSellersWithStats;
  },
});

/**
 * Get the full hierarchy tree for an event (organizer view)
 * Shows all staff and their sub-sellers in a tree structure
 */
export const getHierarchyTree = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    // Get event first
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Verify user is organizer or admin
    if (event.organizerId !== currentUser._id && currentUser.role !== "admin") {
      throw new Error("Only the event organizer can view the hierarchy tree");
    }

    // Get all staff for this event
    const allStaff = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Build hierarchy tree
    const buildTree = (parentId: any = undefined, level: number = 1): any[] => {
      const children = allStaff.filter((s) => {
        if (parentId === undefined) {
          return s.assignedByStaffId === undefined || s.assignedByStaffId === null;
        }
        return s.assignedByStaffId === parentId;
      });

      return children.map((staff) => {
        const availableTickets = (staff.allocatedTickets || 0) - (staff.ticketsSold || 0);

        return {
          ...staff,
          availableTickets,
          level,
          subSellers: buildTree(staff._id, level + 1),
        };
      });
    };

    return buildTree();
  },
});

/**
 * Get parent staff information for a sub-seller
 * Shows who assigned this staff member and their relationship
 */
export const getMyParentStaff = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return null;
    }

    // Find the current user's staff record for this event
    const myStaffRecord = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) =>
        q.and(q.eq(q.field("staffUserId"), currentUser._id), q.eq(q.field("isActive"), true))
      )
      .first();

    if (!myStaffRecord || !myStaffRecord.assignedByStaffId) {
      return null; // This is a top-level staff (assigned by organizer)
    }

    // Get parent staff record
    const parentStaff = await ctx.db.get(myStaffRecord.assignedByStaffId);

    if (!parentStaff) {
      return null;
    }

    return {
      parentName: parentStaff.name,
      parentEmail: parentStaff.email,
      parentPhone: parentStaff.phone,
      hierarchyLevel: myStaffRecord.hierarchyLevel,
      parentCommissionPercent: myStaffRecord.parentCommissionPercent,
      subSellerCommissionPercent: myStaffRecord.subSellerCommissionPercent,
    };
  },
});

/**
 * Get all sales made by a sub-seller and their descendants
 * Useful for tracking performance of an entire branch
 */
export const getSubSellerBranchSales = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff not found");
    }

    // Verify permission: must be the staff themselves, the organizer, or an ancestor in the hierarchy
    const isOrganizer = staff.organizerId === currentUser._id;
    const isSelf = staff.staffUserId === currentUser._id;

    // Check if current user is an ancestor
    let isAncestor = false;
    let currentStaff = staff;
    while (currentStaff.assignedByStaffId) {
      const parent = await ctx.db.get(currentStaff.assignedByStaffId);
      if (parent && parent.staffUserId === currentUser._id) {
        isAncestor = true;
        break;
      }
      if (!parent) break;
      currentStaff = parent;
    }

    if (!isOrganizer && !isSelf && !isAncestor && currentUser.role !== "admin") {
      throw new Error("You do not have permission to view these sales");
    }

    // Get all descendants recursively
    const getAllDescendants = async (staffId: any): Promise<any[]> => {
      const directChildren = await ctx.db
        .query("eventStaff")
        .withIndex("by_assigned_by", (q) => q.eq("assignedByStaffId", staffId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      let allDescendants = [...directChildren];

      for (const child of directChildren) {
        const childDescendants = await getAllDescendants(child._id);
        allDescendants = [...allDescendants, ...childDescendants];
      }

      return allDescendants;
    };

    const descendants = await getAllDescendants(args.staffId);

    // Get sales for the staff member and all descendants
    const allStaffIds = [args.staffId, ...descendants.map((d) => d._id)];

    const allSales = await Promise.all(
      allStaffIds.map(async (staffId) => {
        const sales = await ctx.db
          .query("staffSales")
          .withIndex("by_staff", (q) => q.eq("staffId", staffId))
          .collect();

        const staffRecord = staffId ? await ctx.db.get(staffId) : null;

        return sales.map((sale) => ({
          ...sale,
          staffName: staffRecord && "name" in staffRecord ? staffRecord.name : undefined,
          hierarchyLevel:
            staffRecord && "hierarchyLevel" in staffRecord ? staffRecord.hierarchyLevel : undefined,
        }));
      })
    );

    const flatSales = allSales.flat().sort((a, b) => b.createdAt - a.createdAt);

    const totalRevenue = flatSales.reduce((sum, sale) => sum + (sale.commissionAmount || 0), 0);
    const totalTickets = flatSales.reduce((sum, sale) => sum + (sale.ticketCount || 0), 0);

    return {
      sales: flatSales,
      totalSales: flatSales.length,
      totalRevenue,
      totalTickets,
      branchSize: descendants.length + 1, // Including the staff member themselves
    };
  },
});

/**
 * Get all global/default staff for the current organizer
 * These are staff with eventId=null that auto-assign to new events
 */
export const getGlobalStaff = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return [];
    }

    // Get all global staff (eventId = undefined/null)
    const globalStaff = await ctx.db
      .query("eventStaff")
      .filter((q) =>
        q.and(q.eq(q.field("organizerId"), currentUser._id), q.eq(q.field("eventId"), undefined))
      )
      .collect();

    return globalStaff;
  },
});

/**
 * Get all global sub-sellers assigned by the current staff member
 * For support staff to manage their default sub-seller roster
 */
export const getMyGlobalSubSellers = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return [];
    }

    // Find the current user's global staff record (where they are support staff)
    const myStaffRecord = await ctx.db
      .query("eventStaff")
      .filter((q) =>
        q.and(
          q.eq(q.field("staffUserId"), currentUser._id),
          q.eq(q.field("eventId"), undefined), // Global staff only
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!myStaffRecord) {
      // User is not a global staff member, return empty array
      return [];
    }

    // Get all global sub-sellers assigned by this staff member
    const subSellers = await ctx.db
      .query("eventStaff")
      .withIndex("by_assigned_by", (q) => q.eq("assignedByStaffId", myStaffRecord._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("eventId"), undefined), // Global sub-sellers only
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    return subSellers;
  },
});

/**
 * Get staff member by ID
 */
export const getStaffMember = query({
  args: {
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const staffMember = await ctx.db.get(args.staffId);
    return staffMember;
  },
});

/**
 * Get all events by organizer (for copy roster dropdown)
 */
export const getOrganizerEventsForCopy = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return [];
    }

    // Get all events by this organizer
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", currentUser._id))
      .order("desc")
      .collect();

    // Return just basic info needed for dropdown
    return events.map((event) => ({
      _id: event._id,
      name: event.name,
      startDate: event.startDate,
      eventType: event.eventType,
    }));
  },
});

/**
 * Get global staff with aggregated performance across all events
 * Returns each global staff member with their total performance metrics
 */
export const getGlobalStaffWithPerformance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return [];
    }

    // Get all global staff (eventId = undefined/null)
    const globalStaff = await ctx.db
      .query("eventStaff")
      .filter((q) =>
        q.and(q.eq(q.field("organizerId"), currentUser._id), q.eq(q.field("eventId"), undefined))
      )
      .collect();

    // For each global staff, aggregate their performance across ALL events
    const staffWithPerformance = await Promise.all(
      globalStaff.map(async (staff) => {
        // Find all event-specific instances of this staff (same staffUserId, but with eventId set)
        const eventInstances = await ctx.db
          .query("eventStaff")
          .withIndex("by_staff_user", (q) => q.eq("staffUserId", staff.staffUserId))
          .filter((q) =>
            q.and(
              q.neq(q.field("eventId"), undefined), // Only event-specific instances
              q.eq(q.field("organizerId"), currentUser._id) // Same organizer
            )
          )
          .collect();

        // Aggregate performance metrics
        const totalTicketsSold = eventInstances.reduce(
          (sum, instance) => sum + instance.ticketsSold,
          0
        );
        const totalCommissionEarned = eventInstances.reduce(
          (sum, instance) => sum + instance.commissionEarned,
          0
        );
        const totalCashCollected = eventInstances.reduce(
          (sum, instance) => sum + (instance.cashCollected || 0),
          0
        );
        const activeEventCount = eventInstances.filter((instance) => instance.isActive).length;

        // Get unique event IDs
        const eventIds = Array.from(new Set(eventInstances.map((i) => i.eventId).filter(Boolean)));

        // Calculate average performance
        const avgTicketsPerEvent = activeEventCount > 0 ? totalTicketsSold / activeEventCount : 0;

        return {
          ...staff,
          performance: {
            totalTicketsSold,
            totalCommissionEarned,
            totalCashCollected,
            activeEventCount,
            totalEventCount: eventIds.length,
            avgTicketsPerEvent: Math.round(avgTicketsPerEvent * 10) / 10,
            netPayout: totalCommissionEarned - totalCashCollected,
          },
          eventIds, // Array of event IDs this staff is in
        };
      })
    );

    // Sort by total tickets sold (top performers first)
    return staffWithPerformance.sort(
      (a, b) => b.performance.totalTicketsSold - a.performance.totalTicketsSold
    );
  },
});
