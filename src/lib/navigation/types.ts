import { LucideIcon } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

/**
 * User role types matching the database schema and staff roles
 */
export type UserRole = "admin" | "organizer" | "instructor" | "restaurateur" | "vendor" | "user";
export type StaffRole = "STAFF" | "TEAM_MEMBERS" | "ASSOCIATES";
export type RestaurantStaffRole = "RESTAURANT_MANAGER" | "RESTAURANT_STAFF";
export type AllRoles = UserRole | StaffRole;

/**
 * Navigation item configuration
 */
export interface NavItem {
  /** Display label for the navigation item */
  label: string;

  /** URL path for the navigation item */
  href: string;

  /** Lucide React icon component */
  icon: LucideIcon;

  /** Optional submenu items */
  submenu?: NavSubmenuItem[];

  /** Badge text (for notifications, counts, etc.) */
  badge?: string | number;

  /** Optional description for tooltip */
  description?: string;

  /** Whether item should be highlighted */
  highlight?: boolean;

  /** Roles that can access this item (if not specified, all with parent role access) */
  requiredRoles?: AllRoles[];

  /** Optional permission check function */
  permission?: (user: any) => boolean;

  /** Whether to open in new tab */
  external?: boolean;

  /** Whether this is a primary action (big prominent button) */
  isPrimary?: boolean;

  /** Subtitle for primary actions */
  subtitle?: string;
}

/**
 * Submenu item configuration
 */
export interface NavSubmenuItem {
  /** Display label for the submenu item */
  label: string;

  /** URL path for the submenu item */
  href: string;

  /** Optional icon for submenu item */
  icon?: LucideIcon;

  /** Badge text */
  badge?: string | number;

  /** Description for tooltip */
  description?: string;

  /** Permission check */
  permission?: (user: any) => boolean;
}

/**
 * Navigation section/group configuration
 */
export interface NavSection {
  /** Section title (optional, if you want labeled sections) */
  title?: string;

  /** Section icon */
  icon?: LucideIcon;

  /** Navigation items in this section */
  items: NavItem[];

  /** Whether this section can be collapsed */
  collapsible?: boolean;

  /** Whether collapsed by default (requires collapsible: true) */
  defaultCollapsed?: boolean;

  /** Whether to show a divider before this section */
  showDivider?: boolean;
}

/**
 * Complete navigation configuration for a role
 */
export interface RoleNavigation {
  /** The role this navigation is for */
  role: AllRoles;

  /** Display title for this role's dashboard */
  dashboardTitle: string;

  /** Subtitle/role description */
  roleDescription: string;

  /** Navigation sections */
  sections: NavSection[];

  /** Footer items (like Logout, Support) */
  footerItems?: NavItem[];
}

/**
 * User with role information for navigation
 */
export interface NavUser {
  id: Id<"users">;
  email: string;
  name?: string;
  role: UserRole;
  avatar?: string;
  initials?: string;

  /** Staff roles for events (if applicable) */
  staffRoles?: StaffRole[];

  /** Current active role (for multi-role users) */
  activeRole?: AllRoles;

  /** Workspaces disabled by user (hidden from navigation) */
  disabledWorkspaces?: string[];
}

/**
 * Navigation context state
 */
export interface NavigationContextState {
  /** Current user with role info */
  user: NavUser | null;

  /** Currently active role (for multi-role users) */
  activeRole: AllRoles | null;

  /** Available roles for this user */
  availableRoles: AllRoles[];

  /** Switch to a different role */
  switchRole: (role: AllRoles) => void;

  /** Whether sidebar is collapsed */
  isCollapsed: boolean;

  /** Toggle sidebar collapse */
  toggleCollapse: () => void;

  /** Unread notification counts by section */
  notificationCounts: Record<string, number>;
}

/**
 * Navigation item with computed active state
 */
export interface NavItemWithState extends NavItem {
  isActive: boolean;
  hasActiveSubmenu: boolean;
}
