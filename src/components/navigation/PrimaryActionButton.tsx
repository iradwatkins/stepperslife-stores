"use client";

import Link from "next/link";
import { NavItem as NavItemType } from "@/lib/navigation/types";
import { cn } from "@/lib/utils";

interface PrimaryActionButtonProps {
  item: NavItemType;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export function PrimaryActionButton({
  item,
  isCollapsed = false,
  onNavigate,
}: PrimaryActionButtonProps) {
  // When collapsed, show as a compact icon button
  if (isCollapsed) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center justify-center mx-2 p-3 rounded-xl",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 active:scale-95",
          "transition-all duration-150",
          "shadow-lg shadow-primary/20"
        )}
      >
        <item.icon className="w-6 h-6" />
      </Link>
    );
  }

  // Full prominent button for expanded sidebar
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 mx-3 px-4 py-4 rounded-xl",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90 active:scale-[0.98]",
        "transition-all duration-150",
        "shadow-lg shadow-primary/20",
        "min-h-[56px]" // Touch-friendly height
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/10">
        <item.icon className="w-6 h-6" />
      </div>

      {/* Label and subtitle */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-base truncate">{item.label}</div>
        {item.subtitle && (
          <div className="text-xs text-primary-foreground/70 truncate">
            {item.subtitle}
          </div>
        )}
      </div>

      {/* Badge */}
      {item.badge && (
        <div className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-destructive text-destructive-foreground text-sm font-bold rounded-full">
          {item.badge}
        </div>
      )}
    </Link>
  );
}
