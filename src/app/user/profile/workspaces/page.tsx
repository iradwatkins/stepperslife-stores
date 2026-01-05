"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  WORKSPACES,
  getDisableableWorkspaces,
  isWorkspaceDisabled,
} from "@/lib/navigation/workspaces";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspacePreferencesPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const {
    user,
    disabledWorkspaces,
    updateWorkspacePreferences,
  } = useWorkspace();

  // Local state for optimistic UI updates
  const [localDisabled, setLocalDisabled] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Sync local state with context
  useEffect(() => {
    setLocalDisabled(disabledWorkspaces);
  }, [disabledWorkspaces]);

  // Get workspaces this user CAN disable (excludes customer and admin)
  const disableableWorkspaces = user ? getDisableableWorkspaces(user) : [];

  // Handle toggle
  const handleToggle = async (workspaceId: string, enabled: boolean) => {
    if (!user) return;

    setIsUpdating(workspaceId);

    // Optimistic update
    const newDisabled = enabled
      ? localDisabled.filter((id) => id !== workspaceId)
      : [...localDisabled, workspaceId];
    setLocalDisabled(newDisabled);

    try {
      await updateWorkspacePreferences(newDisabled);
    } catch {
      // Revert on error
      setLocalDisabled(disabledWorkspaces);
    } finally {
      setIsUpdating(null);
    }
  };

  // Check if a workspace is enabled (not in disabled list)
  const isEnabled = (workspaceId: string) => {
    return !localDisabled.includes(workspaceId);
  };

  // Loading state
  if (!currentUser || !user) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Get customer workspace (always shown but disabled toggle)
  const customerWorkspace = WORKSPACES.find((ws) => ws.id === "customer");

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link
          href="/user/profile"
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Preferences</h1>
          <p className="text-muted-foreground mt-1">
            Control which workspaces appear in your navigation
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Toggle off workspaces you no longer use to declutter your dashboard.
              You can re-enable them at any time. Your "My Account" workspace is always
              visible and cannot be disabled.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Toggle Cards */}
      <div className="space-y-4">
        {/* Disableable Workspaces */}
        {disableableWorkspaces.map((workspace) => {
          const WorkspaceIcon = workspace.icon;
          const enabled = isEnabled(workspace.id);
          const updating = isUpdating === workspace.id;

          return (
            <Card
              key={workspace.id}
              className={cn(
                "transition-all",
                !enabled && "opacity-60"
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {/* Workspace Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center",
                      "w-12 h-12 rounded-xl",
                      workspace.bgColor,
                      "text-white",
                      !enabled && "opacity-50"
                    )}
                  >
                    <WorkspaceIcon className="w-6 h-6" />
                  </div>

                  {/* Workspace Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{workspace.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workspace.description}
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggle(workspace.id, checked)}
                    disabled={updating}
                    aria-label={`Toggle ${workspace.name} workspace`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Customer Workspace (Always Enabled) */}
        {customerWorkspace && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {/* Workspace Icon */}
                      <div
                        className={cn(
                          "flex items-center justify-center",
                          "w-12 h-12 rounded-xl",
                          customerWorkspace.bgColor,
                          "text-white"
                        )}
                      >
                        <customerWorkspace.icon className="w-6 h-6" />
                      </div>

                      {/* Workspace Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{customerWorkspace.name}</h3>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            Required
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {customerWorkspace.description}
                        </p>
                      </div>

                      {/* Disabled Switch */}
                      <Switch
                        checked={true}
                        disabled
                        aria-label="My Account workspace (cannot be disabled)"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>This workspace cannot be disabled</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* No Workspaces Message */}
        {disableableWorkspaces.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                You don't have any additional workspaces to manage.
                Apply for roles like Event Organizer or Instructor to access more workspaces.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
