"use client";

import React, { useState, useCallback } from "react";
import { Undo2, Redo2, Save, Eye, Trash2, Info } from "lucide-react";
import Canvas from "./Canvas";
import Toolbar from "./Toolbar";
import PropertyPanel from "./PropertyPanel";
import {
  CanvasItem,
  Position,
  TableItem,
  RowSectionItem,
  StageItem,
  DanceFloorItem,
} from "./types";
import {
  createDefaultTable,
  createDefaultRowSection,
  createDefaultStage,
  createDefaultDanceFloor,
  calculateTotalCapacity,
  convertToSections,
  calculateRowSectionSize,
  generateId,
} from "./utils";
import { toast } from "sonner";

interface TemplateBuilderProps {
  initialItems?: CanvasItem[];
  onSave?: (sections: any[], totalCapacity: number) => void;
  onCancel?: () => void;
}

export default function TemplateBuilder({
  initialItems = [],
  onSave,
  onCancel,
}: TemplateBuilderProps) {
  const [items, setItems] = useState<CanvasItem[]>(initialItems);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasItem[][]>([initialItems]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;
  const totalCapacity = calculateTotalCapacity(items);

  /**
   * Add item to history for undo/redo
   */
  const addToHistory = useCallback(
    (newItems: CanvasItem[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newItems);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  /**
   * Handle dropping new item from toolbar
   */
  const handleDropItem = useCallback(
    (itemData: Partial<CanvasItem>, position: Position) => {
      let newItem: CanvasItem;

      if (itemData.type === "TABLE") {
        newItem = createDefaultTable(
          position,
          (itemData as Partial<TableItem>).shape || "ROUND",
          (itemData as Partial<TableItem>).capacity || 8
        );
        if (itemData.color) {
          newItem.color = itemData.color;
        }
      } else if (itemData.type === "ROW_SECTION") {
        newItem = createDefaultRowSection(position);
        const rowData = itemData as Partial<RowSectionItem>;
        if (rowData.rowCount) newItem.rowCount = rowData.rowCount;
        if (rowData.seatsPerRow) newItem.seatsPerRow = rowData.seatsPerRow;
        if (rowData.color) newItem.color = rowData.color;
        // Use provided size or recalculate based on rows/seats
        if (rowData.size) {
          newItem.size = rowData.size;
        } else {
          newItem.size = calculateRowSectionSize(newItem.rowCount, newItem.seatsPerRow);
        }
      } else if (itemData.type === "STAGE") {
        newItem = createDefaultStage(position);
        const stageData = itemData as Partial<StageItem>;
        if (stageData.size) newItem.size = stageData.size;
        if (stageData.color) newItem.color = stageData.color;
        if (stageData.label) newItem.label = stageData.label;
      } else if (itemData.type === "DANCE_FLOOR") {
        newItem = createDefaultDanceFloor(position);
        const danceFloorData = itemData as Partial<DanceFloorItem>;
        if (danceFloorData.size) newItem.size = danceFloorData.size;
        if (danceFloorData.color) newItem.color = danceFloorData.color;
        if (danceFloorData.label) newItem.label = danceFloorData.label;
      } else {
        return;
      }

      const newItems = [...items, newItem];
      setItems(newItems);
      setSelectedItemId(newItem.id);
      addToHistory(newItems);
    },
    [items, addToHistory]
  );

  /**
   * Handle updating an item's properties
   */
  const handleUpdateItem = useCallback(
    (itemId: string, updates: Partial<CanvasItem>) => {
      const newItems = items.map((item) => {
        if (item.id !== itemId) return item;

        const updatedItem = { ...item, ...updates } as CanvasItem;

        // Recalculate size for row sections when rowCount or seatsPerRow changes
        if (updatedItem.type === "ROW_SECTION") {
          const rowSection = updatedItem as RowSectionItem;
          updatedItem.size = calculateRowSectionSize(rowSection.rowCount, rowSection.seatsPerRow);
        }

        return updatedItem;
      });
      setItems(newItems);
      addToHistory(newItems);
    },
    [items, addToHistory]
  );

  /**
   * Handle deleting an item
   */
  const handleDeleteItem = useCallback(
    (itemId: string) => {
      const newItems = items.filter((item) => item.id !== itemId);
      setItems(newItems);
      setSelectedItemId(null);
      addToHistory(newItems);
    },
    [items, addToHistory]
  );

  /**
   * Handle duplicating an item
   */
  const handleDuplicateItem = useCallback(
    (itemId: string) => {
      const itemToDuplicate = items.find((item) => item.id === itemId);
      if (!itemToDuplicate) return;

      // Create a duplicate with a new ID and offset position
      const duplicatedItem = {
        ...itemToDuplicate,
        id: generateId(),
        position: {
          x: itemToDuplicate.position.x + 40,
          y: itemToDuplicate.position.y + 40,
        },
      } as CanvasItem;

      const newItems = [...items, duplicatedItem];
      setItems(newItems);
      setSelectedItemId(duplicatedItem.id);
      addToHistory(newItems);
    },
    [items, addToHistory]
  );

  /**
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setItems(history[newIndex]);
      setSelectedItemId(null);
    }
  }, [history, historyIndex]);

  /**
   * Handle redo
   */
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setItems(history[newIndex]);
      setSelectedItemId(null);
    }
  }, [history, historyIndex]);

  /**
   * Handle clear all
   */
  const handleClearAll = useCallback(() => {
    if (items.length === 0) return;

    if (confirm("Are you sure you want to clear all items? This cannot be undone.")) {
      const newItems: CanvasItem[] = [];
      setItems(newItems);
      setSelectedItemId(null);
      addToHistory(newItems);
    }
  }, [items, addToHistory]);

  /**
   * Handle save
   */
  const handleSave = useCallback(() => {
    if (items.length === 0) {
      toast.error("Please add at least one table or row section before saving.");
      return;
    }

    const sections = convertToSections(items, []);
    onSave?.(sections, totalCapacity);
  }, [items, totalCapacity, onSave]);

  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-4 bg-card border-b-2 border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-foreground">Visual Seating Builder</h2>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* Clear all */}
          <button
            type="button"
            onClick={handleClearAll}
            disabled={items.length === 0}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Clear all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Stats and actions */}
        <div className="flex items-center gap-4">
          {/* Capacity counter */}
          <div className="px-4 py-2 bg-accent border border-border rounded-lg">
            <span className="text-sm font-medium text-foreground">
              Total Capacity: <span className="text-lg font-bold">{totalCapacity}</span> seats
            </span>
          </div>

          {/* Items counter */}
          <div className="px-4 py-2 bg-muted border border-border rounded-lg">
            <span className="text-sm font-medium text-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border-2 border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={items.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Layout
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-4 py-3 bg-accent border-b border-border">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-accent-foreground">
            <strong>How to use:</strong> Drag tables and row sections from the left toolbar onto the
            canvas. Click items to select and edit their properties in the right panel. Drag items
            on the canvas to reposition them.
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Toolbar */}
        <div className="w-64 flex-shrink-0 overflow-y-auto p-4 bg-muted border-r-2 border-border">
          <Toolbar />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 p-4 overflow-hidden">
          <Canvas
            items={items}
            selectedItemId={selectedItemId}
            onItemsChange={setItems}
            onSelectionChange={setSelectedItemId}
            onDropItem={handleDropItem}
            gridSize={20}
            showGrid={true}
          />
        </div>

        {/* Right: Property Panel - Only show when item is selected */}
        {selectedItem && (
          <div className="w-80 flex-shrink-0 overflow-y-auto p-4 bg-muted border-l-2 border-border">
            <PropertyPanel
              selectedItem={selectedItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onDuplicateItem={handleDuplicateItem}
            />
          </div>
        )}
      </div>
    </div>
  );
}
