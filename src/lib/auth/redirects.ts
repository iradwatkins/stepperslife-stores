/**
 * Authentication redirect utilities
 *
 * Handles post-login redirects based on user roles and intended destinations
 */

import { AllRoles } from "@/lib/navigation/types";

export interface UserRoleInfo {
  role: AllRoles;
  staffRoles?: AllRoles[];
}

/**
 * Get the default dashboard path for a user based on their role
 *
 * Priority order:
 * 1. Admin → /admin
 * 2. Organizer → /organizer/dashboard
 * 3. Team Member (staff) → /team/dashboard
 * 4. Associate (staff) → /associate/dashboard
 * 5. Staff → /staff/dashboard
 * 6. User → /user/dashboard (default fallback)
 */
export function getDefaultDashboardPath(userRoleInfo: UserRoleInfo): string {
  const { role, staffRoles } = userRoleInfo;

  // Admin has highest priority
  if (role === "admin") {
    return "/admin";
  }

  // Instructor has second priority
  if (role === "instructor") {
    return "/instructor/dashboard";
  }

  // Organizer has third priority
  if (role === "organizer") {
    return "/organizer/dashboard";
  }

  // Restaurateur dashboard
  if (role === "restaurateur") {
    return "/restaurateur/dashboard";
  }

  // Check staff roles in priority order
  if (staffRoles && staffRoles.length > 0) {
    // Team member has priority over associate and general staff
    if (staffRoles.includes("TEAM_MEMBERS")) {
      return "/team/dashboard";
    }

    // Associate has priority over general staff
    if (staffRoles.includes("ASSOCIATES")) {
      return "/associate/dashboard";
    }

    // General event staff
    if (staffRoles.includes("STAFF")) {
      return "/staff/dashboard";
    }
  }

  // Default to user dashboard for regular customers
  return "/user/dashboard";
}

/**
 * Get redirect path after successful login
 *
 * @param userRoleInfo - User's role information
 * @param intendedDestination - Optional path the user was trying to access before login
 * @returns The path to redirect to
 */
export function getPostLoginRedirect(
  userRoleInfo: UserRoleInfo,
  intendedDestination?: string | null
): string {
  // If there's an intended destination and it's valid, use it
  if (intendedDestination && isValidRedirectPath(intendedDestination)) {
    return intendedDestination;
  }

  // Otherwise, redirect to user's default dashboard
  return getDefaultDashboardPath(userRoleInfo);
}

/**
 * Check if a path is valid for redirect
 *
 * Security: Prevents open redirect vulnerabilities
 */
export function isValidRedirectPath(path: string): boolean {
  // Must be a relative path (starts with /)
  if (!path.startsWith("/")) {
    return false;
  }

  // Must not contain protocol (prevents external redirects)
  if (path.includes("://")) {
    return false;
  }

  // Must not start with // (prevents protocol-relative URLs)
  if (path.startsWith("//")) {
    return false;
  }

  // Don't allow redirect to login/register pages
  if (path.startsWith("/login") || path.startsWith("/register")) {
    return false;
  }

  return true;
}

/**
 * Extract redirect parameter from URL search params
 */
export function getRedirectFromQuery(searchParams: URLSearchParams): string | null {
  const redirect = searchParams.get("redirect");

  if (!redirect) {
    return null;
  }

  // Validate before returning
  return isValidRedirectPath(redirect) ? redirect : null;
}

/**
 * Build login URL with redirect parameter
 */
export function buildLoginUrl(currentPath: string): string {
  const loginUrl = new URL("/login", window.location.origin);

  if (currentPath && currentPath !== "/" && isValidRedirectPath(currentPath)) {
    loginUrl.searchParams.set("redirect", currentPath);
  }

  return loginUrl.pathname + loginUrl.search;
}

/**
 * Get all accessible dashboard paths for a user
 *
 * Useful for multi-role users to know which dashboards they can access
 */
export function getAccessibleDashboards(userRoleInfo: UserRoleInfo): {
  role: AllRoles;
  path: string;
  label: string;
}[] {
  const { role, staffRoles } = userRoleInfo;
  const dashboards: { role: AllRoles; path: string; label: string }[] = [];

  // Admin can access all dashboards
  if (role === "admin") {
    return [
      { role: "admin", path: "/admin", label: "Administrator" },
      {
        role: "instructor",
        path: "/instructor/dashboard",
        label: "Instructor",
      },
      {
        role: "organizer",
        path: "/organizer/dashboard",
        label: "Event Organizer",
      },
      {
        role: "restaurateur",
        path: "/restaurateur/dashboard",
        label: "Restaurant Owner",
      },
      { role: "STAFF", path: "/staff/dashboard", label: "Event Staff" },
      {
        role: "TEAM_MEMBERS",
        path: "/team/dashboard",
        label: "Team Member",
      },
      { role: "ASSOCIATES", path: "/associate/dashboard", label: "Associate" },
      { role: "user", path: "/user/dashboard", label: "Customer" },
    ];
  }

  // Add primary role dashboard
  if (role === "instructor") {
    dashboards.push({
      role: "instructor",
      path: "/instructor/dashboard",
      label: "Instructor",
    });
  }

  if (role === "organizer") {
    dashboards.push({
      role: "organizer",
      path: "/organizer/dashboard",
      label: "Event Organizer",
    });
  }

  if (role === "restaurateur") {
    dashboards.push({
      role: "restaurateur",
      path: "/restaurateur/dashboard",
      label: "Restaurant Owner",
    });
  }

  // Add staff role dashboards
  if (staffRoles) {
    if (staffRoles.includes("TEAM_MEMBERS")) {
      dashboards.push({
        role: "TEAM_MEMBERS",
        path: "/team/dashboard",
        label: "Team Member",
      });
    }
    if (staffRoles.includes("ASSOCIATES")) {
      dashboards.push({
        role: "ASSOCIATES",
        path: "/associate/dashboard",
        label: "Associate",
      });
    }
    if (staffRoles.includes("STAFF")) {
      dashboards.push({
        role: "STAFF",
        path: "/staff/dashboard",
        label: "Event Staff",
      });
    }
  }

  // All authenticated users can access user dashboard
  dashboards.push({
    role: "user",
    path: "/user/dashboard",
    label: "Customer",
  });

  return dashboards;
}

/**
 * Check if user should be redirected away from a page
 *
 * For example, logged-in users shouldn't see login page
 */
export function shouldRedirectFromPage(
  currentPath: string,
  isAuthenticated: boolean
): { shouldRedirect: boolean; redirectTo?: string } {
  // Logged-in users shouldn't access login/register pages
  if (
    isAuthenticated &&
    (currentPath.startsWith("/login") || currentPath.startsWith("/register"))
  ) {
    return {
      shouldRedirect: true,
      redirectTo: "/user/dashboard",
    };
  }

  return {
    shouldRedirect: false,
  };
}
