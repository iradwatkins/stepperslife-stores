import { internalMutation } from "../_generated/server";

// WARNING: This mutation deletes ALL data from all tables
// Only use for development/testing purposes
export const resetAllData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "users",
      "events",
      "organizerCredits",
      "creditTransactions",
      "eventPaymentConfig",
      "ticketTiers",
      "ticketBundles",
      "orderItems",
      "tickets",
      "eventStaff",
      "staffSales",
      "staffTierAllocations",
      "staffTicketTransfers",
      "orders",
      "ticketInstances",
      "discountCodes",
      "discountCodeUsage",
      "ticketTransfers",
      "seatingCharts",
      "seatReservations",
      "seatingShares",
      "eventWaitlist",
      "roomTemplates",
      "uploadedFlyers",
      "eventContacts",
      "products",
      "productVariations",
      "productOrders",
      "restaurants",
      "restaurantLocations",
      "restaurantStaff",
      "menuCategories",
      "menuItems",
      "foodOrders",
      "restaurantReviews",
      "restaurantReviewVotes",
      "favoriteRestaurants",
      "productWishlists",
      "favoriteEvents",
      "vendors",
      "vendorEarnings",
      "vendorPayouts",
      "vendorCoupons",
      "vendorCouponUsage",
      "pushSubscriptions",
      "notificationLog",
      "emailLog",
      "organizerPlatformDebt",
      "platformDebtLedger",
      "productReviews",
      "hotelPackages",
      "hotelReservations",
      "taxRates",
      "shippingZones",
      "eventInterests",
      "userPrivacySettings",
      "instructors",
      "classReviews",
      "reviewVotes",
      "reviewFlags",
      "carpoolOffers",
      "carpoolRequests",
      "userEventPassport",
      "achievements",
      "eventAttendance",
    ] as const;

    const results: Record<string, number> = {};

    for (const tableName of tables) {
      try {
        const docs = await ctx.db.query(tableName).collect();
        let deleted = 0;
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
          deleted++;
        }
        results[tableName] = deleted;
      } catch (error) {
        results[tableName] = -1; // Error indicator
      }
    }

    return results;
  },
});
