"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { AllRoles, NavUser } from "@/lib/navigation/types";
import {
  Workspace,
  WORKSPACES,
  getWorkspaceForRole,
  getWorkspaceById,
  getUserWorkspaces,
  getUserRolesInWorkspace,
  getWorkspaceDefaultPath,
  hasMultipleWorkspaces,
  getRoleDisplayName,
  isWorkspaceDisabled as checkWorkspaceDisabled,
} from "@/lib/navigation/workspaces";

const STORAGE_KEY = "stepperslife:workspace";

/**
 * Persisted workspace state in localStorage
 */
interface PersistedWorkspaceState {
  activeRole: AllRoles;
  lastVisited: Record<
    string,
    {
      role: AllRoles;
      path: string;
      timestamp: number;
    }
  >;
}

/**
 * Workspace context state
 */
interface WorkspaceContextState {
  // Current state
  currentWorkspace: Workspace | null;
  currentRole: AllRoles | null;
  user: NavUser | null;

  // Computed values
  availableWorkspaces: Workspace[];
  availableRolesInWorkspace: AllRoles[];
  hasMultipleWorkspaces: boolean;

  // Workspace preferences
  disabledWorkspaces: string[];
  isWorkspaceDisabled: (workspaceId: string) => boolean;
  updateWorkspacePreferences: (disabledWorkspaces: string[]) => Promise<void>;

  // UI state
  isBottomSheetOpen: boolean;
  setBottomSheetOpen: (open: boolean) => void;

  // Actions
  switchWorkspace: (workspaceId: string, role?: AllRoles) => void;
  switchRole: (role: AllRoles) => void;
  setUser: (user: NavUser | null) => void;

  // Helpers
  getRoleDisplayName: (role: AllRoles) => string;
}

const WorkspaceContext = createContext<WorkspaceContextState | undefined>(undefined);

interface WorkspaceProviderProps {
  children: React.ReactNode;
  initialUser?: NavUser | null;
  initialRole?: AllRoles;
}

