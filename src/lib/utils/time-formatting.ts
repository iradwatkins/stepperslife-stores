/**
 * Time formatting utilities for notifications and timestamps
 */

/**
 * Format a timestamp into a human-readable relative time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable time string (e.g., "Just now", "5m ago", "2h ago", "3d ago")
 */
export function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
