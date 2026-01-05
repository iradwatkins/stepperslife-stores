/**
 * Design System Constants for Seating Chart
 * Based on Ticetux design reference
 */

export const SEAT_COLORS = {
  AVAILABLE: '#4CAF50',   // Green - seat is available
  SELECTED: '#FFC107',    // Yellow - seat is in cart/selected
  SOLD: '#999999',        // Grey - seat is already sold
  RESERVED: '#2196F3',    // Blue - seat is reserved
} as const;

export const TABLE_COLORS = {
  STROKE: '#2c3e50',      // Dark blue-grey for table outlines
  FILL_NONE: 'none',      // Outlined style (no fill)
  HOVER: '#3498db',       // Light blue on hover
  SELECTED: '#e74c3c',    // Red when selected for editing
} as const;

export const ZONE_COLORS = {
  VIP: '#FFD700',         // Gold for VIP zones
  GENERAL: '#95a5a6',     // Grey for general admission
  PREMIUM: '#9b59b6',     // Purple for premium zones
} as const;

export const STROKE_WIDTH = {
  TABLE: 3,               // Table outline stroke width
  SEAT: 2,                // Individual seat stroke width
  SELECTED: 4,            // Selected element stroke width
} as const;

export const SPACING = {
  SEAT_PADDING: 4,        // Padding between seats
  TABLE_MARGIN: 20,       // Minimum margin between tables
} as const;

export const LAYOUT = {
  LIBRARY_WIDTH: 280,     // Left sidebar width (desktop)
  PROPERTIES_WIDTH: 350,  // Right sidebar width (desktop)
  TOOL_PALETTE_WIDTH: 64, // Legacy tool palette (to be removed)
  MOBILE_BREAKPOINT: 768, // Mobile breakpoint (px)
  TABLET_BREAKPOINT: 1024, // Tablet breakpoint (px)
} as const;
