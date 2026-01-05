"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
} from "lucide-react";
import { YearCalendarView } from "./YearCalendarView";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Configure date-fns localizer
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    imageUrl?: string;
    status?: string;
    type?: string;
    [key: string]: unknown;
  };
}

interface OrganizerCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventEdit?: (eventId: string) => void;
  eventType: "event" | "class";
  colorMap?: Record<string, string>;
}

type CalendarViewType = "day" | "week" | "month" | "year";

export function OrganizerCalendar({
  events,
  onEventClick,
  onEventEdit,
  eventType,
  colorMap = {},
}: OrganizerCalendarProps) {
  // Fix hydration: Don't render until client-side mounted
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarViewType>("month");

  // Initialize on client-side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date());
    setIsMounted(true);
  }, []);

  // Navigate to today
  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Navigate previous/next
  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((prev) => {
        if (!prev) return new Date();
        if (view === "year") {
          return direction === "prev"
            ? new Date(prev.getFullYear() - 1, 0, 1)
            : new Date(prev.getFullYear() + 1, 0, 1);
        } else if (view === "month") {
          return direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1);
        } else if (view === "week") {
          const days = direction === "prev" ? -7 : 7;
          return new Date(prev.getTime() + days * 24 * 60 * 60 * 1000);
        } else {
          const days = direction === "prev" ? -1 : 1;
          return new Date(prev.getTime() + days * 24 * 60 * 60 * 1000);
        }
      });
    },
    [view]
  );

  // Handle view change
  const handleViewChange = useCallback((newView: CalendarViewType) => {
    setView(newView);
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (onEventClick) {
        onEventClick(event);
      }
    },
    [onEventClick]
  );

  // Handle drilling down from year view
  const handleDrillDown = useCallback((date: Date) => {
    setCurrentDate(date);
    setView("month");
  }, []);

  // Get title based on current view and date
  const title = useMemo(() => {
    if (!currentDate) return "Loading...";
    if (view === "year") {
      return currentDate.getFullYear().toString();
    }
    if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    }
    if (view === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [currentDate, view]);

  // Custom event styling
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const isDraft = event.resource?.status === "DRAFT";
      const type = event.resource?.type;
      let backgroundColor = "#3b82f6"; // default blue

      if (type && colorMap[type]) {
        backgroundColor = colorMap[type];
      }

      return {
        style: {
          backgroundColor,
          opacity: isDraft ? 0.6 : 1,
          borderRadius: "4px",
          border: "none",
          color: "white",
          fontSize: "12px",
          padding: "2px 4px",
        },
      };
    },
    [colorMap]
  );

  // Custom toolbar - we're rendering our own
  const CustomToolbar = () => null;

  // Show loading skeleton until client-side mounted (prevents hydration mismatch)
  if (!isMounted || !currentDate) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
            <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
            <div className="w-16 h-8 bg-muted rounded-lg animate-pulse" />
            <div className="w-32 h-6 bg-muted rounded animate-pulse ml-2" />
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-14 h-8 bg-muted/80 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
        <div className="p-4">
          <div className="h-[700px] bg-muted/20 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Custom Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border bg-muted/30">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigate("prev")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleNavigate("next")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
          >
            Today
          </button>
          <h2 className="text-lg font-semibold text-foreground ml-2">{title}</h2>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["day", "week", "month", "year"] as CalendarViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                view === v
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-4">
        {view === "year" ? (
          <YearCalendarView
            events={events}
            currentDate={currentDate}
            onMonthClick={handleDrillDown}
            onDateClick={(date) => {
              setCurrentDate(date);
              setView("day");
            }}
            colorMap={colorMap}
          />
        ) : (
          <div className="organizer-calendar">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: view === "day" ? 600 : 700 }}
              date={currentDate}
              onNavigate={setCurrentDate}
              view={view as View}
              onView={(v) => setView(v as CalendarViewType)}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              toolbar={false}
              popup
              selectable
              views={["month", "week", "day"]}
            />
          </div>
        )}
      </div>

      {/* Custom CSS for react-big-calendar */}
      <style jsx global>{`
        .organizer-calendar .rbc-calendar {
          font-family: inherit;
        }
        .organizer-calendar .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.3);
        }
        .organizer-calendar .rbc-month-view,
        .organizer-calendar .rbc-time-view {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          overflow: hidden;
        }
        .organizer-calendar .rbc-day-bg {
          border-left: 1px solid hsl(var(--border));
        }
        .organizer-calendar .rbc-day-bg:first-child {
          border-left: none;
        }
        .organizer-calendar .rbc-month-row {
          border-bottom: 1px solid hsl(var(--border));
        }
        .organizer-calendar .rbc-month-row:last-child {
          border-bottom: none;
        }
        .organizer-calendar .rbc-date-cell {
          padding: 4px 8px;
          font-size: 14px;
        }
        .organizer-calendar .rbc-today {
          background-color: hsl(var(--primary) / 0.1);
        }
        .organizer-calendar .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }
        .organizer-calendar .rbc-off-range {
          color: hsl(var(--muted-foreground) / 0.5);
        }
        .organizer-calendar .rbc-event {
          cursor: pointer;
        }
        .organizer-calendar .rbc-event:hover {
          filter: brightness(1.1);
        }
        .organizer-calendar .rbc-show-more {
          color: hsl(var(--primary));
          font-size: 12px;
          font-weight: 500;
          background: transparent;
        }
        .organizer-calendar .rbc-time-header {
          border-bottom: 1px solid hsl(var(--border));
        }
        .organizer-calendar .rbc-time-content {
          border-top: none;
        }
        .organizer-calendar .rbc-time-slot {
          border-top: 1px solid hsl(var(--border) / 0.5);
        }
        .organizer-calendar .rbc-timeslot-group {
          border-bottom: 1px solid hsl(var(--border));
        }
        .organizer-calendar .rbc-time-gutter {
          background: hsl(var(--muted) / 0.3);
        }
        .organizer-calendar .rbc-current-time-indicator {
          background-color: hsl(var(--destructive));
        }
        .organizer-calendar .rbc-allday-cell {
          border-bottom: 1px solid hsl(var(--border));
        }
        .organizer-calendar .rbc-day-slot .rbc-events-container {
          margin-right: 4px;
        }
      `}</style>
    </div>
  );
}
