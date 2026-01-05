import { useMemo } from "react";
import { isToday, isTomorrow, addHours, isWithinInterval, startOfDay } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

// Type for ticket data (matching the my-tickets page structure)
export type TicketData = {
  _id: Id<"tickets">;
  ticketCode: string | undefined;
  status: "CANCELLED" | "PENDING" | "VALID" | "SCANNED" | "REFUNDED" | "PENDING_ACTIVATION" | undefined;
  scannedAt: number | undefined;
  createdAt: number;
  eventId?: Id<"events">;
  attendeeEmail?: string;
  attendeeName?: string;
  bundleId?: string;
  bundleName?: string;
  event: {
    _id: Id<"events">;
    name: string;
    startDate: number | undefined;
    endDate: number | undefined;
    location?: string | {
      venueName?: string;
      address?: string;
      zipCode?: string;
      city: string;
      state: string;
      country: string;
    };
    imageUrl: string | undefined;
    eventType: string | undefined;
  } | null;
  tier: {
    name: string;
    price: number;
  } | null;
  order: {
    _id: Id<"orders">;
    totalCents: number;
    paidAt: number | undefined;
  } | null;
  seat: {
    sectionName: string;
    rowLabel: string;
    seatNumber: number;
  } | null;
};

/**
 * Filter tickets for events happening today or within the next 24 hours.
 * Only returns VALID tickets (ready to be scanned).
 */
export function useTodayTickets(tickets: TicketData[] | undefined) {
  return useMemo(() => {
    if (!tickets) return [];

    const now = new Date();
    const in24Hours = addHours(now, 24);
    const todayStart = startOfDay(now);

    return tickets.filter((ticket) => {
      // Must be VALID status
      if (ticket.status !== "VALID") return false;

      // Must have an event with start date
      if (!ticket.event?.startDate) return false;

      const eventStart = new Date(ticket.event.startDate);

      // Event starts within the next 24 hours or is today
      // (event could have started earlier today and still be happening)
      const isEventSoon = isWithinInterval(eventStart, {
        start: todayStart,
        end: in24Hours,
      });

      // Also include if event is currently happening (started today but not yet ended)
      const isEventToday = isToday(eventStart);
      const isEventTomorrow = isTomorrow(eventStart) && eventStart <= in24Hours;

      return isEventSoon || isEventToday || isEventTomorrow;
    });
  }, [tickets]);
}

/**
 * Get a display message based on when the event is happening
 */
export function getEventTimeMessage(startDate: number): string {
  const eventStart = new Date(startDate);
  const now = new Date();

  if (eventStart < now) {
    return "Event is happening now!";
  }

  if (isToday(eventStart)) {
    return "Your event is today!";
  }

  if (isTomorrow(eventStart)) {
    return "Your event is tomorrow!";
  }

  return "Event coming up soon!";
}
