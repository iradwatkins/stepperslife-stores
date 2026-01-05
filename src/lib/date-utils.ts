/**
 * Date utility functions for event filtering
 * Story 3.5: "This Weekend" Quick Filter
 */

export type EventFilter = 'tonight' | 'weekend' | 'month' | 'all';

/**
 * Get the end of the current day in the given timezone
 */
export function getEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get the start of the current day
 */
export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get the end of the current month
 */
export function getEndOfMonth(date: Date): Date {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get the start of the weekend (Friday 5pm)
 * If we're already past Friday 5pm, return now
 * If we're on Saturday or Sunday, return now
 */
export function getWeekendStart(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

  // If it's already the weekend (Saturday or Sunday), return the start of today
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return getStartOfDay(date);
  }

  // If it's Friday
  if (dayOfWeek === 5) {
    const friday5pm = new Date(date);
    friday5pm.setHours(17, 0, 0, 0);

    // If we're past 5pm, return now
    if (date >= friday5pm) {
      return date;
    }
    // Otherwise, return Friday 5pm
    return friday5pm;
  }

  // It's Monday-Thursday, find next Friday at 5pm
  const daysUntilFriday = 5 - dayOfWeek;
  const friday = new Date(date);
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(17, 0, 0, 0);
  return friday;
}

/**
 * Get the end of the weekend (Sunday 11:59pm)
 */
export function getWeekendEnd(date: Date): Date {
  const dayOfWeek = date.getDay();

  // Calculate days until Sunday
  let daysUntilSunday: number;
  if (dayOfWeek === 0) {
    // It's Sunday, end is end of today
    daysUntilSunday = 0;
  } else {
    daysUntilSunday = 7 - dayOfWeek;
  }

  const sunday = new Date(date);
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Check if the current time is during the weekend (Friday 5pm - Sunday midnight)
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();

  // Saturday or Sunday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Friday after 5pm
  if (dayOfWeek === 5 && date.getHours() >= 17) {
    return true;
  }

  return false;
}

/**
 * Get the date range for a given filter
 */
export function getFilterDateRange(filter: EventFilter): { start: number; end: number | null } {
  const now = new Date();

  switch (filter) {
    case 'tonight':
      return {
        start: now.getTime(),
        end: getEndOfDay(now).getTime()
      };

    case 'weekend':
      // If we're already in the weekend, start from now
      // Otherwise, start from Friday 5pm
      const weekendStart = isWeekend(now) ? now : getWeekendStart(now);
      return {
        start: weekendStart.getTime(),
        end: getWeekendEnd(now).getTime()
      };

    case 'month':
      return {
        start: now.getTime(),
        end: getEndOfMonth(now).getTime()
      };

    case 'all':
    default:
      return {
        start: now.getTime(),
        end: null
      };
  }
}

/**
 * Format the filter label with dynamic text
 */
export function getFilterLabel(filter: EventFilter): string {
  switch (filter) {
    case 'tonight':
      return 'Tonight';
    case 'weekend':
      return 'This Weekend';
    case 'month':
      return 'This Month';
    case 'all':
      return 'All Events';
    default:
      return 'All Events';
  }
}

/**
 * Get empty state message for a filter
 */
export function getEmptyStateMessage(filter: EventFilter): { title: string; subtitle: string } {
  switch (filter) {
    case 'tonight':
      return {
        title: 'No events tonight',
        subtitle: 'Check out what\'s happening this weekend!'
      };
    case 'weekend':
      return {
        title: 'No events this weekend',
        subtitle: 'Browse all upcoming events for more options.'
      };
    case 'month':
      return {
        title: 'No events this month',
        subtitle: 'Check back soon for new events!'
      };
    case 'all':
    default:
      return {
        title: 'No events found',
        subtitle: 'Check back soon for upcoming events!'
      };
  }
}
