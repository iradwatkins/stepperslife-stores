import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Get settlement dashboard for an event organizer
 * Shows all staff members and their financial settlement status
 */
export const getOrganizerSettlement = query({
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
      throw new Error("User not found. Please log in.");
    }

    // Get all staff members for this organizer
    let staffQuery = ctx.db
      .query("eventStaff")
      .filter((q) => q.eq(q.field("organizerId"), currentUser._id));

    // Filter by event if specified
    if (args.eventId) {
      staffQuery = staffQuery.filter((q) => q.eq(q.field("eventId"), args.eventId));
    }

    const staffMembers = await staffQuery.collect();

    // Calculate settlement for each staff member
    const settlements = await Promise.all(
      staffMembers.map(async (staff) => {
        if (!staff.eventId) return null;
        const event = await ctx.db.get(staff.eventId);

        // Get all sales by this staff member
        const sales = await ctx.db
          .query("staffSales")
          .withIndex("by_staff", (q) => q.eq("staffId", staff._id))
          .collect();

        // Calculate totals
        const totalSales = sales.length;
        const totalTickets = sales.reduce((sum, sale) => sum + sale.ticketCount, 0);
        const totalCommission = sales.reduce((sum, sale) => sum + sale.commissionAmount, 0);

        // Cash collected from cash sales only
        const cashSales = sales.filter((s) => s.paymentMethod === "CASH");
        const totalCashCollected = staff.cashCollected || 0;

        // Net settlement: commission - cash collected
        // Positive = organizer owes staff
        // Negative = staff owes organizer
        const netSettlement = staff.commissionEarned - totalCashCollected;

        return {
          staffId: staff._id,
          staffName: staff.name,
          staffEmail: staff.email,
          eventName: event?.name || "Unknown Event",
          eventId: staff.eventId,
          role: staff.role,
          isActive: staff.isActive,
          commissionType: staff.commissionType,
          commissionValue: staff.commissionValue,

          // Hierarchy information
          hierarchyLevel: staff.hierarchyLevel || 1,
          assignedByStaffId: staff.assignedByStaffId,
          canAssignSubSellers: staff.canAssignSubSellers,
          parentCommissionPercent: staff.parentCommissionPercent,
          subSellerCommissionPercent: staff.subSellerCommissionPercent,

          // Statistics
          totalSales,
          totalTickets: staff.ticketsSold,
          ticketsAllocated: staff.allocatedTickets,
          ticketsRemaining: staff.allocatedTickets
            ? staff.allocatedTickets - staff.ticketsSold
            : undefined,

          // Financial
          commissionEarned: staff.commissionEarned,
          cashCollected: totalCashCollected,
          netSettlement, // Who owes whom
          settlementStatus: staff.settlementStatus || "PENDING",
          settlementPaidAt: staff.settlementPaidAt,

          // Breakdown
          cashSalesCount: cashSales.length,
          creditSalesCount: totalSales - cashSales.length,

          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        };
      })
    );

    // Filter out null values (staff without eventId)
    const validSettlements = settlements.filter((s): s is NonNullable<typeof s> => s !== null);

    // Sort by net settlement (highest amounts first)
    validSettlements.sort((a, b) => Math.abs(b.netSettlement) - Math.abs(a.netSettlement));

    // Calculate summary totals
    const summary = {
      totalStaff: validSettlements.length,
      activeStaff: validSettlements.filter((s) => s.isActive).length,
      totalTicketsSold: validSettlements.reduce((sum, s) => s.totalTickets, 0),
      totalCommissionEarned: validSettlements.reduce((sum, s) => sum + s.commissionEarned, 0),
      totalCashCollected: validSettlements.reduce((sum, s) => sum + s.cashCollected, 0),
      totalOwedToStaff: validSettlements
        .filter((s) => s.netSettlement > 0)
        .reduce((sum, s) => sum + s.netSettlement, 0),
      totalOwedByStaff: validSettlements
        .filter((s) => s.netSettlement < 0)
        .reduce((sum, s) => sum + Math.abs(s.netSettlement), 0),
      pendingSettlements: validSettlements.filter((s) => s.settlementStatus === "PENDING").length,
      paidSettlements: validSettlements.filter((s) => s.settlementStatus === "PAID").length,
    };

    return {
      settlements: validSettlements,
      summary,
    };
  },
});

