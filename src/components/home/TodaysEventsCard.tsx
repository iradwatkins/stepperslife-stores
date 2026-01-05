"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import { ScanLine, MapPin, Clock, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TodaysEventsCard
 *
 * A role-aware homepage section that shows today's events for staff/organizers.
 * Only visible to users with scanning permissions (staff, organizers, admins).
 * Provides quick access to scan tickets for each event.
 */
export function TodaysEventsCard() {
  const { user, isAuthenticated } = useAuth();

  // Query to get today's events that user can scan
  const todaysEvents = useQuery(
    api.scanning.queries.getTodaysScannableEvents,
    isAuthenticated ? {} : "skip"
  );

  // Don't render if:
  // - User is not authenticated
  // - User is a regular user (not staff/organizer/admin)
  // - No events today
  // - Still loading
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if user has scanning permissions based on role
  // The query already filters by permission, so if we get results, user can scan
  if (todaysEvents === undefined) {
    // Still loading
    return null;
  }

  if (todaysEvents.length === 0) {
    // No events today
    return null;
  }

  // Format time for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <section className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 md:p-6 mb-6 border border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              Your Events Today
            </h2>
            <p className="text-sm text-muted-foreground">
              {todaysEvents.length} event{todaysEvents.length > 1 ? "s" : ""} requiring check-in
            </p>
          </div>
        </div>

        {/* Quick scan all link */}
        <Link
          href="/staff/scan-tickets"
          className="hidden md:flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Scan Tickets
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {todaysEvents.map((event) => (
          <div
            key={event._id}
            className={cn(
              "bg-card rounded-lg overflow-hidden",
              "border border-border hover:border-primary/50",
              "transition-all duration-200",
              "group"
            )}
          >
            {/* Event Image */}
            <div className="relative h-24 md:h-28 bg-muted">
              {event.imageUrl ? (
                <Image
                  src={event.imageUrl}
                  alt={event.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Calendar className="w-8 h-8 text-primary/50" />
                </div>
              )}
              {/* Time Badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(event.startDate)}
              </div>
            </div>

            {/* Event Info */}
            <div className="p-3">
              <h3 className="font-semibold text-sm md:text-base line-clamp-1 text-foreground">
                {event.name}
              </h3>
              {(event.venue || event.location) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 line-clamp-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {event.venue || (typeof event.location === 'string'
                    ? event.location
                    : event.location && [event.location.venueName, event.location.city, event.location.state].filter(Boolean).join(', '))}
                </p>
              )}

              {/* Scan Button */}
              <Link
                href={`/scan/${event._id}`}
                className={cn(
                  "mt-3 w-full flex items-center justify-center gap-2",
                  "py-2 px-3 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "text-sm font-medium",
                  "hover:bg-primary/90 active:scale-[0.98]",
                  "transition-all duration-200"
                )}
              >
                <ScanLine className="w-4 h-4" />
                Scan Tickets
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: View all scanner link */}
      <Link
        href="/staff/scan-tickets"
        className="mt-4 md:hidden flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View All Events
        <ChevronRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
