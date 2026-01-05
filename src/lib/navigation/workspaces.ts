import {
  Calendar,
  UtensilsCrossed,
  Store,
  User,
  Shield,
  LucideIcon,
} from "lucide-react";
import { AllRoles, NavUser } from "./types";

/**
 * Workspace configuration
 * Groups related roles into logical workspaces for easier navigation
 */
export interface Workspace {
  /** Unique identifier for the workspace */
  id: string;

  /** Display name */
  name: string;

  /** Lucide icon for the workspace */
  icon: LucideIcon;

  /** Background color class (Tailwind) */
  bgColor: string;

  /** Text color class (Tailwind) */
  textColor: string;

  /** Border color class (Tailwind) */
  borderColor: string;

  /** Roles that belong to this workspace */
  roles: AllRoles[];

  /** Default path when switching to this workspace */
  defaultPath: string;

  /** Description shown in workspace switcher */
  description: string;

  /** Whether to exclude this workspace from admin view */
  excludeFromAdmin?: boolean;
}

/**
 * Workspace definitions
 * Each workspace groups related roles and provides a cohesive experience
 */
export const WORKSPACES: Workspace[] = [
  {
    id: "events",
    name: "Events",
    icon: Calendar,
    bgColor: "bg-purple-500",
    textColor: "text-purple-500",
    borderColor: "border-purple-500",
    roles: ["organizer", "STAFF", "TEAM_MEMBERS", "ASSOCIATES"],
    defaultPath: "/organizer/dashboard",
    description: "Manage events, tickets & team",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    icon: UtensilsCrossed,
    bgColor: "bg-orange-500",
    textColor: "text-orange-500",
    borderColor: "border-orange-500",
    roles: ["restaurateur"],
    defaultPath: "/restaurateur/dashboard",
    description: "Manage orders & menu",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    icon: Store,
    bgColor: "bg-green-500",
    textColor: "text-green-500",
    borderColor: "border-green-500",
    roles: ["vendor"],
    defaultPath: "/vendor/dashboard",
    description: "Manage products & sales",
  },
  {
    id: "customer",
    name: "My Account",
    icon: User,
    bgColor: "bg-blue-500",
    textColor: "text-blue-500",
    borderColor: "border-blue-500",
    roles: ["user"],
    defaultPath: "/user/dashboard",
    description: "My tickets & orders",
    // Note: This workspace is for regular users only, not admin
    excludeFromAdmin: true,
  },
  {
    id: "admin",
    name: "Admin",
    icon: Shield,
    bgColor: "bg-red-500",
    textColor: "text-red-500",
    borderColor: "border-red-500",
    roles: ["admin"],
    defaultPath: "/admin",
    description: "Platform administration",
  },
];

/**
 * Get workspace for a given role
 */
export function getWorkspaceForRole(role: AllRoles): Workspace | null {
  return WORKSPACES.find((ws) => ws.roles.includes(role)) || null;
}

/**
 * Get workspace by ID
 */
export function getWorkspaceById(id: string): Workspace | null {
  return WORKSPACES.find((ws) => ws.id === id) || null;
}

/**
 * Get all workspaces a user has access to based on their roles
 * Filters out disabled workspaces (but never filters "customer")
 */
export function getUserWorkspaces(user: NavUser): Workspace[] {
  const userRoles = new Set<AllRoles>([user.role]);

  // Add staff roles if present
  if (user.staffRoles) {
    user.staffRoles.forEach((role) => userRoles.add(role));
  }

  // IMPORTANT: Admin is SUPPORT ONLY - they cannot own content, only manage others'
  // Admin only has access to the admin workspace (not events, restaurant, marketplace, etc.)
  // They support other content types via admin panel pages (/admin/classes, /admin/restaurants, etc.)
  if (user.role === "admin") {
    return WORKSPACES.filter((ws) => ws.id === "admin");
  }

  // Filter workspaces where user has at least one role
  let workspaces = WORKSPACES.filter(
    (ws) => ws.roles.length > 0 && ws.roles.some((role) => userRoles.has(role))
  );

  // Filter out disabled workspaces (but never filter "customer")
  const disabledSet = new Set(user.disabledWorkspaces || []);
  workspaces = workspaces.filter(
    (ws) => ws.id === "customer" || !disabledSet.has(ws.id)
  );

  return workspaces;
}

/**
 * Check if a specific workspace is disabled for a user
 * Note: "customer" workspace can never be disabled
 */
export function isWorkspaceDisabled(user: NavUser, workspaceId: string): boolean {
  // "customer" workspace is always enabled (cannot be disabled)
  if (workspaceId === "customer") {
    return false;
  }

  // Admin users cannot have disabled workspaces
  if (user.role === "admin") {
    return false;
  }

  return user.disabledWorkspaces?.includes(workspaceId) || false;
}

/**
 * Get list of workspaces that CAN be disabled by the user
 * Excludes "customer" workspace and workspaces user doesn't have access to
 */
export function getDisableableWorkspaces(user: NavUser): Workspace[] {
  // Admin cannot disable workspaces
  if (user.role === "admin") {
    return [];
  }

  // Get all workspaces user has access to, excluding customer and admin
  const userRoles = new Set<AllRoles>([user.role]);
  if (user.staffRoles) {
    user.staffRoles.forEach((role) => userRoles.add(role));
  }

  return WORKSPACES.filter(
    (ws) =>
      ws.id !== "customer" &&
      ws.id !== "admin" &&
      ws.roles.some((role) => userRoles.has(role))
  );
}

/**
 * Get all roles within a workspace that a user has access to
 */
export function getUserRolesInWorkspace(
  user: NavUser,
  workspaceId: string
): AllRoles[] {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) return [];

  const userRoles = new Set<AllRoles>([user.role]);
  if (user.staffRoles) {
    user.staffRoles.forEach((role) => userRoles.add(role));
  }

  // Admin has access to all roles in a workspace
  if (user.role === "admin") {
    return workspace.roles;
  }

  return workspace.roles.filter((role) => userRoles.has(role));
}

/**
 * Get the default path for a workspace based on user's role
 */
export function getWorkspaceDefaultPath(
  user: NavUser,
  workspaceId: string
): string {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) return "/";

  const userRoles = getUserRolesInWorkspace(user, workspaceId);
  if (userRoles.length === 0) return "/";

  // Map roles to their dashboard paths
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

  // Return path for first available role in this workspace
  return rolePaths[userRoles[0]] || workspace.defaultPath;
}

/**
 * Check if user has access to multiple workspaces
 */
export function hasMultipleWorkspaces(user: NavUser): boolean {
  return getUserWorkspaces(user).length > 1;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: AllRoles): string {
  const displayNames: Record<AllRoles, string> = {
    admin: "Administrator",
    organizer: "Event Organizer",
    instructor: "Class Instructor",
    restaurateur: "Restaurant Partner",
    vendor: "Store Owner",
    user: "Customer",
    STAFF: "Event Staff",
    TEAM_MEMBERS: "Team Member",
    ASSOCIATES: "Sales Associate",
  };
  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: AllRoles): string {
  const descriptions: Record<AllRoles, string> = {
    admin: "Full platform access",
    organizer: "Create and manage events",
    instructor: "Create and teach classes",
    restaurateur: "Manage restaurant orders",
    vendor: "Manage products & sales",
    user: "Browse and purchase tickets",
    STAFF: "Scan tickets at events",
    TEAM_MEMBERS: "Distribute tickets to team",
    ASSOCIATES: "Sell tickets and earn commission",
  };
  return descriptions[role] || "";
}
