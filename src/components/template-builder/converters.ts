/**
 * Converter utilities for transforming between backend sections format and canvas items
 */

import { CanvasItem, TableItem, RowSectionItem } from "./types";
import { generateId, getTableSize } from "./utils";

/**
 * Convert backend sections format to canvas items
 * Used when loading existing templates into the visual builder
 */
export function sectionsToCanvasItems(sections: any[]): CanvasItem[] {
  const canvasItems: CanvasItem[] = [];

  if (!sections || sections.length === 0) {
    return canvasItems;
  }

  // Starting position for auto-layout
  let currentY = 50;
  const xPadding = 50;

  sections.forEach((section, sectionIndex) => {
    let currentX = xPadding;

    // Process tables in this section
    if (section.tables && Array.isArray(section.tables)) {
      section.tables.forEach((table: any) => {
        const tableItem: TableItem = {
          id: table.id || generateId(),
          type: "TABLE",
          shape: table.shape || "ROUND",
          capacity: table.capacity || table.seats?.length || 8,
          position: table.position || { x: currentX, y: currentY },
          size: getTableSize(table.shape || "ROUND", table.capacity || table.seats?.length || 8),
          rotation: table.rotation || 0,
          label: table.label,
          color: section.color || "#3B82F6",
        };

        canvasItems.push(tableItem);
        currentX += tableItem.size.width + 30; // Add spacing
      });
    }

    // Process rows in this section
    if (section.rows && Array.isArray(section.rows)) {
      // Group consecutive rows into row sections
      const rowGroups = groupConsecutiveRows(section.rows);

      rowGroups.forEach((group) => {
        const rowSection: RowSectionItem = {
          id: generateId(),
          type: "ROW_SECTION",
          rowCount: group.rows.length,
          seatsPerRow: group.seatsPerRow,
          position: { x: currentX, y: currentY },
          size: { width: 300, height: 150 },
          label: section.name || group.label,
          color: section.color || "#8B5CF6",
          rowSpacing: 30,
          seatSpacing: 25,
        };

        canvasItems.push(rowSection);
        currentX += rowSection.size.width + 30;
      });
    }

    // Move to next row for next section
    currentY += 200;
  });

  return canvasItems;
}

/**
 * Group consecutive rows that have the same seat count into row sections
 */
function groupConsecutiveRows(
  rows: any[]
): Array<{ rows: any[]; seatsPerRow: number; label?: string }> {
  if (!rows || rows.length === 0) return [];

  const groups: Array<{ rows: any[]; seatsPerRow: number; label?: string }> = [];
  let currentGroup: any[] = [];
  let currentSeatsPerRow = 0;

  rows.forEach((row, index) => {
    const seatsPerRow = row.seats?.length || 0;

    if (index === 0 || seatsPerRow === currentSeatsPerRow) {
      currentGroup.push(row);
      currentSeatsPerRow = seatsPerRow;
    } else {
      // Start a new group
      if (currentGroup.length > 0) {
        groups.push({
          rows: currentGroup,
          seatsPerRow: currentSeatsPerRow,
          label: currentGroup[0].label,
        });
      }
      currentGroup = [row];
      currentSeatsPerRow = seatsPerRow;
    }
  });

  // Add the last group
  if (currentGroup.length > 0) {
    groups.push({
      rows: currentGroup,
      seatsPerRow: currentSeatsPerRow,
      label: currentGroup[0].label,
    });
  }

  return groups;
}

/**
 * Validate that canvas items can be converted to sections
 */
export function validateCanvasItems(items: CanvasItem[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push("No items to save");
  }

  items.forEach((item, index) => {
    if (item.type === "TABLE") {
      const table = item as TableItem;
      if (!table.capacity || table.capacity < 1) {
        errors.push(`Table at index ${index} has invalid capacity`);
      }
      if (!table.shape) {
        errors.push(`Table at index ${index} is missing shape`);
      }
    } else if (item.type === "ROW_SECTION") {
      const rowSection = item as RowSectionItem;
      if (!rowSection.rowCount || rowSection.rowCount < 1) {
        errors.push(`Row section at index ${index} has invalid row count`);
      }
      if (!rowSection.seatsPerRow || rowSection.seatsPerRow < 1) {
        errors.push(`Row section at index ${index} has invalid seats per row`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
