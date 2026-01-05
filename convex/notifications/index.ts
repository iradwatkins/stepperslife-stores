/**
 * Notifications Module
 *
 * Provides real-time notification system for SteppersLife.
 *
 * Notification Types:
 * - order: Ticket purchases, refunds, order updates
 * - event: Event updates, cancellations, reminders
 * - ticket: Ticket transfers, check-ins
 * - class: Class enrollments, cancellations, instructor updates
 * - payout: Payout requests, approvals, completions
 * - review: New reviews, review responses
 * - message: Direct messages, support tickets
 * - system: Platform announcements, maintenance
 * - promotion: Promotional offers, discounts
 *
 * Usage:
 *
 * // Queries (client-side, real-time)
 * import { api } from "@/convex/_generated/api";
 * const notifications = useQuery(api.notifications.queries.getMyNotifications, { limit: 10 });
 * const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
 *
 * // Mutations (client-side)
 * const markAsRead = useMutation(api.notifications.mutations.markAsRead);
 * await markAsRead({ notificationId: "..." });
 *
 * // Internal mutations (server-side only)
 * import { internal } from "@/convex/_generated/api";
 * await ctx.runMutation(internal.notifications.mutations.create, { ... });
 */

export * as queries from "./queries";
export * as mutations from "./mutations";
export * as pushSubscriptions from "./pushSubscriptions";