export function WorkspaceProvider({
  children,
  initialUser = null,
  initialRole,
}: WorkspaceProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<NavUser | null>(initialUser);
  const [currentRole, setCurrentRole] = useState<AllRoles | null>(initialRole || null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Convex mutation for workspace preferences
  const updatePreferencesMutation = useMutation(api.users.mutations.updateWorkspacePreferences);

  // Workspace preferences - sync from user data
  const disabledWorkspaces = user?.disabledWorkspaces || [];

  // Check if a specific workspace is disabled
  const isWorkspaceDisabled = useCallback(
    (workspaceId: string) => {
      if (!user) return false;
      return checkWorkspaceDisabled(user, workspaceId);
    },
    [user]
  );

  // Update workspace preferences (persists to database)
  const updateWorkspacePreferences = useCallback(
    async (newDisabledWorkspaces: string[]) => {
      if (!user) {
        toast.error("You must be logged in to update preferences");
        return;
      }

      try {
        await updatePreferencesMutation({ disabledWorkspaces: newDisabledWorkspaces });

        // Update local user state with new preferences
        setUser({
          ...user,
          disabledWorkspaces: newDisabledWorkspaces.filter((ws) => ws !== "customer"),
        });

        toast.success("Workspace preferences updated");
      } catch (error) {
        console.error("Failed to update workspace preferences:", error);
        toast.error("Failed to update preferences");
      }
    },
    [user, updatePreferencesMutation]
  );

  // Compute derived state
  const availableWorkspaces = user ? getUserWorkspaces(user) : [];
  const currentWorkspace = currentRole ? getWorkspaceForRole(currentRole) : null;
  const availableRolesInWorkspace = user && currentWorkspace
    ? getUserRolesInWorkspace(user, currentWorkspace.id)
    : [];
  const multipleWorkspaces = user ? hasMultipleWorkspaces(user) : false;

  // Load persisted state on mount
  useEffect(() => {
    if (!user) {
      setIsLoaded(true);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: PersistedWorkspaceState = JSON.parse(saved);

        // Validate that the saved role is still accessible to this user
        const userWorkspaces = getUserWorkspaces(user);
        const validRoles = userWorkspaces.flatMap((ws) =>
          getUserRolesInWorkspace(user, ws.id)
        );

        if (validRoles.includes(parsed.activeRole)) {
          setCurrentRole(parsed.activeRole);
        } else if (validRoles.length > 0) {
          // Fallback to first available role
          setCurrentRole(validRoles[0]);
        }
      } else if (!currentRole && user) {
        // No saved state, use user's primary role
        setCurrentRole(user.role);
      }
    } catch (error) {
      console.error("Failed to load workspace state:", error);
      if (user) {
        setCurrentRole(user.role);
      }
    }

    setIsLoaded(true);
  }, [user]);

  // Persist state changes
  useEffect(() => {
    if (!isLoaded || !currentRole || !currentWorkspace) return;

    try {
      const existingSaved = localStorage.getItem(STORAGE_KEY);
      const existing: PersistedWorkspaceState = existingSaved
        ? JSON.parse(existingSaved)
        : { activeRole: currentRole, lastVisited: {} };

      const newState: PersistedWorkspaceState = {
        activeRole: currentRole,
        lastVisited: {
          ...existing.lastVisited,
          [currentWorkspace.id]: {
            role: currentRole,
            path: pathname || currentWorkspace.defaultPath,
            timestamp: Date.now(),
          },
        },
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("Failed to save workspace state:", error);
    }
  }, [currentRole, pathname, currentWorkspace, isLoaded]);

  // Switch to a different workspace
  const switchWorkspace = useCallback(
    (workspaceId: string, role?: AllRoles) => {
      if (!user) return;

      const workspace = getWorkspaceById(workspaceId);
      if (!workspace) return;

      // Get the role to switch to
      let targetRole = role;

      if (!targetRole) {
        // Try to restore last used role in this workspace
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed: PersistedWorkspaceState = JSON.parse(saved);
            const lastVisited = parsed.lastVisited[workspaceId];
            if (lastVisited) {
              const validRoles = getUserRolesInWorkspace(user, workspaceId);
              if (validRoles.includes(lastVisited.role)) {
                targetRole = lastVisited.role;
              }
            }
          }
        } catch {
          // Ignore parse errors
        }

        // Fallback to first available role in workspace
        if (!targetRole) {
          const validRoles = getUserRolesInWorkspace(user, workspaceId);
          if (validRoles.length > 0) {
            targetRole = validRoles[0];
          }
        }
      }

      if (!targetRole) return;

      // Update state and navigate
      setCurrentRole(targetRole);
      setBottomSheetOpen(false);

      // Get the path to navigate to
      let targetPath: string;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: PersistedWorkspaceState = JSON.parse(saved);
          const lastVisited = parsed.lastVisited[workspaceId];
          if (lastVisited && lastVisited.path) {
            targetPath = lastVisited.path;
          } else {
            targetPath = getWorkspaceDefaultPath(user, workspaceId);
          }
        } else {
          targetPath = getWorkspaceDefaultPath(user, workspaceId);
        }
      } catch {
        targetPath = getWorkspaceDefaultPath(user, workspaceId);
      }

      router.push(targetPath);
    },
    [user, router]
  );

  // Switch to a different role within the same or different workspace
  const switchRole = useCallback(
    (role: AllRoles) => {
      if (!user) return;

      const workspace = getWorkspaceForRole(role);
      if (!workspace) return;

      setCurrentRole(role);
      setBottomSheetOpen(false);

      // Navigate to the role's dashboard
      const rolePaths: Record<AllRoles, string> = {
        admin: "/admin",
        organizer: "/organizer/dashboard",
        instructor: "/instructor/dashboard",
        restaurateur: "/restaurateur/dashboard",
        vendor: "/vendor/dashboard",
        user: "/user/dashboard",
        STAFF: "/staff/dashboard",
        TEAM_MEMBERS: "/team/dashboard",
        ASSOCIATES: "/associate/dashboard",
      };

      router.push(rolePaths[role]);
    },
    [user, router]
  );

  // Update user (called from layout components)
  const updateUser = useCallback((newUser: NavUser | null) => {
    setUser(newUser);
    if (newUser && !currentRole) {
      setCurrentRole(newUser.activeRole || newUser.role);
    }
  }, [currentRole]);

  const value: WorkspaceContextState = {
    currentWorkspace,
    currentRole,
    user,
    availableWorkspaces,
    availableRolesInWorkspace,
    hasMultipleWorkspaces: multipleWorkspaces,
    disabledWorkspaces,
    isWorkspaceDisabled,
    updateWorkspacePreferences,
    isBottomSheetOpen,
    setBottomSheetOpen,
    switchWorkspace,
    switchRole,
    setUser: updateUser,
    getRoleDisplayName,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Hook to access workspace context
 */
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

/**
 * Hook to check if user has access to multiple workspaces
 * Safe to use outside of WorkspaceProvider (returns false)
 */
export function useHasMultipleWorkspaces() {
  const context = useContext(WorkspaceContext);
  return context?.hasMultipleWorkspaces ?? false;
}
