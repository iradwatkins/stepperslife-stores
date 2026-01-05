/**
 * Class and Event Reminder Notifications
 *
 * Scheduled job that runs hourly to send reminders for classes/events
 * starting in the next 24 hours.
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";

// Get classes/events starting in the next 24 hours that haven't been reminded
export const getUpcomingClassesForReminders = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const in24Hours = now + 24 * 60 * 60 * 1000;
    const in23Hours = now + 23 * 60 * 60 * 1000; // Don't remind too early

    // Get events (which includes classes) starting in the 23-24 hour window
    const upcomingEvents = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), in23Hours),
          q.lte(q.field("startDate"), in24Hours),
          q.eq(q.field("status"), "published")
        )
      )
      .collect();

    // Get tickets for these events that haven't been reminded
    const eventIds = upcomingEvents.map((e) => e._id);
    const tickets: Array<Doc<"tickets"> & { event: Doc<"events"> }> = [];

    for (const event of upcomingEvents) {
      const eventTickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "VALID"),
            q.neq(q.field("reminderSent"), true)
          )
        )
        .collect();

      for (const ticket of eventTickets) {
        tickets.push({ ...ticket, event });
      }
    }

    return tickets;
  },
});

// Mark tickets as reminded
export const markTicketsAsReminded = internalMutation({
  args: {
    ticketIds: v.array(v.id("tickets")),
  },
  handler: async (ctx, args) => {
    for (const ticketId of args.ticketIds) {
      await ctx.db.patch(ticketId, { reminderSent: true });
    }
  },
});

// Get user details for a ticket
export const getTicketUserDetails = internalQuery({
  args: {
    attendeeId: v.optional(v.id("users")),
    attendeeEmail: v.optional(v.string()),
    attendeeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.attendeeId) {
      const user = await ctx.db.get(args.attendeeId);
      if (user) {
        return {
          name: user.name || "Valued Customer",
          email: user.email,
        };
      }
    }
    return {
      name: args.attendeeName || "Valued Customer",
      email: args.attendeeEmail || null,
    };
  },
});

// Get organizer/instructor details
export const getOrganizerDetails = internalQuery({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const organizer = await ctx.db.get(args.organizerId);
    return organizer
      ? { name: organizer.name || "Instructor", email: organizer.email }
      : null;
  },
});

// Main action to send class reminders
export const sendClassReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get upcoming classes/events with tickets to remind
    const ticketsToRemind = await ctx.runQuery(
      internal.notifications.classReminders.getUpcomingClassesForReminders
    );

    if (ticketsToRemind.length === 0) {
      console.log("[ClassReminders] No reminders to send");
      return { sent: 0 };
    }

    console.log(
      `[ClassReminders] Found ${ticketsToRemind.length} tickets to remind`
    );

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stepperslife.com";
    let sentCount = 0;
    const remindersSent: string[] = [];

    for (const ticket of ticketsToRemind) {
      try {
        // Get user details
        const userDetails = await ctx.runQuery(
          internal.notifications.classReminders.getTicketUserDetails,
          {
            attendeeId: ticket.attendeeId,
            attendeeEmail: ticket.attendeeEmail,
            attendeeName: ticket.attendeeName,
          }
        );

        if (!userDetails.email) {
          console.log(
            `[ClassReminders] Skipping ticket ${ticket._id} - no email`
          );
          continue;
        }

        // Get organizer details
        const organizerDetails = ticket.event.organizerId
          ? await ctx.runQuery(
              internal.notifications.classReminders.getOrganizerDetails,
              { organizerId: ticket.event.organizerId }
            )
          : null;

        // Format date/time
        const eventDate = new Date(ticket.event.startDate || Date.now());
        const formattedDate = eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = eventDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        // Determine if this is a class or event
        const isClass = ticket.event.eventType === "CLASS";

        // Extract location info (can be string or object)
        const loc = ticket.event.location;
        const locationInfo =
          typeof loc === "string"
            ? { venueName: loc, address: "", city: "", state: "", zipCode: "" }
            : loc || { venueName: "", address: "", city: "", state: "", zipCode: "" };

        // Prepare reminder data
        const reminderData = isClass
          ? {
              type: "class" as const,
              studentName: userDetails.name,
              studentEmail: userDetails.email,
              className: ticket.event.name,
              instructorName: organizerDetails?.name || "Instructor",
              classDate: formattedDate,
              classTime: formattedTime,
              venueName: locationInfo.venueName || "",
              venueAddress: locationInfo.address || "",
              venueCity: locationInfo.city || "",
              venueState: locationInfo.state || "",
              venueZip: locationInfo.zipCode || "",
              ticketCode: ticket.ticketCode || "",
            }
          : {
              type: "event" as const,
              studentName: userDetails.name,
              studentEmail: userDetails.email,
              eventName: ticket.event.name,
              organizerName: organizerDetails?.name,
              eventDate: formattedDate,
              eventTime: formattedTime,
              venueName: locationInfo.venueName || "",
              venueAddress: locationInfo.address || "",
              venueCity: locationInfo.city || "",
              venueState: locationInfo.state || "",
              venueZip: locationInfo.zipCode || "",
              ticketCode: ticket.ticketCode || "",
            };

        // Send the reminder email
        const response = await fetch(`${apiUrl}/api/send-class-reminder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reminderData),
        });

        if (response.ok) {
          sentCount++;
          remindersSent.push(ticket._id);
          console.log(
            `[ClassReminders] Sent reminder to ${userDetails.email} for ${ticket.event.name}`
          );
        } else {
          const error = await response.text();
          console.error(
            `[ClassReminders] Failed to send reminder for ticket ${ticket._id}:`,
            error
          );
        }
      } catch (error) {
        console.error(
          `[ClassReminders] Error processing ticket ${ticket._id}:`,
          error
        );
      }
    }

    // Mark tickets as reminded
    if (remindersSent.length > 0) {
      await ctx.runMutation(
        internal.notifications.classReminders.markTicketsAsReminded,
        { ticketIds: remindersSent as any }
      );
      console.log(
        `[ClassReminders] Marked ${remindersSent.length} tickets as reminded`
      );
    }

    console.log(`[ClassReminders] Sent ${sentCount} reminder emails`);
    return { sent: sentCount };
  },
});
