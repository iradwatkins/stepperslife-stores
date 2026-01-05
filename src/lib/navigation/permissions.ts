import { NavUser, AllRoles } from "./types";
import { getWorkspaceForRole, isWorkspaceDisabled } from "./workspaces";

/**
 * Permission checking utilities for role-based access control
 */

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(user: NavUser | null): boolean {
  return user?.role === "admin";
}

/**
 * Check if user can access organizer features
 */
export function canAccessOrganizer(user: NavUser | null): boolean {
  return user?.role === "organizer" || user?.role === "admin";
}

/**
 * Check if user can access instructor features
 */
export function canAccessInstructor(user: NavUser | null): boolean {
  return user?.role === "instructor" || user?.role === "admin";
}

/**
 * Check if user can access restaurateur features
 */
export function canAccessRestaurateur(user: NavUser | null): boolean {
  return user?.role === "restaurateur" || user?.role === "admin";
}

/**
 * Check if user can access staff features
 */
export function canAccessStaff(user: NavUser | null): boolean {
  if (!user) return false;

  // Admin can access all staff features
  if (user.role === "admin") return true;

  // Check if user has any staff role
  return user.staffRoles ? user.staffRoles.length > 0 : false;
}

/**
 * Check if user can access team member features
 */
export function canAccessTeamMember(user: NavUser | null): boolean {
  if (!user) return false;

  // Admin can access all features
  if (user.role === "admin") return true;

  // Check if user has team member role
  return user.staffRoles?.includes("TEAM_MEMBERS") || false;
}

/**
 * Check if user can access associate features
 */
export function canAccessAssociate(user: NavUser | null): boolean {
  if (!user) return false;

  // Admin can access all features
  if (user.role === "admin") return true;

  // Check if user has associate role
  return user.staffRoles?.includes("ASSOCIATES") || false;
}

/**
 * Check if user can access user/customer dashboard
 */
export function canAccessUserDashboard(user: NavUser | null): boolean {
  // All authenticated users can access user dashboard
  return user !== null;
}

/**
 * Check if user can create events (NOT classes)
 */
export function canCreateEvents(user: NavUser | null): boolean {
  return user?.role === "organizer" || user?.role === "admin";
}

/**
 * Check if user can create classes (instructors only)
 */
export function canCreateClasses(user: NavUser | null): boolean {
  return user?.role === "instructor" || user?.role === "admin";
}

/**
 * Check if user can manage team members
 */
export function canManageTeamMembers(user: NavUser | null): boolean {
  if (!user) return false;

  return (
    user.role === "admin" ||
    user.role === "organizer" ||
    user.staffRoles?.includes("TEAM_MEMBERS") ||
    false
  );
}

/**
 * Check if user can manage associates
 */
export function canManageAssociates(user: NavUser | null): boolean {
  if (!user) return false;

  return (
    user.role === "admin" ||
    user.role === "organizer" ||
    user.staffRoles?.includes("TEAM_MEMBERS") ||
    false
  );
}

/**
 * Check if user can scan tickets
 */
export function canScanTickets(user: NavUser | null): boolean {
  if (!user) return false;

  return (
    user.role === "admin" ||
    user.staffRoles?.includes("STAFF") ||
    false
  );
}

/**
 * Check if user can view financial data
 */
export function canViewFinancials(user: NavUser | null): boolean {
  if (!user) return false;

  return (
    user.role === "admin" ||
    user.role === "organizer" ||
    user.staffRoles?.includes("TEAM_MEMBERS") ||
    user.staffRoles?.includes("ASSOCIATES") ||
    false
  );
}

/**
 * Check if user can manage all users (admin only)
 */
