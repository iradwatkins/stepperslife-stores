/**
 * Navigation System - Barrel Export
 *
 * Complete role-based navigation system for SteppersLife Events Platform
 * Supports 6 user roles with comprehensive permission checking
 */

// Type Definitions
export type {
  UserRole,
  StaffRole,
  AllRoles,
  NavItem,
  NavSubmenuItem,
  NavSection,
  RoleNavigation,
  NavUser,
  NavigationContextState,
  NavItemWithState,
} from "./types";

// Navigation Configuration
export {
  adminNavigation,
  organizerNavigation,
  userNavigation,
  staffNavigation,
  teamMemberNavigation,
  associateNavigation,
  getNavigationForRole,
  allNavigationConfigs,
} from "./config";

// Utility Functions
export {
  isNavItemActive,
  hasActiveSubmenu,
  addActiveState,
  filterNavItemsByPermission,
  generateUserInitials,
  getDefaultDashboardForRole,
  getPrimaryRole,
  getAvailableRoles,
  formatRoleName,
  getRoleColor,
  userHasRole,
  isMultiRoleUser,
  getQueryParams,
  buildHrefWithParams,
  useCurrentPath,
  matchesPattern,
  generateBreadcrumbs,
  findNavItemByHref,
  getTotalNotifications,
} from "./utils";

// Permission Functions
export {
  canAccessAdmin,
  canAccessOrganizer,
  canAccessStaff,
  canAccessTeamMember,
  canAccessAssociate,
  canAccessUserDashboard,
  canCreateEvents,
  canManageTeamMembers,
  canManageAssociates,
  canScanTickets,
  canViewFinancials,
  canViewAnalytics,
  canManageAllUsers,
  canAccessPlatformSettings,
  canManagePaymentMethods,
  canPurchaseTicketsForResale,
  canViewOwnTickets,
  canAccessRoleDashboard,
  getAccessibleRoles,
  isProtectedRoute,
  getRequiredRoleForRoute,
  canAccessRoute,
  getUnauthorizedRedirect,
  generatePermissionContext,
  type PermissionContext,
} from "./permissions";
