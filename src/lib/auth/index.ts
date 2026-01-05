/**
 * Authentication Utilities - Barrel Export
 *
 * Centralized export for authentication-related utilities
 */

export {
  getDefaultDashboardPath,
  getPostLoginRedirect,
  isValidRedirectPath,
  getRedirectFromQuery,
  buildLoginUrl,
  getAccessibleDashboards,
  shouldRedirectFromPage,
  type UserRoleInfo,
} from "./redirects";
