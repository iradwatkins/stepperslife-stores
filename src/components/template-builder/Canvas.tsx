"use client";

import React, { useRef, useState } from "react";
import {
  CanvasItem,
  Position,
  TableItem,
  RowSectionItem,
  StageItem,
  DanceFloorItem,
} from "./types";
import { isPointInItem, snapToGrid } from "./utils";
import ChairRenderer from "./ChairRenderer";
import { getChairPositions } from "./chairUtils";

interface CanvasProps {
  items: CanvasItem[];
  selectedItemId: string | null;
  onItemsChange: (items: CanvasItem[]) => void;
  onSelectionChange: (itemId: string | null) => void;
  onDropItem: (item: Partial<CanvasItem>, position: Position) => void;
  gridSize?: number;
  showGrid?: boolean;
}

export default function Canvas({
  items,
  selectedItemId,
  onItemsChange,
  onSelectionChange,
  onDropItem,
  gridSize = 20,
  showGrid = true,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1); // Zoom level: 0.5x to 2x

  /**
   * Zoom controls
   */
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  /**
   * Convert mouse position to canvas coordinates accounting for zoom
   */
  const getCanvasPosition = (clientX: number, clientY: number): Position => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  /**
   * Handle click on canvas (for selection or deselection)
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const clickPoint = getCanvasPosition(e.clientX, e.clientY);

    // Find clicked item (iterate in reverse to get topmost item)
    const clickedItem = [...items].reverse().find((item) => isPointInItem(clickPoint, item));

    onSelectionChange(clickedItem?.id || null);
  };

  /**
   * Handle drag start from toolbar (receiving drop)
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  /**
   * Handle drop from toolbar
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!canvasRef.current) return;

    const canvasPos = getCanvasPosition(e.clientX, e.clientY);
    const dropPosition = snapToGrid(canvasPos, gridSize);

    const itemData = e.dataTransfer.getData("application/json");
    if (itemData) {
      try {
        const item = JSON.parse(itemData);
        onDropItem(item, dropPosition);
      } catch (error) {
        console.error("Failed to parse dropped item:", error);
      }
    }
  };

  /**
   * Handle drag start for moving existing items
   */
  const handleItemDragStart = (e: React.MouseEvent<HTMLDivElement>, itemId: string) => {
    e.stopPropagation();

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    setDraggingItemId(itemId);
    onSelectionChange(itemId);
  };

  /**
   * Handle drag move for repositioning items
   */
  const handleItemDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingItemId || !canvasRef.current) return;

    const canvasPos = getCanvasPosition(e.clientX, e.clientY);
    const newPosition = snapToGrid(
      {
        x: canvasPos.x - dragOffset.x,
        y: canvasPos.y - dragOffset.y,
      },
      gridSize
    );

    // Update item position
    const updatedItems = items.map((item) =>
      item.id === draggingItemId ? { ...item, position: newPosition } : item
    );

    onItemsChange(updatedItems);
  };

  /**
   * Handle drag end
   */
  const handleItemDragEnd = () => {
    setDraggingItemId(null);
  };

  return (
    <div className="relative w-full h-full bg-card border-2 border rounded-lg overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border p-2">
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 2}
          className="px-3 py-2 bg-accent text-primary rounded hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomReset}
          className="px-3 py-1 bg-card text-foreground rounded hover:bg-muted transition-colors text-xs font-medium"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="px-3 py-2 bg-accent text-primary rounded hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg"
          title="Zoom Out"
        >
          −
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="relative w-full h-full overflow-auto"
        style={{
          backgroundImage: showGrid
            ? `repeating-linear-gradient(0deg, oklch(0.92 0.002 264.05) 0, oklch(0.92 0.002 264.05) 1px, transparent 1px, transparent ${gridSize * zoom}px),
               repeating-linear-gradient(90deg, oklch(0.92 0.002 264.05) 0, oklch(0.92 0.002 264.05) 1px, transparent 1px, transparent ${gridSize * zoom}px)`
            : undefined,
          backgroundSize: showGrid ? `${gridSize * zoom}px ${gridSize * zoom}px` : undefined,
        }}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseMove={draggingItemId ? handleItemDrag : undefined}
        onMouseUp={handleItemDragEnd}
        onMouseLeave={handleItemDragEnd}
      >
        {/* Zoomable content wrapper */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            minWidth: "1200px",
            minHeight: "800px",
          }}
        >
          {/* Render all items */}
          {items.map((item) => (
            <CanvasItemRenderer
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              isDragging={item.id === draggingItemId}
              onDragStart={(e) => handleItemDragStart(e, item.id)}
            />
          ))}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <p className="text-lg font-medium">
                  Drag items from the toolbar to start designing
                </p>
                <p className="text-sm mt-1">
                  Add tables and row sections to build your room layout
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Renderer for individual canvas items
 */
