"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NavItem as NavItemType } from "@/lib/navigation/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItemProps {
  item: NavItemType;
  isCollapsed?: boolean;
  isActive?: boolean;
  hasActiveSubmenu?: boolean;
  onNavigate?: () => void;
}

export function NavItem({
  item,
  isCollapsed = false,
  isActive = false,
  hasActiveSubmenu = false,
  onNavigate,
}: NavItemProps) {
  const pathname = usePathname();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(hasActiveSubmenu);

  const hasSubmenu = item.submenu && item.submenu.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (hasSubmenu) {
      // Don't prevent navigation, just toggle submenu
      setIsSubmenuOpen(!isSubmenuOpen);
    } else if (onNavigate) {
      onNavigate();
    }
  };

  const itemContent = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-semibold",
        hasActiveSubmenu && !isActive && "bg-sidebar-accent/50",
        item.highlight && "ring-2 ring-primary ring-inset",
        isCollapsed && "justify-center px-2"
      )}
      onClick={handleClick}
      aria-expanded={hasSubmenu ? isSubmenuOpen : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Icon */}
      <item.icon
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70",
          "group-hover:text-sidebar-accent-foreground",
          isCollapsed ? "w-6 h-6" : "w-5 h-5"
        )}
      />

      {/* Label and Badge */}
      {!isCollapsed && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-full">
              {item.badge}
            </span>
          )}
        </div>
      )}

      {/* Submenu Arrow */}
      {!isCollapsed && hasSubmenu && (
        <ChevronRight
          className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-200",
            isSubmenuOpen && "rotate-90"
          )}
        />
      )}
    </div>
  );

  // If collapsed, wrap in tooltip - always use Link even for items with submenus
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href} onClick={onNavigate}>
              {itemContent}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-semibold">{item.label}</span>
            {item.description && (
              <span className="text-xs text-muted-foreground">{item.description}</span>
            )}
            {item.badge && (
              <span className="text-xs text-destructive font-semibold">
                {item.badge} notifications
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Regular item - always use Link so parent items with submenus can still navigate
  const mainItem = (
    <Link href={item.href} onClick={onNavigate}>
      {itemContent}
    </Link>
  );

  return (
    <div className="space-y-1">
      {mainItem}

      {/* Submenu */}
      {hasSubmenu && !isCollapsed && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            isSubmenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-4">
            {item.submenu!.map((subItem, index) => {
              const isSubItemActive = pathname === subItem.href;

              return (
                <Link
                  key={index}
                  href={subItem.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isSubItemActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                >
                  {subItem.icon && (
                    <subItem.icon className="w-4 h-4 shrink-0 text-sidebar-foreground/60" />
                  )}
                  <span className="flex-1 truncate">{subItem.label}</span>
                  {subItem.badge && (
                    <span className="shrink-0 flex items-center justify-center min-w-[18px] h-4 px-1 bg-destructive text-destructive-foreground text-xs font-semibold rounded-full">
                      {subItem.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
