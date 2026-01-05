/**
 * Cron Jobs for Automated Tasks
 *
 * Scheduled tasks that run periodically to maintain system state
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Expire Cash Orders
 * Runs every 5 minutes to check for and expire cash orders that have passed their 30-minute hold
 */
crons.interval(
  "expire-cash-orders",
  { minutes: 5 }, // Check every 5 minutes
  internal.orders.cashPaymentsCron.expireCashOrders
);

/**
 * Expire Hotel Reservations
 * Runs every 5 minutes to expire PENDING hotel reservations that have passed their 15-minute hold
 * This releases room inventory back to availability when checkout is abandoned
 */
crons.interval(
  "expire-hotel-reservations",
  { minutes: 5 }, // Check every 5 minutes
  internal.hotels.hotelCron.expireHotelReservations
);

/**
 * Release Expired Seat Holds
 * Runs every 5 minutes to release seat reservations that have passed their 15-minute hold
 * This prevents abandoned shopping carts from permanently blocking seats
 */
crons.interval(
  "release-expired-seat-holds",
  { minutes: 5 }, // Check every 5 minutes
  internal.seating.seatHoldsCron.releaseExpiredSeatHolds
);

/**
 * Class/Event Reminders
 * Runs every hour to send reminders for classes/events starting in the next 24 hours
 */
crons.interval(
  "send-class-reminders",
  { hours: 1 }, // Check every hour
  internal.notifications.classReminders.sendClassReminders
);

/**
 * Instructor Daily Digest
 * Runs at 8 AM Central time (14:00 UTC) to send daily enrollment summaries
 * Note: Convex cron times are in UTC
 */
crons.daily(
  "send-daily-digests",
  { hourUTC: 14, minuteUTC: 0 }, // 8 AM CST / 9 AM CDT
  internal.notifications.instructorDigests.sendDailyDigests
);

/**
 * Instructor Weekly Digest
 * Runs every Monday at 8 AM Central time (14:00 UTC)
 */
crons.weekly(
  "send-weekly-digests",
  { dayOfWeek: "monday", hourUTC: 14, minuteUTC: 0 }, // Monday 8 AM CST
  internal.notifications.instructorDigests.sendWeeklyDigests
);

export default crons;