interface CanvasItemRendererProps {
  item: CanvasItem;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function CanvasItemRenderer({
  item,
  isSelected,
  isDragging,
  onDragStart,
}: CanvasItemRendererProps) {
  if (item.type === "TABLE") {
    return (
      <TableRenderer
        table={item}
        isSelected={isSelected}
        isDragging={isDragging}
        onDragStart={onDragStart}
      />
    );
  } else if (item.type === "ROW_SECTION") {
    return (
      <RowSectionRenderer
        rowSection={item}
        isSelected={isSelected}
        isDragging={isDragging}
        onDragStart={onDragStart}
      />
    );
  } else if (item.type === "STAGE") {
    return (
      <StageRenderer
        stage={item}
        isSelected={isSelected}
        isDragging={isDragging}
        onDragStart={onDragStart}
      />
    );
  } else if (item.type === "DANCE_FLOOR") {
    return (
      <DanceFloorRenderer
        danceFloor={item}
        isSelected={isSelected}
        isDragging={isDragging}
        onDragStart={onDragStart}
      />
    );
  }
  return null;
}

/**
 * Renderer for table items
 */
interface TableRendererProps {
  table: TableItem;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function TableRenderer({ table, isSelected, isDragging, onDragStart }: TableRendererProps) {
  const { position, size, shape, capacity, label, color } = table;

  // Calculate chair positions (relative to canvas)
  const chairsAbsolute = getChairPositions(
    shape,
    position.x,
    position.y,
    size.width,
    size.height,
    capacity
  );

  // Convert to positions relative to table container
  const chairs = chairsAbsolute.map((chair) => ({
    ...chair,
    x: chair.x - position.x,
    y: chair.y - position.y,
  }));

  // Create realistic table surface with wood grain texture
  const getTableStyle = () => {
    const baseColor = color || "oklch(0.6185 0.1569 258.3380)"; // blue-600 equivalent

    // Wood grain pattern overlay
    const woodGrain = `repeating-linear-gradient(90deg, transparent, transparent 2px, oklch(0 0 0 / 0.03) 2px, oklch(0 0 0 / 0.03) 4px)`;

    if (shape === "ROUND") {
      return {
        backgroundColor: baseColor,
        backgroundImage: `
          radial-gradient(ellipse at 50% 20%, color-mix(in oklch, ${baseColor}, transparent 7%), transparent 60%),
          radial-gradient(circle at 30% 30%, color-mix(in oklch, ${baseColor}, transparent 13%), ${baseColor} 70%),
          ${woodGrain}
        `,
        borderRadius: "50%",
        border: `3px solid color-mix(in oklch, ${baseColor}, transparent 33%)`,
        boxShadow: `
          inset 0 2px 4px oklch(1 0 0 / 0.3),
          inset 0 -2px 4px oklch(0 0 0 / 0.1),
          0 4px 8px oklch(0 0 0 / 0.15)
        `,
      };
    } else if (shape === "RECTANGULAR") {
      return {
        backgroundColor: baseColor,
        backgroundImage: `
          linear-gradient(180deg, color-mix(in oklch, ${baseColor}, transparent 7%) 0%, ${baseColor} 50%, color-mix(in oklch, ${baseColor}, transparent 13%) 100%),
          ${woodGrain}
        `,
        borderRadius: "8px",
        border: `3px solid color-mix(in oklch, ${baseColor}, transparent 33%)`,
        boxShadow: `
          inset 0 2px 4px oklch(1 0 0 / 0.3),
          inset 0 -2px 4px oklch(0 0 0 / 0.1),
          0 4px 8px oklch(0 0 0 / 0.15)
        `,
      };
    } else if (shape === "SQUARE") {
      return {
        backgroundColor: baseColor,
        backgroundImage: `
          linear-gradient(135deg, color-mix(in oklch, ${baseColor}, transparent 7%) 0%, ${baseColor} 50%, color-mix(in oklch, ${baseColor}, transparent 13%) 100%),
          ${woodGrain}
        `,
        borderRadius: "6px",
        border: `3px solid color-mix(in oklch, ${baseColor}, transparent 33%)`,
        boxShadow: `
          inset 0 2px 4px oklch(1 0 0 / 0.3),
          inset 0 -2px 4px oklch(0 0 0 / 0.1),
          0 4px 8px oklch(0 0 0 / 0.15)
        `,
      };
    } else {
      return {
        backgroundColor: baseColor,
        backgroundImage: `linear-gradient(135deg, color-mix(in oklch, ${baseColor}, transparent 13%) 0%, ${baseColor} 50%, color-mix(in oklch, ${baseColor}, transparent 13%) 100%), ${woodGrain}`,
        borderRadius: "8px",
        border: `3px solid color-mix(in oklch, ${baseColor}, transparent 33%)`,
        boxShadow: `
          inset 0 2px 4px oklch(1 0 0 / 0.3),
          inset 0 -2px 4px oklch(0 0 0 / 0.1),
          0 4px 8px oklch(0 0 0 / 0.15)
        `,
      };
    }
  };

  return (
    <div
      className={`absolute ${isDragging ? "opacity-50" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Chairs around the table */}
      {chairs.map((chair, index) => (
        <ChairRenderer
          key={index}
          chair={chair}
          isSelected={isSelected}
          showSeatNumber={isSelected}
          chairColor={isSelected ? "oklch(0.9549 0.0466 99.6837)" : "oklch(0.9217 0.0020 264.0520)"}
        />
      ))}

      {/* Table shape */}
      <div
        className={`w-full h-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-all cursor-move ${
          isSelected ? "ring-4 ring-primary ring-opacity-50" : ""
        }`}
        style={getTableStyle()}
        onMouseDown={onDragStart}
      >
        <div className="text-center">
          {label && <div className="text-xs mb-1 opacity-90">{label}</div>}
          <div className="text-2xl font-bold drop-shadow-lg">{capacity}</div>
          <div className="text-[9px] uppercase tracking-wide opacity-75 mt-0.5">
            {shape === "RECTANGULAR" ? "Rect" : shape.toLowerCase()}
          </div>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full border-2 border-white" />
      )}
    </div>
  );
}

/**
 * Renderer for row section items
 */
interface RowSectionRendererProps {
  rowSection: RowSectionItem;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function RowSectionRenderer({
  rowSection,
  isSelected,
  isDragging,
  onDragStart,
}: RowSectionRendererProps) {
  const { position, size, rowCount, seatsPerRow, label, color } = rowSection;

  // Enhanced seat dimensions for theater-style seats
  const seatWidth = 16;
  const seatHeight = 16;
  const seatGap = 3;
  const rowGap = 8;

  // Theater color scheme
  const theaterColor = color || "oklch(0.5777 0.2216 25.3381)"; // Rich red - red-600
  const seatColor = isSelected ? "oklch(0.7533 0.1538 69.6831)" : "oklch(0.4595 0.2095 26.8401)"; // Amber when selected, dark red default
  const seatColorLight = isSelected
    ? "oklch(0.8760 0.1254 85.8740)"
    : "oklch(0.6324 0.2573 29.2339)";

  return (
    <div
      className={`absolute cursor-move transition-all ${isDragging ? "opacity-50" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      onMouseDown={onDragStart}
    >
      {/* Row section background - darker theater theme */}
      <div
        className="w-full h-full rounded-lg shadow-xl hover:shadow-2xl transition-all p-4 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theaterColor}15 0%, ${theaterColor}08 100%)`,
          border: isSelected ? `3px solid ${theaterColor}` : "3px solid transparent",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* Header - Enhanced styling */}
        <div className="mb-3 pb-2 border-b-2" style={{ borderColor: `${theaterColor}40` }}>
          <div className="text-sm font-bold mb-1" style={{ color: theaterColor }}>
            🎭 {label || "Theater Section"}
          </div>
          <div className="text-xs font-medium" style={{ color: `${theaterColor}cc` }}>
            {rowCount} rows × {seatsPerRow} seats ={" "}
            <span className="font-bold">{rowCount * seatsPerRow}</span> total
          </div>
        </div>

        {/* Rows of theater seats */}
        <div style={{ display: "flex", flexDirection: "column", gap: `${rowGap}px` }}>
          {Array.from({ length: Math.min(rowCount, 8) }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center" style={{ gap: "8px" }}>
              {/* Row label - Enhanced */}
              <span
                className="font-bold font-mono text-xs flex items-center justify-center"
                style={{
                  width: "20px",
                  height: "20px",
                  color: theaterColor,
                  backgroundColor: `${theaterColor}15`,
                  borderRadius: "4px",
                  border: `1px solid ${theaterColor}40`,
                }}
              >
                {String.fromCharCode(65 + rowIdx)}
              </span>

              {/* Theater-style seats */}
              <div className="flex" style={{ gap: `${seatGap}px` }}>
                {Array.from({ length: Math.min(seatsPerRow, 12) }).map((_, seatIdx) => (
                  <div
                    key={seatIdx}
                    className="transition-all hover:scale-110"
                    style={{
                      width: seatWidth,
                      height: seatHeight,
                      position: "relative",
                      cursor: "pointer",
                    }}
                    title={`${String.fromCharCode(65 + rowIdx)}${seatIdx + 1}`}
                  >
                    {/* Theater seat with curved back and armrests */}
                    <svg
                      width={seatWidth}
                      height={seatHeight}
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Seat back (curved) */}
                      <path
                        d="M3 4 Q3 2, 5 2 L11 2 Q13 2, 13 4 L13 9 L3 9 Z"
                        fill={seatColorLight}
                        stroke={seatColor}
                        strokeWidth="0.5"
                      />
                      {/* Seat base */}
                      <rect
                        x="3"
                        y="9"
                        width="10"
                        height="5"
                        rx="1"
                        fill={seatColor}
                        stroke={seatColor}
                        strokeWidth="0.5"
                      />
                      {/* Left armrest */}
                      <rect
                        x="2"
                        y="7"
                        width="1.5"
                        height="6"
                        rx="0.5"
                        fill={seatColor}
                        opacity="0.8"
                      />
                      {/* Right armrest */}
                      <rect
                        x="12.5"
                        y="7"
                        width="1.5"
                        height="6"
                        rx="0.5"
                        fill={seatColor}
                        opacity="0.8"
                      />
                      {/* Highlight for depth */}
                      <ellipse cx="8" cy="6" rx="3" ry="1.5" fill="white" opacity="0.2" />
                    </svg>
                  </div>
                ))}
                {seatsPerRow > 12 && (
                  <span
                    className="text-xs ml-1 self-center font-semibold"
                    style={{ color: theaterColor }}
                  >
                    +{seatsPerRow - 12}
                  </span>
                )}
              </div>
            </div>
          ))}
          {rowCount > 8 && (
            <div
              className="text-center text-xs mt-2 font-medium py-1 rounded"
              style={{
                color: theaterColor,
                backgroundColor: `${theaterColor}10`,
              }}
            >
              + {rowCount - 8} more rows
            </div>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-warning/100 rounded-full border-2 border-white shadow-md" />
      )}
    </div>
  );
}

/**
 * Renderer for stage items
 */
interface StageRendererProps {
  stage: StageItem;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function StageRenderer({ stage, isSelected, isDragging, onDragStart }: StageRendererProps) {
  const { position, size, label, color } = stage;

  return (
    <div
      className={`absolute cursor-move transition-all ${isDragging ? "opacity-50" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      onMouseDown={onDragStart}
    >
      {/* Stage platform */}
      <div
        className="w-full h-full rounded-lg shadow-xl hover:shadow-2xl transition-all flex flex-col items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${color || "oklch(0.6279 0.2578 27.3251)"} 0%, color-mix(in oklch, ${color || "oklch(0.6279 0.2578 27.3251)"}, transparent 13%) 100%)`,
          border: isSelected
            ? `3px solid ${color || "oklch(0.6279 0.2578 27.3251)"}`
            : "3px solid transparent",
          boxShadow: `
            inset 0 2px 4px oklch(1 0 0 / 0.3),
            inset 0 -2px 4px oklch(0 0 0 / 0.2),
            0 8px 16px oklch(0 0 0 / 0.2)
          `,
        }}
      >
        {/* Stage icon/label */}
        <div className="text-white text-center">
          <div className="text-2xl font-bold drop-shadow-lg mb-1">🎭</div>
          <div className="text-sm font-semibold drop-shadow-md uppercase tracking-wide">
            {label || "Stage"}
          </div>
        </div>

        {/* Stage edge effect (front of stage) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2"
          style={{
            background: `linear-gradient(180deg, transparent 0%, oklch(0 0 0 / 0.3) 100%)`,
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
          }}
        />
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-destructive/100 rounded-full border-2 border-white shadow-md" />
      )}
    </div>
  );
}

/**
 * Renderer for dance floor items
 */
interface DanceFloorRendererProps {
  danceFloor: DanceFloorItem;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function DanceFloorRenderer({
  danceFloor,
  isSelected,
  isDragging,
  onDragStart,
}: DanceFloorRendererProps) {
  const { position, size, label, color } = danceFloor;

  return (
    <div
      className={`absolute cursor-move transition-all ${isDragging ? "opacity-50" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      onMouseDown={onDragStart}
    >
      {/* Dance floor surface */}
      <div
        className="w-full h-full rounded-lg shadow-lg hover:shadow-xl transition-all overflow-hidden relative"
        style={{
          border: isSelected
            ? `3px solid ${color || "oklch(0.6714 0.2144 343.6716)"}`
            : "3px solid transparent",
        }}
      >
        {/* Checkered pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, color-mix(in oklch, ${color || "oklch(0.6714 0.2144 343.6716)"}, transparent 80%) 25%, transparent 25%),
              linear-gradient(-45deg, color-mix(in oklch, ${color || "oklch(0.6714 0.2144 343.6716)"}, transparent 80%) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, color-mix(in oklch, ${color || "oklch(0.6714 0.2144 343.6716)"}, transparent 80%) 75%),
              linear-gradient(-45deg, transparent 75%, color-mix(in oklch, ${color || "oklch(0.6714 0.2144 343.6716)"}, transparent 80%) 75%)
            `,
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
            backgroundColor: color
              ? `color-mix(in oklch, ${color}, transparent 93%)`
              : "color-mix(in oklch, oklch(0.6714 0.2144 343.6716), transparent 93%)",
          }}
        />

        {/* Shine effect */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, oklch(1 0 0 / 0.2) 0%, transparent 60%)`,
          }}
        />

        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-2 drop-shadow-lg">💃</div>
            <div
              className="text-sm font-bold uppercase tracking-wider drop-shadow-md px-3 py-1 rounded bg-white/90"
              style={{
                color: color || "oklch(0.6714 0.2144 343.6716)",
              }}
            >
              {label || "Dance Floor"}
            </div>
          </div>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent0 rounded-full border-2 border-white shadow-md" />
      )}
    </div>
  );
}
