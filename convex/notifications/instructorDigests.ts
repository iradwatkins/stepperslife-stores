/**
 * Instructor Digest Notifications
 *
 * Scheduled jobs to send daily and weekly enrollment digests to instructors
 */

import { internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Get all instructors (users with role="organizer" or who have events)
export const getInstructorsWithActivity = internalQuery({
  args: {
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all events that had activity in the period
    const recentTickets = await ctx.db
      .query("tickets")
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), args.periodStart),
          q.lte(q.field("_creationTime"), args.periodEnd)
        )
      )
      .collect();

    // Get unique event IDs
    const eventIds = [...new Set(recentTickets.map((t) => t.eventId))];

    // Get events and their organizers
    const instructorMap = new Map<
      string,
      {
        instructorId: string;
        instructorName: string;
        instructorEmail: string;
        enrollments: typeof recentTickets;
        eventIds: string[];
      }
    >();

    for (const eventId of eventIds) {
      const event = await ctx.db.get(eventId);
      if (!event || !event.organizerId) continue;

      const organizer = await ctx.db.get(event.organizerId);
      if (!organizer || !organizer.email) continue;

      const existing = instructorMap.get(organizer._id);
      const eventTickets = recentTickets.filter(
        (t) => t.eventId === event._id
      );

      if (existing) {
        existing.enrollments.push(...eventTickets);
        existing.eventIds.push(event._id);
      } else {
        instructorMap.set(organizer._id, {
          instructorId: organizer._id,
          instructorName: organizer.name || "Instructor",
          instructorEmail: organizer.email,
          enrollments: eventTickets,
          eventIds: [event._id],
        });
      }
    }

    return Array.from(instructorMap.values());
  },
});

// Get instructor's upcoming classes
export const getInstructorUpcomingClasses = internalQuery({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const in7Days = now + 7 * 24 * 60 * 60 * 1000;

    const upcomingEvents = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizerId"), args.organizerId),
          q.gte(q.field("startDate"), now),
          q.lte(q.field("startDate"), in7Days),
          q.eq(q.field("status"), "published")
        )
      )
      .collect();

    const classesWithEnrollments = [];

    for (const event of upcomingEvents) {
      const ticketCount = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .filter((q) => q.eq(q.field("status"), "VALID"))
        .collect();

      const eventDate = new Date(event.startDate || Date.now());
      classesWithEnrollments.push({
        className: event.name,
        classDate: `${eventDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} @ ${eventDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}`,
        enrollmentCount: ticketCount.length,
        capacity: event.capacity || 30,
      });
    }

    return classesWithEnrollments;
  },
});

// Get event details for enrollments
export const getEventDetails = internalQuery({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    return event;
  },
});

// Get tier details
export const getTierDetails = internalQuery({
  args: {
    tierId: v.id("ticketTiers"),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) return null;
    return {
      name: tier.name,
      price: tier.price,
    };
  },
});

