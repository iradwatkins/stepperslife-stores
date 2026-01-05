"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getUserRolesInWorkspace } from "@/lib/navigation/workspaces";
import { AllRoles } from "@/lib/navigation/types";

interface WorkspaceSwitcherProps {
  children: React.ReactNode;
  /** Whether the sidebar is in collapsed mode */
  isCollapsed?: boolean;
}

/**
 * WorkspaceSwitcher
 *
 * A dropdown menu for switching between workspaces and roles on desktop.
 * Uses DropdownMenu for standard behavior, with Tooltip for collapsed sidebar mode.
 *
 * Features:
 * - Groups roles by workspace
 * - Shows colored icons for each workspace
 * - Checkmark indicates current selection
 * - Keyboard navigation support
 */
export function WorkspaceSwitcher({
  children,
  isCollapsed = false,
}: WorkspaceSwitcherProps) {
  const {
    user,
    currentWorkspace,
    currentRole,
    availableWorkspaces,
    switchRole,
    getRoleDisplayName,
  } = useWorkspace();

  if (!user) return <>{children}</>;

  const dropdownContent = (
    <DropdownMenuContent
      className="w-64"
      align={isCollapsed ? "start" : "start"}
      side={isCollapsed ? "right" : "bottom"}
      sideOffset={isCollapsed ? 8 : 4}
    >
      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Switch Workspace
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      {availableWorkspaces.map((workspace, index) => {
        const WorkspaceIcon = workspace.icon;
        const isCurrentWorkspace = currentWorkspace?.id === workspace.id;
        const rolesInWorkspace = getUserRolesInWorkspace(user, workspace.id);

        return (
          <React.Fragment key={workspace.id}>
            {index > 0 && <DropdownMenuSeparator />}

            {/* Workspace Group Header */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div
                className={cn(
                  "flex items-center justify-center",
                  "w-7 h-7 rounded-lg",
                  workspace.bgColor,
                  "text-white"
                )}
              >
                <WorkspaceIcon className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-sm">{workspace.name}</span>
            </div>

            {/* Roles in this Workspace */}
            {rolesInWorkspace.map((role) => (
              <WorkspaceRoleItem
                key={role}
                role={role}
                displayName={getRoleDisplayName(role)}
                isSelected={currentRole === role}
                workspaceColor={workspace.textColor}
                onSelect={() => switchRole(role)}
              />
            ))}
          </React.Fragment>
        );
      })}
    </DropdownMenuContent>
  );

  // For collapsed sidebar, wrap in tooltip for better UX
  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {currentWorkspace?.name}
              {currentRole && (
                <span className="text-muted-foreground ml-1">
                  ({getRoleDisplayName(currentRole)})
                </span>
              )}
            </TooltipContent>
            {dropdownContent}
          </DropdownMenu>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      {dropdownContent}
    </DropdownMenu>
  );
}

interface WorkspaceRoleItemProps {
  role: AllRoles;
  displayName: string;
  isSelected: boolean;
  workspaceColor: string;
  onSelect: () => void;
}

function WorkspaceRoleItem({
  displayName,
  isSelected,
  workspaceColor,
  onSelect,
}: WorkspaceRoleItemProps) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 cursor-pointer ml-4",
        isSelected && "bg-accent"
      )}
    >
      <span className="flex-1 text-sm">{displayName}</span>
      {isSelected && <Check className={cn("w-4 h-4", workspaceColor)} />}
    </DropdownMenuItem>
  );
}
