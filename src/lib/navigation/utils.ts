import { usePathname } from "next/navigation";
import {
  NavItem,
  NavItemWithState,
  NavSubmenuItem,
  NavUser,
  AllRoles,
} from "./types";

/**
 * Check if a navigation item or submenu item is currently active
 */
export function isNavItemActive(href: string, currentPath: string): boolean {
  // Exact match
  if (href === currentPath) {
    return true;
  }

  // For dashboard routes, only match exact path
  if (href.endsWith("/dashboard")) {
    return href === currentPath;
  }

  // For other routes, match if current path starts with href
  // but not if it's just the root path
  if (href !== "/" && currentPath.startsWith(href)) {
    return true;
  }

  return false;
}

/**
 * Check if any submenu item is active
 */
export function hasActiveSubmenu(
  submenu: NavSubmenuItem[] | undefined,
  currentPath: string
): boolean {
  if (!submenu || submenu.length === 0) {
    return false;
  }

  return submenu.some((item) => isNavItemActive(item.href, currentPath));
}

/**
 * Add active state to navigation items
 */
export function addActiveState(
  items: NavItem[],
  currentPath: string
): NavItemWithState[] {
  return items.map((item) => ({
    ...item,
    isActive: isNavItemActive(item.href, currentPath),
    hasActiveSubmenu: hasActiveSubmenu(item.submenu, currentPath),
  }));
}

/**
 * Filter navigation items based on user permissions
 */
export function filterNavItemsByPermission(
  items: NavItem[],
  user: NavUser | null
): NavItem[] {
  if (!user) {
    return [];
  }

  return items.filter((item) => {
    // If no permission check specified, include the item
    if (!item.permission && !item.requiredRoles) {
      return true;
    }

    // Check required roles
    if (item.requiredRoles) {
      const userRoles = [user.role, ...(user.staffRoles || [])];
      const hasRequiredRole = item.requiredRoles.some((role) =>
        userRoles.includes(role)
      );
      if (!hasRequiredRole) {
        return false;
      }
    }

    // Check custom permission function
    if (item.permission) {
      return item.permission(user);
    }

    return true;
  });
}

/**
 * Generate user initials from name or email
 */
export function generateUserInitials(
  name?: string,
  email?: string
): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  if (email) {
    return email.substring(0, 2).toUpperCase();
  }

  return "U";
}

/**
 * Get default dashboard redirect for a role
 */
export function getDefaultDashboardForRole(role: AllRoles): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "organizer":
      return "/organizer/dashboard";
    case "user":
      return "/user/dashboard";
    case "STAFF":
      return "/staff/dashboard";
    case "TEAM_MEMBERS":
      return "/team/dashboard";
    case "ASSOCIATES":
      return "/associate/dashboard";
    default:
      return "/";
  }
}

/**
 * Determine user's primary role (for default redirect after login)
 * Priority: admin > organizer > team_member > associate > staff > user
 */
export function getPrimaryRole(user: NavUser): AllRoles {
  // Check main role
  if (user.role === "admin") return "admin";
  if (user.role === "organizer") return "organizer";

  // Check staff roles
  if (user.staffRoles) {
    if (user.staffRoles.includes("TEAM_MEMBERS")) return "TEAM_MEMBERS";
    if (user.staffRoles.includes("ASSOCIATES")) return "ASSOCIATES";
    if (user.staffRoles.includes("STAFF")) return "STAFF";
  }

  // Default to user role
  return user.role;
}

/**
 * Get all available roles for a user
 */
export function getAvailableRoles(user: NavUser): AllRoles[] {
  const roles: AllRoles[] = [user.role];

  if (user.staffRoles) {
    roles.push(...user.staffRoles);
  }

  return roles;
}

/**
 * Format role name for display
 */
export function formatRoleName(role: AllRoles): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "organizer":
      return "Event Organizer";
    case "user":
      return "Customer";
    case "STAFF":
      return "Event Staff";
    case "TEAM_MEMBERS":
      return "Team Member";
    case "ASSOCIATES":
      return "Sales Associate";
    default:
      return role;
  }
}

/**
 * Get role-specific styling/color
 */
export function getRoleColor(role: AllRoles): string {
  switch (role) {
    case "admin":
      return "bg-destructive/100 text-white";
    case "organizer":
      return "bg-primary text-white";
    case "user":
      return "bg-info/100 text-white";
    case "STAFF":
      return "bg-sky-500 text-white";
    case "TEAM_MEMBERS":
      return "bg-success text-white";
    case "ASSOCIATES":
      return "bg-primary/50 text-white";
    default:
      return "bg-card0 text-white";
  }
}

/**
 * Check if user has specific role
 */
export function userHasRole(user: NavUser | null, role: AllRoles): boolean {
  if (!user) return false;

  if (user.role === role) return true;

  if (user.staffRoles && user.staffRoles.includes(role as any)) {
    return true;
  }

  return false;
}

/**
 * Check if user is multi-role (has more than one role)
 */
export function isMultiRoleUser(user: NavUser | null): boolean {
  if (!user) return false;

  const totalRoles = 1 + (user.staffRoles?.length || 0);
  return totalRoles > 1;
}

/**
 * Parse query parameters from href
 */
export function getQueryParams(href: string): Record<string, string> {
  const url = new URL(href, "http://dummy.com");
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Build href with query parameters
 */
export function buildHrefWithParams(
  basePath: string,
  params: Record<string, string>
): string {
  const url = new URL(basePath, "http://dummy.com");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.pathname + url.search;
}

/**
 * Custom hook to get current navigation path
 */
export function useCurrentPath(): string {
  const pathname = usePathname();
  return pathname || "/";
}

/**
 * Check if path matches a pattern (supports wildcards)
 */
export function matchesPattern(path: string, pattern: string): boolean {
  // Convert pattern to regex
  // /admin/* matches /admin/anything
  const regexPattern = pattern
    .replace(/\*/g, ".*")
    .replace(/\//g, "\\/");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Get breadcrumb trail from current path
 */
export function generateBreadcrumbs(
  path: string,
  navItems: NavItem[]
): Array<{ label: string; href: string }> {
  const breadcrumbs: Array<{ label: string; href: string }> = [];
  const segments = path.split("/").filter(Boolean);

  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Find matching nav item
    const matchingItem = findNavItemByHref(navItems, currentPath);

    if (matchingItem) {
      breadcrumbs.push({
        label: matchingItem.label,
        href: matchingItem.href,
      });
    } else {
      // Fallback to formatted segment name
      breadcrumbs.push({
        label: segment
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        href: currentPath,
      });
    }
  }

  return breadcrumbs;
}

/**
 * Find a navigation item by href
 */
export function findNavItemByHref(
  items: NavItem[],
  href: string
): NavItem | null {
  for (const item of items) {
    if (item.href === href) {
      return item;
    }

    // Check submenu
    if (item.submenu) {
      for (const subItem of item.submenu) {
        if (subItem.href === href) {
          return item; // Return parent item
        }
      }
    }
  }

  return null;
}

/**
 * Count total notification badges in navigation
 */
export function getTotalNotifications(items: NavItem[]): number {
  return items.reduce((total, item) => {
    const itemBadge =
      typeof item.badge === "number" ? item.badge : item.badge ? 1 : 0;

    const subBadges =
      item.submenu?.reduce((subTotal, subItem) => {
        return (
          subTotal +
          (typeof subItem.badge === "number"
            ? subItem.badge
            : subItem.badge
              ? 1
              : 0)
        );
      }, 0) || 0;

    return total + itemBadge + subBadges;
  }, 0);
}
