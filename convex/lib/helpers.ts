/**
 * Shared helper utilities for Convex mutations and queries
 * Reduces duplication across mutation files
 */

/**
 * Get current timestamp and create both createdAt and updatedAt fields
 * Use this when creating new records
 *
 * @param now - Optional timestamp (defaults to Date.now())
 * @returns Object with createdAt and updatedAt timestamps
 *
 * @example
 * ```typescript
 * await ctx.db.insert("events", {
 *   ...eventData,
 *   ...getTimestamps()
 * });
 * ```
 */
export function getTimestamps(now: number = Date.now()) {
  return {
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get current timestamp for updatedAt field only
 * Use this when updating existing records
 *
 * @param now - Optional timestamp (defaults to Date.now())
 * @returns Object with updatedAt timestamp
 *
 * @example
 * ```typescript
 * await ctx.db.patch(eventId, {
 *   ...updates,
 *   ...getUpdateTimestamp()
 * });
 * ```
 */
export function getUpdateTimestamp(now: number = Date.now()) {
  return {
    updatedAt: now,
  };
}

/**
 * Get the current timestamp (convenience wrapper)
 * Use this when you need the raw timestamp value
 *
 * @returns Current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}
