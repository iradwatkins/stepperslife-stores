"use client";

import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { CalendarEvent } from "./OrganizerCalendar";

interface YearCalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onMonthClick?: (date: Date) => void;
  onDateClick?: (date: Date) => void;
  colorMap?: Record<string, string>;
}

export function YearCalendarView({
  events,
  currentDate,
  onMonthClick,
  onDateClick,
  colorMap = {},
}: YearCalendarViewProps) {
  const year = currentDate.getFullYear();

  // Get all months for the year
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [year]);

  // Group events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const dateKey = format(event.start, "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Count events per month
  const eventsPerMonth = useMemo(() => {
    const counts: Record<number, number> = {};
    events.forEach((event) => {
      const eventYear = event.start.getFullYear();
      if (eventYear === year) {
        const month = event.start.getMonth();
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    return counts;
  }, [events, year]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map((month, monthIndex) => (
        <MonthMiniCalendar
          key={monthIndex}
          month={month}
          eventsByDate={eventsByDate}
          eventCount={eventsPerMonth[monthIndex] || 0}
          onMonthClick={onMonthClick}
          onDateClick={onDateClick}
          colorMap={colorMap}
        />
      ))}
    </div>
  );
}

interface MonthMiniCalendarProps {
  month: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  eventCount: number;
  onMonthClick?: (date: Date) => void;
  onDateClick?: (date: Date) => void;
  colorMap?: Record<string, string>;
}

function MonthMiniCalendar({
  month,
  eventsByDate,
  eventCount,
  onMonthClick,
  onDateClick,
  colorMap = {},
}: MonthMiniCalendarProps) {
  // Generate calendar days for this month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [month]);

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div
      className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={() => onMonthClick?.(month)}
    >
      {/* Month Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
          {format(month, "MMMM")}
        </h3>
        {eventCount > 0 && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {eventCount} {eventCount === 1 ? "event" : "events"}
          </span>
        )}
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="text-[10px] font-medium text-muted-foreground text-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px">
        {calendarDays.map((day, i) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] || [];
          const hasEvents = dayEvents.length > 0;
          const isCurrentMonth = isSameMonth(day, month);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (hasEvents && onDateClick) {
                  onDateClick(day);
                }
              }}
              className={`
                aspect-square flex flex-col items-center justify-center text-[10px] rounded relative
                ${!isCurrentMonth ? "text-muted-foreground/40" : "text-foreground"}
                ${isCurrentDay ? "bg-primary text-white font-bold" : ""}
                ${hasEvents && !isCurrentDay ? "font-semibold" : ""}
                ${hasEvents ? "hover:bg-primary/20 cursor-pointer" : "cursor-default"}
              `}
            >
              <span>{format(day, "d")}</span>
              {/* Event Dots */}
              {hasEvents && isCurrentMonth && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event, idx) => {
                    const eventType = event.resource?.type;
                    const color = (eventType && colorMap[eventType]) || "#3b82f6";
                    return (
                      <div
                        key={idx}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: isCurrentDay ? "white" : color }}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className={`text-[6px] ${isCurrentDay ? "text-white" : "text-muted-foreground"}`}>
                      +
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