// Send daily digests
export const sendDailyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;

    // Get instructors with activity in the last 24 hours
    const instructorsWithActivity = await ctx.runQuery(
      internal.notifications.instructorDigests.getInstructorsWithActivity,
      {
        periodStart: yesterday,
        periodEnd: now,
      }
    );

    if (instructorsWithActivity.length === 0) {
      console.log("[DailyDigest] No instructor activity in the last 24 hours");
      return { sent: 0 };
    }

    console.log(
      `[DailyDigest] Found ${instructorsWithActivity.length} instructors with activity`
    );

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stepperslife.com";
    let sentCount = 0;

    for (const instructor of instructorsWithActivity) {
      try {
        // Build enrollments list with event/tier details
        const enrollments = [];
        let grossRevenue = 0;

        for (const ticket of instructor.enrollments) {
          const event = await ctx.runQuery(
            internal.notifications.instructorDigests.getEventDetails,
            { eventId: ticket.eventId }
          );

          const tier = ticket.ticketTierId
            ? await ctx.runQuery(
                internal.notifications.instructorDigests.getTierDetails,
                { tierId: ticket.ticketTierId }
              )
            : null;

          const ticketPrice = tier?.price || 0;
          grossRevenue += ticketPrice;

          enrollments.push({
            studentName: ticket.attendeeName || "Student",
            className: event?.name || "Class",
            tierName: tier?.name || "General",
            enrolledAt: new Date(ticket._creationTime),
            amountCents: ticketPrice,
          });
        }

        // Get upcoming classes
        const upcomingClasses = await ctx.runQuery(
          internal.notifications.instructorDigests.getInstructorUpcomingClasses,
          { organizerId: instructor.instructorId as any }
        );

        // Calculate summary
        const platformFees = Math.round(grossRevenue * 0.1);
        const netRevenue = grossRevenue - platformFees;

        // Prepare digest data
        const digestData = {
          type: "daily" as const,
          instructorName: instructor.instructorName,
          instructorEmail: instructor.instructorEmail,
          digestDate: new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          enrollments,
          cancellations: [], // Would need to track cancellations separately
          summary: {
            totalNewEnrollments: enrollments.length,
            totalCancellations: 0,
            grossRevenueCents: grossRevenue,
            platformFeesCents: platformFees,
            netRevenueCents: netRevenue,
          },
          upcomingClasses,
        };

        // Send the digest email
        const response = await fetch(`${apiUrl}/api/send-instructor-digest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(digestData),
        });

        if (response.ok) {
          sentCount++;
          console.log(
            `[DailyDigest] Sent digest to ${instructor.instructorEmail}`
          );
        } else {
          const error = await response.text();
          console.error(
            `[DailyDigest] Failed to send to ${instructor.instructorEmail}:`,
            error
          );
        }
      } catch (error) {
        console.error(
          `[DailyDigest] Error processing instructor ${instructor.instructorId}:`,
          error
        );
      }
    }

    console.log(`[DailyDigest] Sent ${sentCount} digest emails`);
    return { sent: sentCount };
  },
});

// Send weekly digests (runs on Mondays)
export const sendWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const lastWeek = now - 7 * 24 * 60 * 60 * 1000;

    // Get instructors with activity in the last 7 days
    const instructorsWithActivity = await ctx.runQuery(
      internal.notifications.instructorDigests.getInstructorsWithActivity,
      {
        periodStart: lastWeek,
        periodEnd: now,
      }
    );

    if (instructorsWithActivity.length === 0) {
      console.log("[WeeklyDigest] No instructor activity in the last week");
      return { sent: 0 };
    }

    console.log(
      `[WeeklyDigest] Found ${instructorsWithActivity.length} instructors with activity`
    );

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stepperslife.com";
    let sentCount = 0;

    for (const instructor of instructorsWithActivity) {
      try {
        // Build enrollments list with event/tier details
        const enrollments = [];
        let grossRevenue = 0;
        const classCounts = new Map<string, { enrollments: number; revenue: number }>();

        for (const ticket of instructor.enrollments) {
          const event = await ctx.runQuery(
            internal.notifications.instructorDigests.getEventDetails,
            { eventId: ticket.eventId }
          );

          const tier = ticket.ticketTierId
            ? await ctx.runQuery(
                internal.notifications.instructorDigests.getTierDetails,
                { tierId: ticket.ticketTierId }
              )
            : null;

          const ticketPrice = tier?.price || 0;
          grossRevenue += ticketPrice;

          // Track top classes
          const className = event?.name || "Class";
          const existing = classCounts.get(className);
          if (existing) {
            existing.enrollments++;
            existing.revenue += ticketPrice;
          } else {
            classCounts.set(className, { enrollments: 1, revenue: ticketPrice });
          }

          enrollments.push({
            studentName: ticket.attendeeName || "Student",
            className,
            tierName: tier?.name || "General",
            enrolledAt: new Date(ticket._creationTime),
            amountCents: ticketPrice,
          });
        }

        // Calculate summary
        const platformFees = Math.round(grossRevenue * 0.1);
        const netRevenue = grossRevenue - platformFees;

        // Get top classes
        const topClasses = Array.from(classCounts.entries())
          .map(([className, data]) => ({
            className,
            enrollments: data.enrollments,
            revenue: data.revenue,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3);

        // Format week dates
        const weekStart = new Date(lastWeek);
        const weekEnd = new Date(now);

        // Prepare digest data
        const digestData = {
          type: "weekly" as const,
          instructorName: instructor.instructorName,
          instructorEmail: instructor.instructorEmail,
          weekStart: weekStart.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          weekEnd: weekEnd.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          enrollments,
          cancellations: [],
          summary: {
            totalNewEnrollments: enrollments.length,
            totalCancellations: 0,
            grossRevenueCents: grossRevenue,
            platformFeesCents: platformFees,
            netRevenueCents: netRevenue,
            classesHeld: instructor.eventIds.length,
            studentsAttended: enrollments.length, // Simplified - would need actual attendance tracking
          },
          topClasses,
        };

        // Send the digest email
        const response = await fetch(`${apiUrl}/api/send-instructor-digest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(digestData),
        });

        if (response.ok) {
          sentCount++;
          console.log(
            `[WeeklyDigest] Sent digest to ${instructor.instructorEmail}`
          );
        } else {
          const error = await response.text();
          console.error(
            `[WeeklyDigest] Failed to send to ${instructor.instructorEmail}:`,
            error
          );
        }
      } catch (error) {
        console.error(
          `[WeeklyDigest] Error processing instructor ${instructor.instructorId}:`,
          error
        );
      }
    }

    console.log(`[WeeklyDigest] Sent ${sentCount} digest emails`);
    return { sent: sentCount };
  },
});
