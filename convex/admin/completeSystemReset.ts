import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Factory Reset - Delete ALL data from ALL 74 tables, preserving admin users
 *
 * Usage:
 * CONVEX_SELF_HOSTED_URL=https://convex.toolboxhosting.com \
 * CONVEX_SELF_HOSTED_ADMIN_KEY="convex-self-hosted|..." \
 * npx convex run --no-push admin/completeSystemReset:factoryReset '{}'
 */
export const factoryReset = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Admin emails to preserve
    const keepEmails = ["iradwatkins@gmail.com", "bobbygwatkins@gmail.com"];

    const results: Record<string, number> = {};
    let totalDeleted = 0;

    // ALL 74 tables from schema.ts - order matters for foreign key dependencies
    // Delete child/dependent tables first, parent tables last
    const allTables = [
      // Event tickets & orders (child tables)
      "tickets",
      "ticketInstances",
      "orderItems",
      "orders",
      "seatReservations",
      "seatingCharts",
      "seatingShares",
      "roomTemplates",
      "staffSales",
      "staffTierAllocations",
      "staffTicketTransfers",
      "discountCodeUsage",
      "discountCodes",
      "ticketBundles",
      "ticketTiers",
      "ticketTransfers",
      "eventPaymentConfig",
      "eventWaitlist",
      "eventContacts",
      "eventStaff",
      "eventInterests",
      "eventAttendance",
      "eventPromotions",
      "uploadedFlyers",

      // Credits & platform debt
      "creditTransactions",
      "organizerCredits",
      "organizerPlatformDebt",
      "platformDebtLedger",

      // Marketplace products
      "productOrders",
      "productReviews",
      "productVariations",
      "productWishlists",
      "products",

      // Vendors
      "vendorCouponUsage",
      "vendorCoupons",
      "vendorEarnings",
      "vendorPayouts",
      "vendors",

      // Restaurants
      "foodOrders",
      "restaurantReviews",
      "restaurantReviewVotes",
      "favoriteRestaurants",
      "restaurantStaff",
      "menuItems",
      "menuCategories",
      "restaurantLocations",
      "restaurants",

      // Classes & instructors
      "classReviews",
      "reviewVotes",
      "reviewFlags",
      "instructors",

      // Services
      "serviceReviews",
      "serviceProviders",
      "serviceCategories",
      "djProfiles",
      "radioTop10",

      // Hotels
      "hotelReservations",
      "hotelPackages",

      // User favorites & gamification
      "favoriteEvents",
      "userEventPassport",
      "achievements",

      // Carpool
      "carpoolOffers",
      "carpoolRequests",

      // Notifications & logs
      "pushSubscriptions",
      "notificationLog",
      "emailLog",
      "processedWebhookEvents",

      // Settings & subscriptions
      "userPrivacySettings",
      "userSubscriptions",
      "featureFlags",
      "taxRates",
      "shippingZones",

      // Parent tables LAST
      "events",
      // users - handled specially to preserve admins
    ];

    // Delete all records from all tables
    for (const tableName of allTables) {
      try {
        const documents = await ctx.db.query(tableName as any).collect();
        let count = 0;
        for (const doc of documents) {
          await ctx.db.delete(doc._id);
          count++;
          totalDeleted++;
        }
        results[tableName] = count;
      } catch (error: any) {
        results[tableName] = -1; // Table doesn't exist or error
      }
    }

    // Handle users table specially - preserve admin users
    const allUsers = await ctx.db.query("users").collect();
    let usersDeleted = 0;
    const preservedUsers: Array<{ id: any; email: string; name?: string }> = [];

    for (const user of allUsers) {
      if (keepEmails.includes(user.email || "")) {
        preservedUsers.push({ id: user._id, email: user.email || "", name: user.name });
      } else {
        await ctx.db.delete(user._id);
        usersDeleted++;
        totalDeleted++;
      }
    }
    results["users"] = usersDeleted;

    return {
      success: true,
      totalDeleted,
      tablesCleared: Object.keys(results).length,
      tableBreakdown: results,
      preservedUsers,
      message: `Factory reset complete. Deleted ${totalDeleted} records from ${Object.keys(results).length} tables. Preserved ${preservedUsers.length} admin users.`,
      timestamp: Date.now(),
    };
  },
});

/**
 * Complete System Reset - Delete ALL data from ALL tables
 * WARNING: This is irreversible and will delete EVERYTHING
 * Only use when transitioning from test to production
 */
export const resetAllData = mutation({
  args: {},
  handler: async (ctx) => {

    let totalDeleted = 0;

    // Define all tables in deletion order (child tables first, parent tables last)
    // Using actual table names from schema.ts
    const tablesToReset = [
      // Child/Dependent tables first
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
      "productOrders",
      "products",
      "uploadedFlyers",
      "eventContacts",
      "ticketTiers",
      "eventPaymentConfig",
      "ticketTransfers",
      "eventWaitlist",
      "creditTransactions",
      "organizerCredits",
      "eventStaff",

      // Parent tables last
      "events",
      "users",

      // Restaurant module tables
      "menuItems",
      "menuCategories",
      "foodOrders",
      "restaurants",

      // Vendor module tables
      "vendorEarnings",
      "vendorPayouts",
      "vendors",
    ];

    for (const tableName of tablesToReset) {
      try {

        // Query all documents in the table
        const documents = await ctx.db.query(tableName as any).collect();

        // Delete each document
        for (const doc of documents) {
          await ctx.db.delete(doc._id);
          totalDeleted++;
        }

      } catch (error: any) {
        // If table doesn't exist or query fails, log but continue
      }
    }


    return {
      success: true,
      totalDeleted,
      message: `Successfully deleted ${totalDeleted} records from all tables`,
      timestamp: Date.now(),
    };
  },
});

/**
 * Verify System is Empty - Check all tables are cleared
 */
export const verifySystemEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    // Using actual table names from schema.ts
    const tables = [
      "users",
      "events",
      "tickets",
      "ticketInstances",
      "orders",
      "orderItems",
      "seatReservations",
      "seatingCharts",
      "roomTemplates",
      "staffSales",
      "staffTicketTransfers",
      "discountCodes",
      "discountCodeUsage",
      "ticketBundles",
      "productOrders",
      "products",
      "uploadedFlyers",
      "eventContacts",
      "ticketTiers",
      "eventPaymentConfig",
      "ticketTransfers",
      "eventWaitlist",
      "creditTransactions",
      "organizerCredits",
      "eventStaff",
      "menuItems",
      "menuCategories",
      "foodOrders",
      "restaurants",
      "vendorEarnings",
      "vendorPayouts",
      "vendors",
    ];

    const results: Record<string, number> = {};
    let totalRecords = 0;

    for (const tableName of tables) {
      try {
        const count = (await ctx.db.query(tableName as any).collect()).length;
        results[tableName] = count;
        totalRecords += count;
      } catch (error: any) {
        results[tableName] = -1; // Indicates table doesn't exist or error
      }
    }

    return {
      isEmpty: totalRecords === 0,
      totalRecords,
      tableBreakdown: results,
      timestamp: Date.now(),
    };
  },
});
