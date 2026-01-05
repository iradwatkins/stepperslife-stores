"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Eye, EyeOff, Link2, X } from "lucide-react";

interface BulkActionToolbarProps {
  selectedCount: number;
  onPublishAll: () => void;
  onUnpublishAll: () => void;
  onDeleteAll: () => void;
  onSelectSeries?: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
  hasSeriesInSelection?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onPublishAll,
  onUnpublishAll,
  onDeleteAll,
  onSelectSeries,
  onClearSelection,
  isLoading = false,
  hasSeriesInSelection = false,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-foreground text-background rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
          {/* Selection Count */}
          <div className="flex items-center gap-2 pr-3 border-r border-background/20">
            <span className="text-sm font-semibold">
              {selectedCount} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Publish All */}
            <button
              onClick={onPublishAll}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-success hover:bg-success/10 rounded-lg transition-colors disabled:opacity-50"
              title="Publish all selected"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Publish</span>
            </button>

            {/* Unpublish All */}
            <button
              onClick={onUnpublishAll}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-warning hover:bg-warning/10 rounded-lg transition-colors disabled:opacity-50"
              title="Unpublish all selected"
            >
              <EyeOff className="w-4 h-4" />
              <span className="hidden sm:inline">Unpublish</span>
            </button>

            {/* Select Entire Series - Only show if series detected */}
            {hasSeriesInSelection && onSelectSeries && (
              <button
                onClick={onSelectSeries}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                title="Select all classes in the series"
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Select Series</span>
              </button>
            )}

            {/* Delete All */}
            <button
              onClick={onDeleteAll}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
              title="Delete all selected"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>

          {/* Clear Selection */}
          <div className="pl-3 border-l border-background/20">
            <button
              onClick={onClearSelection}
              disabled={isLoading}
              className="p-2 text-background/60 hover:text-background hover:bg-background/10 rounded-lg transition-colors disabled:opacity-50"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
