/**
 * Table Geometry Helper Functions
 * Calculates seat positions around tables based on table shape and capacity
 */

export interface SeatPosition {
  angle?: number;      // For round/custom tables (0-360 degrees)
  side?: string;       // For rectangular tables ("top", "bottom", "left", "right")
  offset?: number;     // Distance from table edge
  x: number;          // Absolute X coordinate
  y: number;          // Absolute Y coordinate
}

/**
 * Calculate seat positions around a round table
 * @param arcDegrees - Arc to place seats on (360 = full circle, 180 = half circle, 270 = 3/4 circle)
 * @param startAngle - Starting angle in degrees (0 = right, 90 = bottom, 180 = left, 270 = top)
 */
export function calculateRoundTableSeats(
  tableX: number,
  tableY: number,
  tableDiameter: number,
  seatCount: number,
  startAngle: number = 0,
  arcDegrees: number = 360
): SeatPosition[] {
  const positions: SeatPosition[] = [];
  const radius = tableDiameter / 2;
  const seatRadius = 15; // Visual seat size

  // For crescent/cabaret seating, distribute seats across the arc
  // Leave small gaps at start and end for better spacing
  const arcSpan = arcDegrees;
  const angleStep = seatCount > 1 ? arcSpan / (seatCount - 1) : 0;

  for (let i = 0; i < seatCount; i++) {
    const angle = startAngle + (i * angleStep);
    const radians = (angle * Math.PI) / 180;

    // Position seat on the perimeter of the table
    const x = tableX + radius + (radius + seatRadius) * Math.cos(radians);
    const y = tableY + radius + (radius + seatRadius) * Math.sin(radians);

    positions.push({
      angle,
      x,
      y,
      offset: seatRadius,
    });
  }

  return positions;
}

/**
 * Calculate seat positions around a rectangular table
 */
export function calculateRectangularTableSeats(
  tableX: number,
  tableY: number,
  tableWidth: number,
  tableHeight: number,
  seatCount: number
): SeatPosition[] {
  const positions: SeatPosition[] = [];
  const seatRadius = 15;
  const spacing = 40; // Space between seats

  // Determine how many seats per side
  // Priority: long sides get more seats
  const longSide = Math.max(tableWidth, tableHeight);
  const shortSide = Math.min(tableWidth, tableHeight);
  const isHorizontal = tableWidth >= tableHeight;

  // Distribute seats: 40% on each long side, 10% on each short side
  const longSideSeats = Math.floor(seatCount * 0.4);
  const shortSideSeats = Math.floor(seatCount * 0.1);
  const remainingSeats = seatCount - (longSideSeats * 2) - (shortSideSeats * 2);

  let topSeats = isHorizontal ? longSideSeats : shortSideSeats;
  let bottomSeats = isHorizontal ? longSideSeats : shortSideSeats;
  const leftSeats = isHorizontal ? shortSideSeats : longSideSeats;
  const rightSeats = isHorizontal ? shortSideSeats : longSideSeats;

  // Distribute remaining seats
  if (remainingSeats > 0) {
    topSeats += Math.floor(remainingSeats / 2);
    bottomSeats += Math.ceil(remainingSeats / 2);
  }

  // Top side
  for (let i = 0; i < topSeats; i++) {
    const x = tableX + (tableWidth / (topSeats + 1)) * (i + 1);
    const y = tableY - seatRadius;
    positions.push({ side: "top", x, y, offset: seatRadius });
  }

  // Bottom side
  for (let i = 0; i < bottomSeats; i++) {
    const x = tableX + (tableWidth / (bottomSeats + 1)) * (i + 1);
    const y = tableY + tableHeight + seatRadius;
    positions.push({ side: "bottom", x, y, offset: seatRadius });
  }

  // Left side
  for (let i = 0; i < leftSeats; i++) {
    const x = tableX - seatRadius;
    const y = tableY + (tableHeight / (leftSeats + 1)) * (i + 1);
    positions.push({ side: "left", x, y, offset: seatRadius });
  }

  // Right side
  for (let i = 0; i < rightSeats; i++) {
    const x = tableX + tableWidth + seatRadius;
    const y = tableY + (tableHeight / (rightSeats + 1)) * (i + 1);
    positions.push({ side: "right", x, y, offset: seatRadius });
  }

  return positions;
}

/**
 * Calculate seat positions around a square table
 */