export function canManageAllUsers(user: NavUser | null): boolean {
  return user?.role === "admin";
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(user: NavUser | null): boolean {
  if (!user) return false;

  return (
    user.role === "admin" ||
    user.role === "organizer" ||
    user.staffRoles?.includes("STAFF") ||
    user.staffRoles?.includes("TEAM_MEMBERS") ||
    user.staffRoles?.includes("ASSOCIATES") ||
    false
  );
}

/**
 * Check if user can access platform settings
 */
export function canAccessPlatformSettings(user: NavUser | null): boolean {
  return user?.role === "admin";
}

/**
 * Check if user can manage payment methods
 */
export function canManagePaymentMethods(user: NavUser | null): boolean {
  return user?.role === "organizer" || user?.role === "admin";
}

/**
 * Check if user can purchase tickets (as organizer for resale)
 */
export function canPurchaseTicketsForResale(user: NavUser | null): boolean {
  return user?.role === "organizer" || user?.role === "admin";
}

/**
 * Check if user can view own tickets (as customer)
 */
export function canViewOwnTickets(user: NavUser | null): boolean {
  // All authenticated users can view their purchased tickets
  return user !== null;
}

/**
 * Check if user can access specific role dashboard
 */
export function canAccessRoleDashboard(
  user: NavUser | null,
  role: AllRoles
): boolean {
  if (!user) return false;

  // Admin can access all dashboards
  if (user.role === "admin") return true;

  // Check main role
  if (user.role === role) return true;

  // Check staff roles
  if (user.staffRoles && user.staffRoles.includes(role as any)) {
    return true;
  }

  return false;
}

/**
 * Get all accessible role dashboards for a user
 * Filters out roles whose workspaces are disabled by the user
 */
export function getAccessibleRoles(user: NavUser | null): AllRoles[] {
  if (!user) return [];

  const roles: AllRoles[] = [];

  // Admin can access all roles (admin cannot disable workspaces)
  if (user.role === "admin") {
    return [
      "admin",
      "organizer",
      "instructor",
      "restaurateur",
      "user",
      "STAFF",
      "TEAM_MEMBERS",
      "ASSOCIATES",
    ];
  }

  // Add user's main role
  roles.push(user.role);

  // Add staff roles
  if (user.staffRoles) {
    roles.push(...user.staffRoles);
  }

  // All users can access user dashboard
  if (!roles.includes("user")) {
    roles.push("user");
  }

  // Filter out roles whose workspace is disabled
  // Note: "user" role maps to "customer" workspace which cannot be disabled
  return roles.filter((role) => {
    const workspace = getWorkspaceForRole(role);
    if (!workspace) return true; // Keep roles without workspaces
    return !isWorkspaceDisabled(user, workspace.id);
  });
}

/**
 * Check if route is protected and requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  const protectedPatterns = [
    "/admin",
    "/organizer",
    "/instructor",
    "/restaurateur",
    "/user",
    "/staff",
    "/team",
    "/associate",
    "/my-tickets",
  ];

  // Exception: /restaurateur/apply is public
  if (path.startsWith("/restaurateur/apply")) {
    return false;
  }

  return protectedPatterns.some((pattern) => path.startsWith(pattern));
}

/**
 * Check if route requires specific role
 */
export function getRequiredRoleForRoute(path: string): AllRoles | null {
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/organizer")) return "organizer";
  if (path.startsWith("/instructor")) return "instructor";
  if (path.startsWith("/restaurateur/apply")) return null; // Public
  if (path.startsWith("/restaurateur")) return "restaurateur";
  if (path.startsWith("/staff")) return "STAFF";
  if (path.startsWith("/team")) return "TEAM_MEMBERS";
  if (path.startsWith("/associate")) return "ASSOCIATES";
  if (path.startsWith("/user") || path.startsWith("/my-tickets"))
    return "user";

  return null;
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  user: NavUser | null,
  path: string
): boolean {
  if (!user) {
    return !isProtectedRoute(path);
  }

  const requiredRole = getRequiredRoleForRoute(path);

  if (!requiredRole) {
    return true; // Public route
  }

  return canAccessRoleDashboard(user, requiredRole);
}

/**
 * Get redirect path for unauthorized access
 */
export function getUnauthorizedRedirect(
  user: NavUser | null,
  attemptedPath: string
): string {
  if (!user) {
    // Not logged in - redirect to login with return URL
    return `/login?redirect=${encodeURIComponent(attemptedPath)}`;
  }

  // Logged in but wrong role - redirect to their default dashboard
  if (user.role === "admin") return "/admin";
  if (user.role === "organizer") return "/organizer/dashboard";
  if (user.role === "instructor") return "/instructor/dashboard";
  if (user.role === "restaurateur") return "/restaurateur/dashboard";

  // Check staff roles
  if (user.staffRoles?.includes("TEAM_MEMBERS")) return "/team/dashboard";
  if (user.staffRoles?.includes("ASSOCIATES")) return "/associate/dashboard";
  if (user.staffRoles?.includes("STAFF")) return "/staff/dashboard";

  // Default to user dashboard
  return "/user/dashboard";
}

/**
 * Permission context for components to check multiple permissions at once
 */
export interface PermissionContext {
  canAccessAdmin: boolean;
  canAccessOrganizer: boolean;
  canAccessInstructor: boolean;
  canAccessRestaurateur: boolean;
  canAccessStaff: boolean;
  canAccessTeamMember: boolean;
  canAccessAssociate: boolean;
  canCreateEvents: boolean;
  canCreateClasses: boolean;
  canManageTeamMembers: boolean;
  canManageAssociates: boolean;
  canScanTickets: boolean;
  canViewFinancials: boolean;
  canViewAnalytics: boolean;
  canAccessPlatformSettings: boolean;
}

/**
 * Generate permission context for a user
 */
export function generatePermissionContext(
  user: NavUser | null
): PermissionContext {
  return {
    canAccessAdmin: canAccessAdmin(user),
    canAccessOrganizer: canAccessOrganizer(user),
    canAccessInstructor: canAccessInstructor(user),
    canAccessRestaurateur: canAccessRestaurateur(user),
    canAccessStaff: canAccessStaff(user),
    canAccessTeamMember: canAccessTeamMember(user),
    canAccessAssociate: canAccessAssociate(user),
    canCreateEvents: canCreateEvents(user),
    canCreateClasses: canCreateClasses(user),
    canManageTeamMembers: canManageTeamMembers(user),
    canManageAssociates: canManageAssociates(user),
    canScanTickets: canScanTickets(user),
    canViewFinancials: canViewFinancials(user),
    canViewAnalytics: canViewAnalytics(user),
    canAccessPlatformSettings: canAccessPlatformSettings(user),
  };
}
