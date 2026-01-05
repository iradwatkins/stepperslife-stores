"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetBody,
} from "@/components/ui/bottom-sheet";
import { getUserRolesInWorkspace } from "@/lib/navigation/workspaces";
import { AllRoles } from "@/lib/navigation/types";

interface WorkspaceBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * WorkspaceBottomSheet
 *
 * A mobile-optimized bottom sheet for switching between workspaces and roles.
 *
 * Design Principles:
 * - Large touch targets (56px per item) for thumb-friendly interaction
 * - Grouped by workspace category for easy scanning
 * - Clear visual indication of current selection
 * - Swipe down to dismiss
 */
export function WorkspaceBottomSheet({
  open,
  onOpenChange,
}: WorkspaceBottomSheetProps) {
  const {
    user,
    currentWorkspace,
    currentRole,
    availableWorkspaces,
    switchRole,
    getRoleDisplayName,
  } = useWorkspace();

  if (!user) return null;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size="auto">
        <BottomSheetHeader>
          <BottomSheetTitle>Switch Workspace</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-2 pb-8">
          {availableWorkspaces.map((workspace) => {
            const WorkspaceIcon = workspace.icon;
            const isCurrentWorkspace = currentWorkspace?.id === workspace.id;
            const rolesInWorkspace = getUserRolesInWorkspace(user, workspace.id);

            return (
              <div key={workspace.id} className="space-y-1">
                {/* Workspace Header */}
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2",
                    "rounded-lg",
                    isCurrentWorkspace && "bg-muted/50"
                  )}
                >
                  {/* Workspace Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center",
                      "w-10 h-10 rounded-xl",
                      workspace.bgColor,
                      "text-white"
                    )}
                  >
                    <WorkspaceIcon className="w-5 h-5" />
                  </div>

                  {/* Workspace Name */}
                  <div className="flex-1">
                    <div className="font-semibold text-base">
                      {workspace.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {workspace.description}
                    </div>
                  </div>
                </div>

                {/* Roles within this Workspace */}
                <div className="pl-4 space-y-0.5">
                  {rolesInWorkspace.map((role) => (
                    <RoleOption
                      key={role}
                      role={role}
                      isSelected={currentRole === role}
                      workspaceColor={workspace.textColor}
                      displayName={getRoleDisplayName(role)}
                      onSelect={() => switchRole(role)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}

interface RoleOptionProps {
  role: AllRoles;
  isSelected: boolean;
  workspaceColor: string;
  displayName: string;
  onSelect: () => void;
}

function RoleOption({
  isSelected,
  workspaceColor,
  displayName,
  onSelect,
}: RoleOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center w-full px-3 py-3.5", // 56px touch target (py-3.5 = 14px * 2 + line height)
        "rounded-lg",
        "text-left",
        "active:scale-[0.98] transition-all",
        "touch-manipulation",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-foreground"
      )}
    >
      {/* Role Name */}
      <span className="flex-1 text-sm">{displayName}</span>

      {/* Selected Indicator */}
      {isSelected && (
        <Check className={cn("w-5 h-5 shrink-0", workspaceColor)} />
      )}
    </button>
  );
}
