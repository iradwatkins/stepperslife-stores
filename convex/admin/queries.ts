import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get platform-wide credit statistics for admin dashboard
 */
export const getCreditStats = query({
  args: {},
  handler: async (ctx) => {
    // Get all organizer credits
    const allCredits = await ctx.db.query("organizerCredits").collect();

    // Get all credit transactions
    const allTransactions = await ctx.db
      .query("creditTransactions")
      .filter((q) => q.eq(q.field("status"), "COMPLETED"))
      .collect();

    // Calculate totals
    const totalCreditsTotal = allCredits.reduce((sum, c) => sum + c.creditsTotal, 0);
    const totalCreditsUsed = allCredits.reduce((sum, c) => sum + c.creditsUsed, 0);
    const totalCreditsRemaining = allCredits.reduce((sum, c) => sum + c.creditsRemaining, 0);

    // Calculate revenue
    const totalRevenue = allTransactions.reduce((sum, t) => sum + t.amountPaid, 0);
    const totalTicketsSold = allTransactions.reduce((sum, t) => sum + t.ticketsPurchased, 0);

    // Get this month's transactions
    const now = Date.now();
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const monthStart = firstDayOfMonth.getTime();

    const thisMonthTransactions = allTransactions.filter((t) => t.purchasedAt >= monthStart);
    const monthlyRevenue = thisMonthTransactions.reduce((sum, t) => sum + t.amountPaid, 0);
    const monthlyTickets = thisMonthTransactions.reduce((sum, t) => sum + t.ticketsPurchased, 0);

    // Get number of active organizers (those who have used credits)
    const activeOrganizers = allCredits.filter((c) => c.creditsUsed > 0).length;

    // Calculate average credits per organizer
    const avgCreditsPerOrganizer = activeOrganizers > 0 ? totalCreditsUsed / activeOrganizers : 0;

    return {
      overall: {
        totalCreditsTotal,
        totalCreditsUsed,
        totalCreditsRemaining,
        utilizationRate:
          totalCreditsTotal > 0
            ? ((totalCreditsUsed / totalCreditsTotal) * 100).toFixed(1) + "%"
            : "0%",
      },
      revenue: {
        totalRevenue: (totalRevenue / 100).toFixed(2), // Convert cents to dollars
        totalTicketsSold,
        monthlyRevenue: (monthlyRevenue / 100).toFixed(2),
        monthlyTickets,
      },
      organizers: {
        totalOrganizers: allCredits.length,
        activeOrganizers,
        avgCreditsPerOrganizer: Math.round(avgCreditsPerOrganizer),
      },
    };
  },
});

/**
 * Get recent credit transactions for admin monitoring
 */
export const getRecentCreditTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const transactions = await ctx.db.query("creditTransactions").order("desc").take(limit);

    // Enrich with organizer info
    const enriched = await Promise.all(
      transactions.map(async (txn) => {
        const organizer = await ctx.db.get(txn.organizerId);
        return {
          ...txn,
          organizerName: organizer?.name ?? "Unknown",
          organizerEmail: organizer?.email ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get low credit organizers (those with less than 10 credits remaining)
 */
export const getLowCreditOrganizers = query({
  args: {},
  handler: async (ctx) => {
    const allCredits = await ctx.db.query("organizerCredits").collect();

    const lowCreditOrganizers = allCredits.filter((c) => c.creditsRemaining < 10);

    // Enrich with organizer info
    const enriched = await Promise.all(
      lowCreditOrganizers.map(async (credit) => {
        const organizer = await ctx.db.get(credit.organizerId);
        return {
          ...credit,
          organizerName: organizer?.name ?? "Unknown",
          organizerEmail: organizer?.email ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get flyer upload statistics for admin dashboard
 */
export const getFlyerUploadStats = query({
  args: {},
  handler: async (ctx) => {
    const allFlyers = await ctx.db.query("uploadedFlyers").collect();

    const totalUploaded = allFlyers.length;
    const aiProcessed = allFlyers.filter((f) => f.aiProcessed).length;
    const eventsCreated = allFlyers.filter((f) => f.eventCreated).length;
    const pendingExtraction = allFlyers.filter(
      (f) => !f.aiProcessed && f.status === "UPLOADED"
    ).length;
    const errors = allFlyers.filter((f) => f.status === "ERROR").length;

    // Calculate total size saved
    const totalSizeSaved = allFlyers.reduce(
      (sum, f) => sum + (f.originalSize - f.optimizedSize),
      0
    );

    return {
      flyers: {
        totalUploaded,
        aiProcessed,
        eventsCreated,
        pendingExtraction,
        errors,
        totalSizeSaved: (totalSizeSaved / 1024 / 1024).toFixed(2) + " MB",
      },
    };
  },
});
