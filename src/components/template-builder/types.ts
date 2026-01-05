/**
 * Type definitions for the visual seating template builder
 */

export type TableShape = "ROUND" | "RECTANGULAR" | "SQUARE" | "CUSTOM";
export type ItemType = "TABLE" | "ROW_SECTION" | "STAGE" | "DANCE_FLOOR";

/**
 * Position on the canvas (in pixels)
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * A table item on the canvas
 */
export interface TableItem {
  id: string;
  type: "TABLE";
  shape: TableShape;
  capacity: number;
  position: Position;
  size: Size;
  rotation: number; // degrees
  label?: string;
  color?: string;
}

/**
 * A row section item on the canvas (theater-style seating)
 */
export interface RowSectionItem {
  id: string;
  type: "ROW_SECTION";
  rowCount: number;
  seatsPerRow: number;
  position: Position;
  size: Size;
  label?: string;
  color?: string;
  rowSpacing: number; // pixels between rows
  seatSpacing: number; // pixels between seats
}

/**
 * A stage item on the canvas
 */
export interface StageItem {
  id: string;
  type: "STAGE";
  position: Position;
  size: Size;
  label?: string;
  color?: string;
  rotation: number; // degrees
}

/**
 * A dance floor item on the canvas
 */
export interface DanceFloorItem {
  id: string;
  type: "DANCE_FLOOR";
  position: Position;
  size: Size;
  label?: string;
  color?: string;
  rotation: number; // degrees
}

/**
 * Union type for all placeable items
 */
export type CanvasItem = TableItem | RowSectionItem | StageItem | DanceFloorItem;

/**
 * Canvas state
 */
export interface CanvasState {
  items: CanvasItem[];
  selectedItemId: string | null;
  zoom: number; // 1.0 = 100%
  pan: Position;
}

/**
 * Toolbar item template (what users can drag from toolbar)
 */
export interface ToolbarTemplate {
  id: string;
  type: ItemType;
  icon: React.ReactNode;
  label: string;
  defaultConfig: Partial<TableItem> | Partial<RowSectionItem>;
}

/**
 * Section grouping (for organizing items)
 */
export interface Section {
  id: string;
  name: string;
  color: string;
  itemIds: string[]; // IDs of items in this section
}

/**
 * Complete template builder state
 */
export interface BuilderState {
  canvas: CanvasState;
  sections: Section[];
  history: CanvasState[]; // for undo/redo
  historyIndex: number;
}
