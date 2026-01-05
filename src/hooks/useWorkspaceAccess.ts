"use client";

import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Maps route prefixes to workspace IDs
 * Used to check if current route's workspace is disabled
 */
const ROUTE_TO_WORKSPACE: Record<string, string> = {
  "/organizer": "events",
  "/instructor": "classes",
  "/restaurateur": "restaurant",
  "/vendor": "marketplace",
};

/**
 * Hook that checks workspace access and redirects if the workspace is disabled.
 *
 * Usage: Add to workspace layout components (organizer, instructor, etc.)
 *
 * Behavior:
 * - If user navigates to a disabled workspace, redirects to /user/dashboard
 * - Shows toast notification about the redirect
 * - Admin users bypass this check (always have access)
 * - /user/* routes are never blocked (customer workspace cannot be disabled)
 */
export function useWorkspaceAccess() {
  const pathname = usePathname();
  const router = useRouter();
  const { isWorkspaceDisabled, user } = useWorkspace();

  useEffect(() => {
    // Don't check if no user (unauthenticated)
    if (!user) return;

    // Admin users can access all workspaces
    if (user.role === "admin") return;

    // /user/* routes are always accessible (customer workspace cannot be disabled)
    if (pathname.startsWith("/user")) return;

    // Check if current route belongs to a disabled workspace
    for (const [prefix, workspaceId] of Object.entries(ROUTE_TO_WORKSPACE)) {
      if (pathname.startsWith(prefix)) {
        if (isWorkspaceDisabled(workspaceId)) {
          toast.info("This workspace is disabled. Redirecting to your dashboard.", {
            description: "You can re-enable it in Settings → Workspace Preferences",
          });
          router.replace("/user/dashboard");
          return;
        }
        break;
      }
    }
  }, [pathname, user, isWorkspaceDisabled, router]);
}

/**
 * Hook to get the workspace ID for the current route
 */
export function useCurrentWorkspaceId(): string | null {
  const pathname = usePathname();

  for (const [prefix, workspaceId] of Object.entries(ROUTE_TO_WORKSPACE)) {
    if (pathname.startsWith(prefix)) {
      return workspaceId;
    }
  }

  // Check for user routes (customer workspace)
  if (pathname.startsWith("/user")) {
    return "customer";
  }

  // Check for admin routes
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  return null;
}
