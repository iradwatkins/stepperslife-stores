/**
 * Utility functions for calculating chair positions around tables
 */

import { Position } from "./types";

export interface ChairPosition extends Position {
  rotation: number; // degrees
  seatNumber: number;
}

/**
 * Calculate chair positions for a round table
 * Chairs are evenly distributed around the perimeter
 */
export function calculateRoundTableChairs(
  centerX: number,
  centerY: number,
  radius: number,
  capacity: number
): ChairPosition[] {
  const chairs: ChairPosition[] = [];
  const angleStep = (2 * Math.PI) / capacity;

  // Start from top (270 degrees = -90 in radians)
  const startAngle = -Math.PI / 2;

  // Distance from center to chair (table radius + chair offset)
  const chairDistance = radius + 12; // 12px offset from table edge for larger chairs

  for (let i = 0; i < capacity; i++) {
    const angle = startAngle + i * angleStep;

    // Calculate chair center position
    const x = centerX + chairDistance * Math.cos(angle);
    const y = centerY + chairDistance * Math.sin(angle);

    // Rotation in degrees (facing toward table center)
    const rotation = (angle * 180) / Math.PI + 90;

    chairs.push({
      x: x - 10, // Offset by half chair width (20px)
      y: y - 7, // Offset by half chair height (14px)
      rotation,
      seatNumber: i + 1,
    });
  }

  return chairs;
}

/**
 * Calculate chair positions for a rectangular table
 * Chairs are distributed along all four sides
 */
export function calculateRectangularTableChairs(
  tableX: number,
  tableY: number,
  width: number,
  height: number,
  capacity: number
): ChairPosition[] {
  const chairs: ChairPosition[] = [];

  // Calculate perimeter
  const perimeter = 2 * (width + height);
  const spacing = perimeter / capacity;

  let currentDistance = 0;
  let seatNumber = 1;

  // Offset from table edge (larger for bigger chairs)
  const offset = 12;

  while (chairs.length < capacity) {
    let x = tableX + width / 2;
    let y = tableY + height / 2;
    let rotation = 0;

    // Top side
    if (currentDistance <= width) {
      x = tableX + currentDistance;
      y = tableY - offset;
      rotation = 180; // Facing down
    }
    // Right side
    else if (currentDistance <= width + height) {
      x = tableX + width + offset;
      y = tableY + (currentDistance - width);
      rotation = 270; // Facing left
    }
    // Bottom side
    else if (currentDistance <= 2 * width + height) {
      x = tableX + width - (currentDistance - width - height);
      y = tableY + height + offset;
      rotation = 0; // Facing up
    }
    // Left side
    else {
      x = tableX - offset;
      y = tableY + height - (currentDistance - 2 * width - height);
      rotation = 90; // Facing right
    }

    chairs.push({
      x: x - 10, // Offset by half chair width (20px)
      y: y - 7, // Offset by half chair height (14px)
      rotation,
      seatNumber,
    });

    currentDistance += spacing;
    seatNumber++;
  }

  return chairs;
}

/**
 * Calculate chair positions for a square table
 * Evenly distributed on all four sides
 */
export function calculateSquareTableChairs(
  tableX: number,
  tableY: number,
  size: number,
  capacity: number
): ChairPosition[] {
  // For square tables, use the rectangular calculation
  return calculateRectangularTableChairs(tableX, tableY, size, size, capacity);
}

/**
 * Get chair positions based on table shape
 */
export function getChairPositions(
  shape: "ROUND" | "RECTANGULAR" | "SQUARE" | "CUSTOM",
  tableX: number,
  tableY: number,
  width: number,
  height: number,
  capacity: number
): ChairPosition[] {
  switch (shape) {
    case "ROUND":
      const radius = width / 2;
      const centerX = tableX + radius;
      const centerY = tableY + radius;
      return calculateRoundTableChairs(centerX, centerY, radius, capacity);

    case "RECTANGULAR":
      return calculateRectangularTableChairs(tableX, tableY, width, height, capacity);

    case "SQUARE":
      return calculateSquareTableChairs(tableX, tableY, width, capacity);

    case "CUSTOM":
      // For custom shapes, use round table logic as default
      const customRadius = Math.min(width, height) / 2;
      const customCenterX = tableX + width / 2;
      const customCenterY = tableY + height / 2;
      return calculateRoundTableChairs(customCenterX, customCenterY, customRadius, capacity);

    default:
      return [];
  }
}
