/**
 * Shared constants used across the SteppersLife application
 * This file can be imported from both frontend and Convex backend
 */

/**
 * Event Categories - DO NOT MODIFY
 * These are the only valid categories for events in the SteppersLife platform
 */
export const EVENT_CATEGORIES = [
  "Set",
  "Workshop",
  "Save the Date",
  "Cruise",
  "Outdoor",
  "Holiday Event",
  "Weekend Event",
  "Comedy Shows",
  "Trips",
  "Concerts",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/**
 * Ticket Status values
 */
export const TICKET_STATUSES = [
  "VALID",
  "PENDING",
  "PENDING_ACTIVATION",
  "SCANNED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * Event Status values
 */
export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/**
 * Payment Methods
 */
export const PAYMENT_METHODS = [
  "STRIPE",
  "SQUARE",
  "PAYPAL",
  "CASH",
  "ZELLE",
  "CASHAPP",
  "VENMO",
  "PENDING",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Payment Models
 */
export const PAYMENT_MODELS = [
  "PREPAY",
  "PAY_AT_DOOR",
] as const;

export type PaymentModel = (typeof PAYMENT_MODELS)[number];

/**
 * User Roles
 */
export const USER_ROLES = [
  "user",
  "organizer",
  "admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Staff Roles
 */
export const STAFF_ROLES = [
  "STAFF",
  "TEAM_MEMBERS",
  "ASSOCIATES",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