/**
 * Get detailed settlement for a specific staff member
 */
export const getStaffSettlementDetails = query({
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
      throw new Error("User not found. Please log in.");
    }

    const staffMember = await ctx.db.get(args.staffId);
    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    // Verify user is the organizer or admin
    if (staffMember.organizerId !== currentUser._id && currentUser.role !== "admin") {
      throw new Error("Unauthorized to view this staff member's settlement");
    }

    if (!staffMember.eventId) {
      throw new Error("Staff member has no associated event");
    }

    const event = await ctx.db.get(staffMember.eventId);

    // Get all sales
    const sales = await ctx.db
      .query("staffSales")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    // Get detailed breakdown by payment method
    const salesByMethod = sales.reduce(
      (acc, sale) => {
        const method = sale.paymentMethod || "UNKNOWN";
        if (!acc[method]) {
          acc[method] = {
            count: 0,
            tickets: 0,
            commission: 0,
          };
        }
        acc[method].count++;
        acc[method].tickets += sale.ticketCount;
        acc[method].commission += sale.commissionAmount;
        return acc;
      },
      {} as Record<string, { count: number; tickets: number; commission: number }>
    );

    // Get recent transactions
    const recentSales = sales
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((sale) => ({
        saleId: sale._id,
        orderId: sale.orderId,
        ticketCount: sale.ticketCount,
        commission: sale.commissionAmount,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
      }));

    const netSettlement = staffMember.commissionEarned - (staffMember.cashCollected || 0);

    return {
      staff: {
        id: staffMember._id,
        name: staffMember.name,
        email: staffMember.email,
        phone: staffMember.phone,
        role: staffMember.role,
        referralCode: staffMember.referralCode,
        isActive: staffMember.isActive,
      },
      event: {
        id: event?._id,
        name: event?.name,
      },
      commission: {
        type: staffMember.commissionType,
        value: staffMember.commissionValue,
        earned: staffMember.commissionEarned,
      },
      tickets: {
        sold: staffMember.ticketsSold,
        allocated: staffMember.allocatedTickets,
        remaining: staffMember.allocatedTickets
          ? staffMember.allocatedTickets - staffMember.ticketsSold
          : undefined,
      },
      settlement: {
        cashCollected: staffMember.cashCollected || 0,
        commissionEarned: staffMember.commissionEarned,
        netAmount: netSettlement,
        direction:
          netSettlement > 0
            ? "ORGANIZER_OWES_STAFF"
            : netSettlement < 0
              ? "STAFF_OWES_ORGANIZER"
              : "SETTLED",
        status: staffMember.settlementStatus || "PENDING",
        paidAt: staffMember.settlementPaidAt,
      },
      salesBreakdown: salesByMethod,
      recentSales,
      totalSales: sales.length,
    };
  },
});

/**
 * Mark a staff member's settlement as paid
 */
export const markSettlementPaid = mutation({
  args: {
    staffId: v.id("eventStaff"),
    notes: v.optional(v.string()),
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
      throw new Error("User not found. Please log in.");
    }

    const staffMember = await ctx.db.get(args.staffId);
    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    // Verify user is the organizer
    if (staffMember.organizerId !== currentUser._id && currentUser.role !== "admin") {
      throw new Error("Only the organizer can mark settlements as paid");
    }

    await ctx.db.patch(args.staffId, {
      settlementStatus: "PAID",
      settlementPaidAt: Date.now(),
      settlementNotes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark a staff member's settlement as pending (unpaid)
 */
export const markSettlementPending = mutation({
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
      throw new Error("User not found. Please log in.");
    }

    const staffMember = await ctx.db.get(args.staffId);
    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    // Verify user is the organizer
    if (staffMember.organizerId !== currentUser._id && currentUser.role !== "admin") {
      throw new Error("Only the organizer can update settlement status");
    }

    await ctx.db.patch(args.staffId, {
      settlementStatus: "PENDING",
      settlementPaidAt: undefined,
      settlementNotes: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