export function calculateSquareTableSeats(
  tableX: number,
  tableY: number,
  tableSize: number,
  seatCount: number
): SeatPosition[] {
  const positions: SeatPosition[] = [];
  const seatRadius = 15;

  // Distribute seats evenly on all 4 sides
  const seatsPerSide = Math.ceil(seatCount / 4);
  const sides = ["top", "right", "bottom", "left"];
  let seatIndex = 0;

  for (const side of sides) {
    if (seatIndex >= seatCount) break;

    const seatsOnThisSide = Math.min(seatsPerSide, seatCount - seatIndex);

    for (let i = 0; i < seatsOnThisSide; i++) {
      let x = tableX;
      let y = tableY;

      switch (side) {
        case "top":
          x = tableX + (tableSize / (seatsOnThisSide + 1)) * (i + 1);
          y = tableY - seatRadius;
          break;
        case "bottom":
          x = tableX + (tableSize / (seatsOnThisSide + 1)) * (i + 1);
          y = tableY + tableSize + seatRadius;
          break;
        case "left":
          x = tableX - seatRadius;
          y = tableY + (tableSize / (seatsOnThisSide + 1)) * (i + 1);
          break;
        case "right":
          x = tableX + tableSize + seatRadius;
          y = tableY + (tableSize / (seatsOnThisSide + 1)) * (i + 1);
          break;
      }

      positions.push({ side, x, y, offset: seatRadius });
      seatIndex++;
    }
  }

  return positions;
}

/**
 * Auto-arrange seats around a table based on its shape
 * @param seatArc - Optional arc configuration for round tables { startAngle, arcDegrees }
 */
export function autoArrangeSeats(
  shape: "ROUND" | "RECTANGULAR" | "SQUARE" | "CUSTOM",
  tableX: number,
  tableY: number,
  tableWidth: number,
  tableHeight: number,
  seatCount: number,
  seatArc?: { startAngle?: number; arcDegrees?: number }
): SeatPosition[] {
  switch (shape) {
    case "ROUND":
      return calculateRoundTableSeats(
        tableX,
        tableY,
        tableWidth,
        seatCount,
        seatArc?.startAngle ?? 0,
        seatArc?.arcDegrees ?? 360
      );
    case "RECTANGULAR":
      return calculateRectangularTableSeats(tableX, tableY, tableWidth, tableHeight, seatCount);
    case "SQUARE":
      return calculateSquareTableSeats(tableX, tableY, tableWidth, seatCount);
    case "CUSTOM":
      // For custom shapes, default to round positioning
      return calculateRoundTableSeats(
        tableX,
        tableY,
        tableWidth,
        seatCount,
        seatArc?.startAngle ?? 0,
        seatArc?.arcDegrees ?? 360
      );
    default:
      return calculateRoundTableSeats(tableX, tableY, tableWidth, seatCount);
  }
}

/**
 * Calculate recommended table dimensions based on seat count
 */
export function getRecommendedTableSize(
  shape: "ROUND" | "RECTANGULAR" | "SQUARE" | "CUSTOM",
  seatCount: number
): { width: number; height: number } {
  const seatWidth = 50; // Approximate width per seat

  switch (shape) {
    case "ROUND":
      // Diameter based on circumference needed for seats
      const diameter = (seatCount * seatWidth) / Math.PI;
      return { width: Math.max(80, diameter), height: Math.max(80, diameter) };

    case "RECTANGULAR":
      // Make it 2:1 ratio
      const totalWidth = seatCount * seatWidth;
      const width = Math.sqrt(totalWidth * 2);
      const height = width / 2;
      return { width: Math.max(120, width), height: Math.max(60, height) };

    case "SQUARE":
      // Equal sides
      const sideLength = Math.sqrt(seatCount * seatWidth * seatWidth);
      return { width: Math.max(80, sideLength), height: Math.max(80, sideLength) };

    case "CUSTOM":
      // Default to round sizing
      const customDiameter = (seatCount * seatWidth) / Math.PI;
      return { width: Math.max(80, customDiameter), height: Math.max(80, customDiameter) };

    default:
      return { width: 100, height: 100 };
  }
}

/**
 * Check if two tables overlap
 */
export function doTablesOverlap(
  table1: { x: number; y: number; width: number; height: number },
  table2: { x: number; y: number; width: number; height: number },
  padding: number = 20
): boolean {
  return !(
    table1.x + table1.width + padding < table2.x ||
    table2.x + table2.width + padding < table1.x ||
    table1.y + table1.height + padding < table2.y ||
    table2.y + table2.height + padding < table1.y
  );
}

/**
 * Snap position to grid
 */
export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}
