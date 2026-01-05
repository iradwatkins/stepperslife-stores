import { internalMutation } from "../_generated/server";

/**
 * Release Expired Seat Holds
 *
 * Cron job that runs every 5 minutes to release seat holds that have passed
 * their 15-minute expiry time. This ensures abandoned shopping sessions
 * don't permanently block seats.
 */
export const releaseExpiredSeatHolds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let totalReleasedSeats = 0;
    let chartsUpdated = 0;

    // Get all seating charts that have events with active holds
    const seatingCharts = await ctx.db.query("seatingCharts").collect();

    for (const chart of seatingCharts) {
      let chartModified = false;

      const updatedSections = chart.sections.map((section) => {
        if (!section.tables) return section;

        return {
          ...section,
          tables: section.tables.map((table) => {
            return {
              ...table,
              seats: table.seats.map((seat) => {
                // Check if this seat has an expired session hold
                if (
                  seat.status === "RESERVED" &&
                  seat.sessionId &&
                  seat.sessionExpiry &&
                  seat.sessionExpiry < now
                ) {
                  chartModified = true;
                  totalReleasedSeats++;

                  // Release the hold - seat becomes available again
                  return {
                    ...seat,
                    status: "AVAILABLE" as const,
                    sessionId: undefined,
                    sessionExpiry: undefined,
                  };
                }

                return seat;
              }),
            };
          }),
        };
      });

      // Only patch if we actually made changes
      if (chartModified) {
        await ctx.db.patch(chart._id, {
          sections: updatedSections,
          updatedAt: now,
        });
        chartsUpdated++;
      }
    }

    if (totalReleasedSeats > 0) {
      console.log(
        `[SeatHolds Cron] Released ${totalReleasedSeats} expired seat holds across ${chartsUpdated} seating charts`
      );
    }

    return {
      releasedSeats: totalReleasedSeats,
      chartsUpdated,
    };
  },
});
