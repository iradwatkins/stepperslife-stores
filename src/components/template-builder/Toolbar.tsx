"use client";

import React from "react";
import { Circle, Square, RectangleHorizontal, Rows3, BoxSelect, Sparkles } from "lucide-react";
import { TableItem, RowSectionItem, StageItem, DanceFloorItem } from "./types";
import { calculateRowSectionSize } from "./utils";

interface ToolbarProps {
  className?: string;
}

export default function Toolbar({ className = "" }: ToolbarProps) {
  const tableTemplates: Array<{
    label: string;
    icon: React.ReactNode;
    shape: TableItem["shape"];
    capacity: number;
    color: string;
  }> = [
    {
      label: "Round 2",
      icon: <Circle className="w-4 h-4" />,
      shape: "ROUND",
      capacity: 2,
      color: "#3B82F6",
    },
    {
      label: "Round 4",
      icon: <Circle className="w-6 h-6" />,
      shape: "ROUND",
      capacity: 4,
      color: "#3B82F6",
    },
    {
      label: "Round 6",
      icon: <Circle className="w-8 h-8" />,
      shape: "ROUND",
      capacity: 6,
      color: "#3B82F6",
    },
    {
      label: "Round 8",
      icon: <Circle className="w-10 h-10" />,
      shape: "ROUND",
      capacity: 8,
      color: "#3B82F6",
    },
    {
      label: "Round 10",
      icon: <Circle className="w-12 h-12" />,
      shape: "ROUND",
      capacity: 10,
      color: "#3B82F6",
    },
    {
      label: "Rect 2",
      icon: <RectangleHorizontal className="w-6 h-4" />,
      shape: "RECTANGULAR",
      capacity: 2,
      color: "#10B981",
    },
    {
      label: "Rect 6",
      icon: <RectangleHorizontal className="w-8 h-6" />,
      shape: "RECTANGULAR",
      capacity: 6,
      color: "#10B981",
    },
    {
      label: "Rect 8",
      icon: <RectangleHorizontal className="w-10 h-6" />,
      shape: "RECTANGULAR",
      capacity: 8,
      color: "#10B981",
    },
    {
      label: "Square 2",
      icon: <Square className="w-4 h-4" />,
      shape: "SQUARE",
      capacity: 2,
      color: "#F59E0B",
    },
    {
      label: "Square 4",
      icon: <Square className="w-6 h-6" />,
      shape: "SQUARE",
      capacity: 4,
      color: "#F59E0B",
    },
    {
      label: "Square 8",
      icon: <Square className="w-8 h-8" />,
      shape: "SQUARE",
      capacity: 8,
      color: "#F59E0B",
    },
  ];

  const rowTemplates: Array<{
    label: string;
    rowCount: number;
    seatsPerRow: number;
  }> = [{ label: "Row Section", rowCount: 5, seatsPerRow: 10 }];

  const specialAreaTemplates: Array<{
    label: string;
    icon: React.ReactNode;
    type: "STAGE" | "DANCE_FLOOR";
    size: { width: number; height: number };
    color: string;
  }> = [
    {
      label: "Stage",
      icon: <BoxSelect className="w-8 h-8" />,
      type: "STAGE",
      size: { width: 200, height: 100 },
      color: "#EF4444",
    },
    {
      label: "Dance Floor",
      icon: <Sparkles className="w-8 h-8" />,
      type: "DANCE_FLOOR",
      size: { width: 180, height: 180 },
      color: "#EC4899",
    },
  ];

  /**
   * Handle drag start for toolbar items
   */
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    item:
      | Partial<TableItem>
      | Partial<RowSectionItem>
      | Partial<StageItem>
      | Partial<DanceFloorItem>
  ) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify(item));
  };

  return (
    <div className={`bg-white border-2 border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-bold text-foreground mb-4">Seating Elements</h3>

      {/* Tables Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Circle className="w-4 h-4" />
          Tables
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {tableTemplates.map((template, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "TABLE",
                  shape: template.shape,
                  capacity: template.capacity,
                  color: template.color,
                })
              }
              className="flex flex-col items-center justify-center p-3 bg-card border-2 border rounded-lg cursor-move hover:bg-accent hover:border-border transition-all group"
            >
              <div className="text-muted-foreground group-hover:text-primary mb-1">{template.icon}</div>
              <span className="text-xs font-medium text-foreground group-hover:text-primary">
                {template.label}
              </span>
              <span className="text-xs text-muted-foreground">{template.capacity} seats</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row Sections */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Rows3 className="w-4 h-4" />
          Row Sections
        </h4>
        <div className="space-y-2">
          {rowTemplates.map((template, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "ROW_SECTION",
                  rowCount: template.rowCount,
                  seatsPerRow: template.seatsPerRow,
                  size: calculateRowSectionSize(template.rowCount, template.seatsPerRow),
                  rowSpacing: 30,
                  seatSpacing: 25,
                  color: "#8B5CF6",
                })
              }
              className="flex flex-col p-3 bg-card border-2 border rounded-lg cursor-move hover:bg-accent/50 hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground group-hover:text-primary">
                  {template.label}
                </span>
                <Rows3 className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">
                {template.rowCount} rows × {template.seatsPerRow} seats ={" "}
                {template.rowCount * template.seatsPerRow} total
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Special Areas */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Special Areas
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {specialAreaTemplates.map((template, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: template.type,
                  size: template.size,
                  color: template.color,
                  rotation: 0,
                })
              }
              className="flex flex-col items-center justify-center p-3 bg-card border-2 border rounded-lg cursor-move hover:bg-accent hover:border-primary/30 transition-all group"
            >
              <div className="text-muted-foreground group-hover:text-primary mb-1">{template.icon}</div>
              <span className="text-xs font-medium text-foreground group-hover:text-accent-foreground">
                {template.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-3 bg-accent border border-border rounded-lg">
        <p className="text-xs text-accent-foreground">
          <strong>Tip:</strong> Drag items onto the canvas to place them. Click to select and edit
          properties.
        </p>
      </div>
    </div>
  );
}
