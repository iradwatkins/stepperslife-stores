"use client";

import React from "react";
import {
  Trash2,
  Circle,
  Square,
  RectangleHorizontal,
  Palette,
  BoxSelect,
  Sparkles,
  Ruler,
  MoveVertical,
  Users,
  Tag,
  MapPin,
  Minus,
  Plus,
  Copy,
} from "lucide-react";
import { CanvasItem, TableItem, RowSectionItem, StageItem, DanceFloorItem } from "./types";
import { SECTION_COLORS } from "./utils";

interface PropertyPanelProps {
  selectedItem: CanvasItem | null;
  onUpdateItem: (itemId: string, updates: Partial<CanvasItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  className?: string;
}

export default function PropertyPanel({
  selectedItem,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  className = "",
}: PropertyPanelProps) {
  // Component should only be rendered when an item is selected
  if (!selectedItem) return null;

  return (
    <div className={`bg-card border-2 border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">Properties</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicateItem(selectedItem.id)}
            className="p-2 text-primary hover:bg-accent rounded-lg transition-colors"
            title="Duplicate item"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteItem(selectedItem.id)}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {selectedItem.type === "TABLE" && (
        <TableProperties
          table={selectedItem}
          onUpdate={(updates) => onUpdateItem(selectedItem.id, updates)}
        />
      )}

      {selectedItem.type === "ROW_SECTION" && (
        <RowSectionProperties
          rowSection={selectedItem}
          onUpdate={(updates) => onUpdateItem(selectedItem.id, updates)}
        />
      )}

      {selectedItem.type === "STAGE" && (
        <StageProperties
          stage={selectedItem}
          onUpdate={(updates) => onUpdateItem(selectedItem.id, updates)}
        />
      )}

      {selectedItem.type === "DANCE_FLOOR" && (
        <DanceFloorProperties
          danceFloor={selectedItem}
          onUpdate={(updates) => onUpdateItem(selectedItem.id, updates)}
        />
      )}
    </div>
  );
}

/**
 * Property editor for table items
 */
interface TablePropertiesProps {
  table: TableItem;
  onUpdate: (updates: Partial<TableItem>) => void;
}

function TableProperties({ table, onUpdate }: TablePropertiesProps) {
  return (
    <div className="space-y-4">
      {/* Table type indicator */}
      <div className="p-3 bg-accent border border-border rounded-lg">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Circle className="w-4 h-4" />
          Table
        </p>
      </div>

      {/* Label */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <Tag className="w-4 h-4 text-primary" />
          Label
        </label>
        <input
          type="text"
          value={table.label || ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="e.g., VIP Table 1"
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary transition-all"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Optional identifier for this table</p>
      </div>

      {/* Shape */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Shape</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { shape: "ROUND" as const, icon: <Circle className="w-5 h-5" />, label: "Round" },
            {
              shape: "RECTANGULAR" as const,
              icon: <RectangleHorizontal className="w-5 h-5" />,
              label: "Rectangle",
            },
            { shape: "SQUARE" as const, icon: <Square className="w-5 h-5" />, label: "Square" },
          ].map(({ shape, icon, label }) => (
            <button
              type="button"
              key={shape}
              onClick={() => onUpdate({ shape })}
              className={`flex flex-col items-center justify-center p-2 border-2 rounded-lg transition-all ${
                table.shape === shape
                  ? "border-primary bg-accent text-primary"
                  : "border-border hover:border-muted-foreground text-muted-foreground"
              }`}
            >
              {icon}
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <Users className="w-4 h-4 text-primary" />
          Capacity
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ capacity: Math.max(1, table.capacity - 1) })}
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            title="Decrease capacity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            min="1"
            max="20"
            value={table.capacity}
            onChange={(e) => onUpdate({ capacity: parseInt(e.target.value) || 1 })}
            className="flex-1 text-center px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary font-semibold text-lg transition-all"
          />
          <button
            type="button"
            onClick={() => onUpdate({ capacity: Math.min(20, table.capacity + 1) })}
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            title="Increase capacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Number of seats around this table (1-20)</p>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Color
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SECTION_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => onUpdate({ color })}
              className={`w-full h-10 rounded-lg border-2 transition-all ${
                table.color === color
                  ? "border-foreground ring-2 ring-muted"
                  : "border-border hover:border-muted-foreground"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Position info (read-only) */}
      <div className="p-3 bg-accent border-2 border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-accent-foreground">Position & Size</span>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-accent-foreground">
            <span className="font-semibold">X:</span> {Math.round(table.position.x)}px
            <span className="font-semibold ml-3">Y:</span> {Math.round(table.position.y)}px
          </p>
          <p className="text-xs text-accent-foreground">
            <span className="font-semibold">Size:</span> {table.size.width} × {table.size.height}px
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Property editor for row section items
 */
interface RowSectionPropertiesProps {
  rowSection: RowSectionItem;
  onUpdate: (updates: Partial<RowSectionItem>) => void;
}

function RowSectionProperties({ rowSection, onUpdate }: RowSectionPropertiesProps) {
  return (
    <div className="space-y-4">
      {/* Row section type indicator */}
      <div className="p-3 bg-accent border border-primary/30 rounded-lg">
        <p className="text-sm font-semibold text-foreground">Row Section</p>
        <p className="text-xs text-accent-foreground mt-1">
          Total: {rowSection.rowCount * rowSection.seatsPerRow} seats
        </p>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Label (optional)</label>
        <input
          type="text"
          value={rowSection.label || ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="e.g., Main Orchestra"
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Row Count */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Number of Rows</label>
        <input
          type="number"
          min="1"
          max="30"
          value={rowSection.rowCount}
          onChange={(e) => onUpdate({ rowCount: parseInt(e.target.value) || 1 })}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Seats Per Row */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Seats Per Row</label>
        <input
          type="number"
          min="1"
          max="50"
          value={rowSection.seatsPerRow}
          onChange={(e) => onUpdate({ seatsPerRow: parseInt(e.target.value) || 1 })}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Color */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Palette className="w-4 h-4" />
          Color
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SECTION_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => onUpdate({ color })}
              className={`w-full h-10 rounded-lg border-2 transition-all ${
                rowSection.color === color
                  ? "border-foreground ring-2 ring-muted"
                  : "border-border hover:border-muted-foreground"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Position info (read-only) */}
      <div className="p-3 bg-muted border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Position:</strong> X: {Math.round(rowSection.position.x)}px, Y:{" "}
          {Math.round(rowSection.position.y)}px
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <strong>Size:</strong> {rowSection.size.width} × {rowSection.size.height}px
        </p>
      </div>
    </div>
  );
}

/**
 * Property editor for stage items
 */
interface StagePropertiesProps {
  stage: StageItem;
  onUpdate: (updates: Partial<StageItem>) => void;
}

function StageProperties({ stage, onUpdate }: StagePropertiesProps) {
  return (
    <div className="space-y-4">
      {/* Stage type indicator */}
      <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
        <p className="text-sm font-semibold text-destructive flex items-center gap-2">
          <BoxSelect className="w-4 h-4" />
          Stage
        </p>
      </div>

      {/* Label */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <Tag className="w-4 h-4 text-destructive" />
          Label
        </label>
        <input
          type="text"
          value={stage.label || ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="e.g., Main Stage"
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-destructive focus:border-destructive transition-all"
        />
      </div>

      {/* Width */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <Ruler className="w-4 h-4 text-destructive" />
          Width
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdate({ size: { ...stage.size, width: Math.max(50, stage.size.width - 10) } })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            min="50"
            max="500"
            value={stage.size.width}
            onChange={(e) =>
              onUpdate({ size: { ...stage.size, width: parseInt(e.target.value) || 50 } })
            }
            className="flex-1 text-center px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-destructive focus:border-destructive font-semibold transition-all"
          />
          <span className="text-sm text-muted-foreground w-8">px</span>
          <button
            type="button"
            onClick={() =>
              onUpdate({ size: { ...stage.size, width: Math.min(500, stage.size.width + 10) } })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Height */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <MoveVertical className="w-4 h-4 text-destructive" />
          Height
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdate({ size: { ...stage.size, height: Math.max(50, stage.size.height - 10) } })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            min="50"
            max="500"
            value={stage.size.height}
            onChange={(e) =>
              onUpdate({ size: { ...stage.size, height: parseInt(e.target.value) || 50 } })
            }
            className="flex-1 text-center px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-destructive focus:border-destructive font-semibold transition-all"
          />
          <span className="text-sm text-muted-foreground w-8">px</span>
          <button
            type="button"
            onClick={() =>
              onUpdate({ size: { ...stage.size, height: Math.min(500, stage.size.height + 10) } })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Palette className="w-4 h-4" />
          Color
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SECTION_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => onUpdate({ color })}
              className={`w-full h-10 rounded-lg border-2 transition-all ${
                stage.color === color
                  ? "border-foreground ring-2 ring-muted"
                  : "border-border hover:border-muted-foreground"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Position info (read-only) */}
      <div className="p-3 bg-muted border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Position:</strong> X: {Math.round(stage.position.x)}px, Y:{" "}
          {Math.round(stage.position.y)}px
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <strong>Size:</strong> {stage.size.width} × {stage.size.height}px
        </p>
      </div>
    </div>
  );
}

/**
 * Property editor for dance floor items
 */
interface DanceFloorPropertiesProps {
  danceFloor: DanceFloorItem;
  onUpdate: (updates: Partial<DanceFloorItem>) => void;
}

function DanceFloorProperties({ danceFloor, onUpdate }: DanceFloorPropertiesProps) {
  return (
    <div className="space-y-4">
      {/* Dance Floor type indicator */}
      <div className="p-3 bg-accent border border-accent rounded-lg">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Dance Floor
        </p>
      </div>

      {/* Label */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <Tag className="w-4 h-4 text-primary" />
          Label
        </label>
        <input
          type="text"
          value={danceFloor.label || ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="e.g., Dance Floor"
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Width */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <Ruler className="w-4 h-4 text-primary" />
          Width
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdate({
                size: { ...danceFloor.size, width: Math.max(50, danceFloor.size.width - 10) },
              })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            min="50"
            max="500"
            value={danceFloor.size.width}
            onChange={(e) =>
              onUpdate({ size: { ...danceFloor.size, width: parseInt(e.target.value) || 50 } })
            }
            className="flex-1 text-center px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-semibold transition-all"
          />
          <span className="text-sm text-muted-foreground w-8">px</span>
          <button
            type="button"
            onClick={() =>
              onUpdate({
                size: { ...danceFloor.size, width: Math.min(500, danceFloor.size.width + 10) },
              })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Height */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <MoveVertical className="w-4 h-4 text-primary" />
          Height
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdate({
                size: { ...danceFloor.size, height: Math.max(50, danceFloor.size.height - 10) },
              })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            min="50"
            max="500"
            value={danceFloor.size.height}
            onChange={(e) =>
              onUpdate({ size: { ...danceFloor.size, height: parseInt(e.target.value) || 50 } })
            }
            className="flex-1 text-center px-3 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-semibold transition-all"
          />
          <span className="text-sm text-muted-foreground w-8">px</span>
          <button
            type="button"
            onClick={() =>
              onUpdate({
                size: { ...danceFloor.size, height: Math.min(500, danceFloor.size.height + 10) },
              })
            }
            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Palette className="w-4 h-4" />
          Color
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SECTION_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => onUpdate({ color })}
              className={`w-full h-10 rounded-lg border-2 transition-all ${
                danceFloor.color === color
                  ? "border-foreground ring-2 ring-muted"
                  : "border-border hover:border-muted-foreground"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Position info (read-only) */}
      <div className="p-3 bg-muted border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Position:</strong> X: {Math.round(danceFloor.position.x)}px, Y:{" "}
          {Math.round(danceFloor.position.y)}px
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <strong>Size:</strong> {danceFloor.size.width} × {danceFloor.size.height}px
        </p>
      </div>
    </div>
  );
}
