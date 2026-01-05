/**
 * Hotel Reservation Cron Jobs
 * Internal mutations called by scheduled cron jobs to clean up orphaned reservations
 */

import { internalMutation } from "../_generated/server";

/**
 * Expire hotel reservations that have passed their 15-minute hold
 * Called by cron job every 5 minutes
 *
 * HOLD-FIRST PATTERN:
 * When a user starts checkout, rooms are immediately reserved (sold count incremented).
 * If payment isn't completed within 15 minutes, this cron releases those rooms.
 */
export const expireHotelReservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all PENDING reservations with expired holds
    // Using the by_expires index for efficient querying
    const allPendingReservations = await ctx.db
      .query("hotelReservations")
      .withIndex("by_expires")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "PENDING"),
          q.neq(q.field("expiresAt"), undefined)
        )
      )
      .collect();

    // Filter to only expired ones
    const expiredReservations = allPendingReservations.filter(
      (res) => res.expiresAt && res.expiresAt < now
    );

    let expiredCount = 0;
    let roomsReleasedCount = 0;

    for (const reservation of expiredReservations) {
      // Get the hotel package to release room inventory
      const pkg = await ctx.db.get(reservation.packageId);

      if (pkg) {
        // Release rooms back to inventory
        const updatedRoomTypes = pkg.roomTypes.map((rt) => {
          if (rt.id === reservation.roomTypeId) {
            const newSold = Math.max(0, rt.sold - reservation.numberOfRooms);
            return {
              ...rt,
              sold: newSold,
            };
          }
          return rt;
        });

        await ctx.db.patch(pkg._id, {
          roomTypes: updatedRoomTypes,
          updatedAt: now,
        });

        roomsReleasedCount += reservation.numberOfRooms;
      }

      // Mark reservation as EXPIRED and clear hold fields
      await ctx.db.patch(reservation._id, {
        status: "EXPIRED",
        holdToken: undefined,
        expiresAt: undefined,
        updatedAt: now,
      });

      expiredCount++;
    }

    return {
      success: true,
      expiredCount,
      roomsReleasedCount,
    };
  },
});
