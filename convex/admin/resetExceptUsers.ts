import { mutation } from "../_generated/server";

/**
 * Reset All Data EXCEPT Users
 * Deletes all events, orders, tickets, restaurants, products, vendors, etc.
 * Preserves user accounts for client handover testing
 */
export const resetExceptUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const deletionCount: Record<string, number> = {};
    let totalDeleted = 0;

    // Define tables in deletion order (child tables first, parent tables last)
    // Users table is EXCLUDED
    const tablesToReset = [
      // Event-related child tables
      "tickets",
      "ticketInstances",
      "orderItems",
      "orders",
      "seatReservations",
      "seatingCharts",
      "roomTemplates",
      "staffSales",
      "staffTicketTransfers",
      "discountCodeUsage",
      "discountCodes",
      "ticketBundles",
      "uploadedFlyers",
      "eventContacts",
      "ticketTiers",
      "eventPaymentConfig",
      "ticketTransfers",
      "eventWaitlist",
      "creditTransactions",
      "organizerCredits",
      "eventStaff",
      "events",

      // Restaurant module tables
      "foodOrders",
      "menuItems",
      "menuCategories",
      "restaurantReviews",
      "favoriteRestaurants",
      "restaurantStaff",
      "restaurants",

      // Product/Vendor module tables
      "productOrders",
      "products",
      "vendorEarnings",
      "vendorPayouts",
      "vendors",

      // Notifications
      "pushSubscriptions",
      "notifications",

      // Files
      "files",

      // Platform data (but NOT users)
      "platformDebt",
    ];

    for (const tableName of tablesToReset) {
      try {
        const documents = await ctx.db.query(tableName as any).collect();
        deletionCount[tableName] = 0;

        for (const doc of documents) {
          await ctx.db.delete(doc._id);
          deletionCount[tableName]++;
          totalDeleted++;
        }
      } catch (error: any) {
        // Table might not exist - skip silently
        deletionCount[tableName] = -1;
      }
    }

    // Get preserved user count
    const usersCount = (await ctx.db.query("users").collect()).length;

    return {
      success: true,
      totalDeleted,
      preservedUsers: usersCount,
      message: `Deleted ${totalDeleted} records. Preserved ${usersCount} user accounts.`,
      deletionBreakdown: deletionCount,
      timestamp: Date.now(),
    };
  },
});

/**
 * Verify data is cleared (except users)
 */
export const verifyResetExceptUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "events",
      "tickets",
      "ticketInstances",
      "orders",
      "orderItems",
      "ticketTiers",
      "ticketBundles",
      "foodOrders",
      "menuItems",
      "menuCategories",
      "restaurants",
      "productOrders",
      "products",
      "vendors",
    ];

    const results: Record<string, number> = {};
    let dataRecords = 0;

    for (const tableName of tables) {
      try {
        const count = (await ctx.db.query(tableName as any).collect()).length;
        results[tableName] = count;
        dataRecords += count;
      } catch {
        results[tableName] = -1;
      }
    }

    // Count users (should be preserved)
    const usersCount = (await ctx.db.query("users").collect()).length;
    results["users (PRESERVED)"] = usersCount;

    return {
      isClean: dataRecords === 0,
      totalDataRecords: dataRecords,
      usersPreserved: usersCount,
      tableBreakdown: results,
      timestamp: Date.now(),
    };
  },
});
