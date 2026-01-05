"use client";

import { useCallback } from "react";
import { LayoutGrid, LayoutList, Columns3 } from "lucide-react";
import { motion } from "framer-motion";

export type ViewMode = "grid" | "list" | "masonry";

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className = "" }: ViewToggleProps) {
  const views: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
    { id: "grid", icon: <LayoutGrid className="w-4 h-4" />, label: "Grid view" },
    { id: "list", icon: <LayoutList className="w-4 h-4" />, label: "List view" },
    { id: "masonry", icon: <Columns3 className="w-4 h-4" />, label: "Masonry view" },
  ];

  const currentIndex = views.findIndex(v => v.id === view);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        nextIndex = (index + 1) % views.length;
        onViewChange(views[nextIndex].id);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        nextIndex = (index - 1 + views.length) % views.length;
        onViewChange(views[nextIndex].id);
        break;
    }
  }, [onViewChange, views]);

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 bg-muted rounded-lg ${className}`}
      role="group"
      aria-label="View options"
    >
      {views.map(({ id, icon, label }, index) => (
        <motion.button
          key={id}
          type="button"
          onClick={() => onViewChange(id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          tabIndex={view === id ? 0 : -1}
          className={`relative p-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            view === id
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={label}
          aria-pressed={view === id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {view === id && (
            <motion.div
              layoutId="viewToggleActive"
              className="absolute inset-0 bg-primary rounded-md"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10">{icon}</span>
        </motion.button>
      ))}
    </div>
  );
}

// CSS class helpers for different view modes
export function getViewClasses(view: ViewMode, type: "events" | "classes" | "products" | "restaurants" = "events"): string {
  switch (view) {
    case "list":
      return "flex flex-col gap-4";
    case "masonry":
      return "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4";
    case "grid":
    default:
      if (type === "products") {
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
      }
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
  }
}

// Card wrapper for masonry layout (prevents break-inside)
export function MasonryCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`break-inside-avoid mb-4 ${className}`}>
      {children}
    </div>
  );
}
