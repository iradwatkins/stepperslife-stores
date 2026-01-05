"use client";

import { usePathname } from "next/navigation";
import { ChevronDown, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceBottomSheet } from "./WorkspaceBottomSheet";
import Link from "next/link";

/**
 * MobileWorkspaceBar
 *
 * A fixed bottom bar for dashboard pages on mobile devices.
 * Provides quick access to workspace switching and common actions.
 *
 * Design Principles:
 * - Thumb zone optimized (bottom of screen)
 * - Large touch targets (56px height, 48px buttons)
 * - 2-tap maximum to switch workspaces
 * - Always visible context (shows current workspace)
 */
export function MobileWorkspaceBar() {
  const pathname = usePathname();
  const {
    currentWorkspace,
    currentRole,
    hasMultipleWorkspaces,
    isBottomSheetOpen,
    setBottomSheetOpen,
    getRoleDisplayName,
  } = useWorkspace();

  // Only show on dashboard routes
  const dashboardPaths = [
    "/organizer",
    "/admin",
    "/staff",
    "/team",
    "/associate",
    "/restaurateur",
    "/user",
    "/vendor",
  ];

  const isDashboardRoute = dashboardPaths.some((path) =>
    pathname?.startsWith(path)
  );

  // Hide on desktop (md and above)
  // Hide if no workspace (not logged in or loading)
  // Hide if user only has one workspace (no need to switch)
  if (!isDashboardRoute || !currentWorkspace || !hasMultipleWorkspaces) {
    return null;
  }

  const WorkspaceIcon = currentWorkspace.icon;

  return (
    <>
      {/* Bottom Bar */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-40",
          "bg-card border-t border-border",
          "safe-area-bottom"
        )}
      >
        <div className="flex items-center justify-between h-14 px-2">
          {/* Workspace Switcher Button - Main Action */}
          <button
            onClick={() => setBottomSheetOpen(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              "flex-1 max-w-[200px]",
              "bg-muted/50 hover:bg-muted",
              "active:scale-[0.98] transition-all",
              "touch-manipulation" // Prevents 300ms delay on touch
            )}
            aria-label="Switch workspace"
          >
            {/* Workspace Icon with Color */}
            <div
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-lg",
                currentWorkspace.bgColor,
                "text-white"
              )}
            >
              <WorkspaceIcon className="w-4 h-4" />
            </div>

            {/* Workspace Name & Role */}
            <div className="flex-1 min-w-0 text-left">
              <div className="font-medium text-sm truncate">
                {currentWorkspace.name}
              </div>
              {currentRole && (
                <div className="text-xs text-muted-foreground truncate">
                  {getRoleDisplayName(currentRole)}
                </div>
              )}
            </div>

            {/* Dropdown Indicator */}
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            {/* Profile Button */}
            <Link
              href={currentRole === "admin" ? "/admin/settings" : `/${pathname?.split("/")[1]}/profile`}
              className={cn(
                "flex items-center justify-center",
                "w-12 h-12 rounded-lg",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted active:scale-95",
                "transition-all touch-manipulation"
              )}
              aria-label="Profile"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Settings Button */}
            <Link
              href={`/${pathname?.split("/")[1]}/settings`}
              className={cn(
                "flex items-center justify-center",
                "w-12 h-12 rounded-lg",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted active:scale-95",
                "transition-all touch-manipulation"
              )}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Workspace Bottom Sheet */}
      <WorkspaceBottomSheet
        open={isBottomSheetOpen}
        onOpenChange={setBottomSheetOpen}
      />

      {/* Spacer to prevent content from being hidden behind the bar */}
      <div className="md:hidden h-14 safe-area-bottom" aria-hidden="true" />
    </>
  );
}
