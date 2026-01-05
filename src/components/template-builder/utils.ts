/**
 * Utility functions for the template builder
 */

import {
  CanvasItem,
  TableItem,
  RowSectionItem,
  StageItem,
  DanceFloorItem,
  Position,
  Section,
} from "./types";

/**
 * Generate a unique ID for canvas items
 */
export function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique section ID
 */
export function generateSectionId(): string {
  return `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get table size based on shape and capacity
 */
export function getTableSize(
  shape: TableItem["shape"],
  capacity: number
): { width: number; height: number } {
  // Special handling for 2-seat tables (intimate/bistro size)
  if (capacity === 2) {
    switch (shape) {
      case "ROUND":
        return { width: 50, height: 50 };
      case "RECTANGULAR":
        return { width: 90, height: 45 };
      case "SQUARE":
        return { width: 50, height: 50 };
      case "CUSTOM":
        return { width: 55, height: 55 };
      default:
        return { width: 50, height: 50 };
    }
  }

  // Base size increases with capacity
  const baseSize = Math.max(60, Math.min(140, 60 + capacity * 8));

  switch (shape) {
    case "ROUND":
      // Round tables grow proportionally
      return { width: baseSize, height: baseSize };

    case "RECTANGULAR":
      // Rectangular tables are distinctly wider and shorter
      // Small tables (4 seats): 100x50
      // Medium tables (6 seats): 130x60
      // Large tables (8+ seats): 160x70
      const rectWidth = baseSize * 1.8;
      const rectHeight = baseSize * 0.6;
      return { width: rectWidth, height: rectHeight };

    case "SQUARE":
      // Square tables are smaller than round
      return { width: baseSize * 0.9, height: baseSize * 0.9 };

    case "CUSTOM":
      return { width: baseSize * 1.2, height: baseSize * 1.2 };

    default:
      return { width: 80, height: 80 };
  }
}

/**
 * Create a default table item
 */
export function createDefaultTable(
  position: Position,
  shape: TableItem["shape"] = "ROUND",
  capacity: number = 8
): TableItem {
  return {
    id: generateId(),
    type: "TABLE",
    shape,
    capacity,
    position,
    size: getTableSize(shape, capacity),
    rotation: 0,
    color: "#3B82F6", // blue-600
  };
}

/**
 * Calculate row section size based on configuration
 */
export function calculateRowSectionSize(
  rowCount: number,
  seatsPerRow: number
): { width: number; height: number } {
  // Visual constants matching Canvas.tsx rendering
  const seatWidth = 16;
  const seatHeight = 16;
  const seatGap = 3;
  const rowGap = 8;
  const padding = 16; // p-4
  const rowLabelWidth = 20;
  const labelGap = 8;
  const headerHeight = 60; // Header text + border + margins

  // Calculate width: padding + rowLabel + gap + seats + gaps between seats + padding
  const width =
    padding +
    rowLabelWidth +
    labelGap +
    seatsPerRow * seatWidth +
    (seatsPerRow - 1) * seatGap +
    padding;

  // Calculate height: padding + header + rows + gaps between rows + padding
  const displayRows = Math.min(rowCount, 8); // Only display up to 8 rows
  const height =
    padding +
    headerHeight +
    displayRows * seatHeight +
    (displayRows - 1) * rowGap +
    padding +
    (rowCount > 8 ? 25 : 0); // Extra for "more rows" indicator

  return { width, height };
}

/**
 * Create a default row section item
 */
export function createDefaultRowSection(position: Position): RowSectionItem {
  const rowCount = 5;
  const seatsPerRow = 10;

  return {
    id: generateId(),
    type: "ROW_SECTION",
    rowCount,
    seatsPerRow,
    position,
    size: calculateRowSectionSize(rowCount, seatsPerRow),
    rowSpacing: 30,
    seatSpacing: 25,
    color: "#8B5CF6", // primary
  };
}

/**
 * Create a default stage item
 */
export function createDefaultStage(position: Position): StageItem {
  return {
    id: generateId(),
    type: "STAGE",
    position,
    size: { width: 200, height: 100 },
    rotation: 0,
    color: "#EF4444", // red-500
    label: "Stage",
  };
}

/**
 * Create a default dance floor item
 */
export function createDefaultDanceFloor(position: Position): DanceFloorItem {
  return {
    id: generateId(),
    type: "DANCE_FLOOR",
    position,
    size: { width: 180, height: 180 },
    rotation: 0,
    color: "#EC4899", // pink-500
    label: "Dance Floor",
  };
}

/**
 * Check if a point is inside an item's bounds
 */
export function isPointInItem(point: Position, item: CanvasItem): boolean {
  const { x, y } = point;
  const { position, size } = item;

  return (
    x >= position.x &&
    x <= position.x + size.width &&
    y >= position.y &&
    y <= position.y + size.height
  );
}

/**
 * Snap position to grid
 */
export function snapToGrid(position: Position, gridSize: number = 10): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

/**
 * Calculate total capacity from canvas items
 */
export function calculateTotalCapacity(items: CanvasItem[]): number {
  return items.reduce((total, item) => {
    if (item.type === "TABLE") {
      return total + item.capacity;
    } else if (item.type === "ROW_SECTION") {
      return total + item.rowCount * item.seatsPerRow;
    }
    return total;
  }, 0);
}

/**
 * Convert canvas items to sections format for backend
 */
export function convertToSections(items: CanvasItem[], sections: Section[]): any[] {
  // Group items by section
  const sectionGroups = new Map<string, CanvasItem[]>();

  // First, add all items to "Default" section if no sections defined
  if (sections.length === 0) {
    return [
      {
        id: "default",
        name: "Main Area",
        color: "#3B82F6",
        containerType: "MIXED",
        tables: items
          .filter((item): item is TableItem => item.type === "TABLE")
          .map(tableItemToBackendFormat),
        rows: items
          .filter((item): item is RowSectionItem => item.type === "ROW_SECTION")
          .flatMap(rowSectionToBackendFormat),
      },
    ];
  }

  // Group items by section
  sections.forEach((section) => {
    const sectionItems = items.filter((item) => section.itemIds.includes(item.id));
    sectionGroups.set(section.id, sectionItems);
  });

  // Convert to backend format
  return sections.map((section) => {
    const sectionItems = sectionGroups.get(section.id) || [];
    const tables = sectionItems.filter((item): item is TableItem => item.type === "TABLE");
    const rowSections = sectionItems.filter(
      (item): item is RowSectionItem => item.type === "ROW_SECTION"
    );

    const hasRows = rowSections.length > 0;
    const hasTables = tables.length > 0;

    const containerType = hasRows && hasTables ? "MIXED" : hasRows ? "ROWS" : "TABLES";

    return {
      id: section.id,
      name: section.name,
      color: section.color,
      containerType,
      ...(hasTables && {
        tables: tables.map(tableItemToBackendFormat),
      }),
      ...(hasRows && {
        rows: rowSections.flatMap(rowSectionToBackendFormat),
      }),
    };
  });
}

/**
 * Convert table item to backend format
 */
function tableItemToBackendFormat(table: TableItem): any {
  return {
    id: table.id,
    shape: table.shape,
    capacity: table.capacity,
    label: table.label,
    position: table.position,
    rotation: table.rotation,
    seats: generateSeatsForTable(table),
  };
}

/**
 * Convert row section to backend format (expands into individual rows)
 */
function rowSectionToBackendFormat(rowSection: RowSectionItem): any[] {
  const rows = [];
  for (let i = 0; i < rowSection.rowCount; i++) {
    rows.push({
      id: `${rowSection.id}_row_${i + 1}`,
      rowNumber: i + 1,
      label: rowSection.label ? `${rowSection.label} Row ${i + 1}` : `Row ${i + 1}`,
      seats: generateSeatsForRow(rowSection.seatsPerRow, i + 1),
    });
  }
  return rows;
}

/**
 * Generate seat objects for a table
 */
function generateSeatsForTable(table: TableItem): any[] {
  const seats = [];
  for (let i = 0; i < table.capacity; i++) {
    seats.push({
      id: `${table.id}_seat_${i + 1}`,
      number: i + 1,
      label: `${i + 1}`,
      status: "AVAILABLE",
    });
  }
  return seats;
}

/**
 * Generate seat objects for a row
 */
function generateSeatsForRow(seatCount: number, rowNumber: number): any[] {
  const seats = [];
  for (let i = 0; i < seatCount; i++) {
    seats.push({
      id: `seat_r${rowNumber}_s${i + 1}`,
      number: i + 1,
      label: `${String.fromCharCode(64 + rowNumber)}${i + 1}`, // A1, A2, B1, B2, etc.
      status: "AVAILABLE",
    });
  }
  return seats;
}

/**
 * Get color palette for sections
 */
export const SECTION_COLORS = [
  "#3B82F6", // blue
  "#0EA5E9", // sky
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // green
  "#6366F1", // indigo
  "#F97316", // orange
  "#14B8A6", // teal
];

/**
 * Get next available section color
 */
export function getNextSectionColor(usedColors: string[]): string {
  const availableColor = SECTION_COLORS.find((color) => !usedColors.includes(color));
  return availableColor || SECTION_COLORS[0];
}
