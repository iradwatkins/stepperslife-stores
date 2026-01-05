"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { NavSection, NavItem as NavItemType } from "@/lib/navigation/types";
import { NavItem } from "./NavItem";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  section: NavSection;
  roleKey: string;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export function CollapsibleSection({
  section,
  roleKey,
  isCollapsed = false,
  onNavigate,
}: CollapsibleSectionProps) {
  const storageKey = `nav-section-${roleKey}-${section.title || "untitled"}`;

  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return !section.defaultCollapsed;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return stored === "true";
    return !section.defaultCollapsed;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && section.collapsible) {
      localStorage.setItem(storageKey, String(isExpanded));
    }
  }, [isExpanded, storageKey, section.collapsible]);

  const toggleSection = () => {
    if (section.collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  // Don't render section header if sidebar is collapsed
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {section.items.map((item, idx) => (
          <NavItem
            key={idx}
            item={item}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Divider */}
      {section.showDivider && (
        <div className="h-px bg-sidebar-border mx-4 my-2" />
      )}

      {/* Section Header */}
      {section.title && (
        <button
          onClick={toggleSection}
          disabled={!section.collapsible}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider",
            "text-sidebar-foreground/60",
            section.collapsible && "hover:text-sidebar-foreground cursor-pointer",
            !section.collapsible && "cursor-default"
          )}
        >
          {section.icon && (
            <section.icon className="w-4 h-4" />
          )}
          <span className="flex-1 text-left">{section.title}</span>
          {section.collapsible && (
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                !isExpanded && "-rotate-90"
              )}
            />
          )}
        </button>
      )}

      {/* Section Items */}
      <div
        className={cn(
          "space-y-1 overflow-hidden transition-all duration-200",
          section.collapsible && !isExpanded && "max-h-0 opacity-0",
          (!section.collapsible || isExpanded) && "max-h-[2000px] opacity-100"
        )}
      >
        {section.items.map((item, idx) => (
          <NavItem
            key={idx}
            item={item}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}
