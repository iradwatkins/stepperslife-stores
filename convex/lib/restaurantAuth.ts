/**
 * Restaurant-specific authentication and authorization helpers
 *
 * This module provides role-based access control for restaurant operations,
 * following the same patterns as the event system in auth.ts.
 *
 * @module restaurantAuth
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { getCurrentUser } from "./auth";
import { RESTAURANT_STAFF_ROLES, RestaurantStaffRole } from "./roles";

/**
 * Restaurant role types (includes owner which is not a staff role)
 */
export type RestaurantRole = "OWNER" | RestaurantStaffRole;

/**
 * Role hierarchy levels for permission checking
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<RestaurantRole, number> = {
  OWNER: 3,
  RESTAURANT_MANAGER: 2,
  RESTAURANT_STAFF: 1,
};

/**
 * Order status transition permissions by role
 */
export const ORDER_STATUS_TRANSITIONS: Record<RestaurantRole, Record<string, string[]>> = {
  // STAFF can do basic workflow transitions
  RESTAURANT_STAFF: {
    PENDING: ["CONFIRMED"],
    CONFIRMED: ["PREPARING"],
    PREPARING: ["READY_FOR_PICKUP"],
    READY_FOR_PICKUP: ["COMPLETED"],
  },
  // MANAGER can do all above plus cancellation
  RESTAURANT_MANAGER: {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
    READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
    CANCELLED: [],
    COMPLETED: [],
  },
  // OWNER has full control including refunds
  OWNER: {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
    READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
    CANCELLED: ["REFUNDED"],
    COMPLETED: ["REFUNDED"],
    REFUNDED: [],
  },
};

/**
 * Result of checking restaurant access
 */
export interface RestaurantAccessResult {
  user: Doc<"users">;
  role: RestaurantRole;
  isAdmin: boolean;
  restaurant: Doc<"restaurants">;
}

/**
 * Get user's relationship and role for a specific restaurant.
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check access for
 * @returns Access result with user, role, and restaurant, or null if no access
 */
export async function getRestaurantAccess(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">
): Promise<RestaurantAccessResult | null> {
  const user = await getCurrentUser(ctx);

  const restaurant = await ctx.db.get(restaurantId);
  if (!restaurant) {
    return null;
  }

  // Admin has full access to all restaurants
  if (user.role === "admin") {
    return {
      user,
      role: "OWNER", // Treat admin as owner for permission purposes
      isAdmin: true,
      restaurant,
    };
  }

  // Check if user is the restaurant owner
  if (restaurant.ownerId === user._id) {
    return {
      user,
      role: "OWNER",
      isAdmin: false,
      restaurant,
    };
  }

  // Check if user is a staff member
  const staffRecord = await ctx.db
    .query("restaurantStaff")
    .withIndex("by_restaurant_user", (q) =>
      q.eq("restaurantId", restaurantId).eq("userId", user._id)
    )
    .first();

  if (staffRecord && staffRecord.status === "ACTIVE") {
    return {
      user,
      role: staffRecord.role as RestaurantRole,
      isAdmin: false,
      restaurant,
    };
  }

  // No access
  return null;
}

/**
 * Require that the current user has at least the specified role for a restaurant.
 * Throws an error if the user doesn't have sufficient permissions.
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check access for
 * @param minimumRole - The minimum role required
 * @returns Access result with user, role, and restaurant
 * @throws Error if user doesn't have access or insufficient role
 */
export async function requireRestaurantRole(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">,
  minimumRole: RestaurantRole
): Promise<RestaurantAccessResult> {
  const access = await getRestaurantAccess(ctx, restaurantId);

  if (!access) {
    throw new Error("Not authorized: No access to this restaurant");
  }

  // Admin always has access (treated as OWNER)
  if (access.isAdmin) {
    return access;
  }

  // Check role hierarchy
  const userRoleLevel = ROLE_HIERARCHY[access.role];
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userRoleLevel < requiredLevel) {
    throw new Error(
      `Not authorized: Requires ${minimumRole} role or higher (you have ${access.role})`
    );
  }

  return access;
}

/**
 * Require that the current user is the restaurant owner.
 * Throws an error if not the owner (admin is treated as owner).
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check ownership for
 * @returns Access result
 */
export async function requireRestaurantOwner(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">
): Promise<RestaurantAccessResult> {
  return requireRestaurantRole(ctx, restaurantId, "OWNER");
}

/**
 * Check if a role can transition an order from one status to another.
 *
 * @param role - The user's role (or "ADMIN" for platform admin)
 * @param currentStatus - The current order status
 * @param newStatus - The target order status
 * @returns true if the transition is allowed
 */
export function canTransitionOrderStatus(
  role: RestaurantRole | "ADMIN",
  currentStatus: string,
  newStatus: string
): boolean {
  // Admin can do anything
  if (role === "ADMIN") {
    return true;
  }

  const transitions = ORDER_STATUS_TRANSITIONS[role];
  if (!transitions) {
    return false;
  }

  const allowed = transitions[currentStatus];
  return allowed?.includes(newStatus) ?? false;
}

/**
 * Check if a user has any access to a restaurant.
 * Returns true if user is owner, staff member, or admin.
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check
 * @returns true if user has any access
 */
export async function hasRestaurantAccess(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">
): Promise<boolean> {
  try {
    const access = await getRestaurantAccess(ctx, restaurantId);
    return access !== null;
  } catch {
    return false;
  }
}

/**
 * Check if user can manage the restaurant's menu.
 * Requires RESTAURANT_MANAGER or higher, or custom permission.
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check
 * @returns true if user can manage menu
 */
export async function canManageMenu(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">
): Promise<boolean> {
  const access = await getRestaurantAccess(ctx, restaurantId);
  if (!access) return false;

  // Owner and Manager can manage menu by default
  if (access.role === "OWNER" || access.role === "RESTAURANT_MANAGER") {
    return true;
  }

  // Check for custom permission override for STAFF
  if (access.role === "RESTAURANT_STAFF") {
    const staffRecord = await ctx.db
      .query("restaurantStaff")
      .withIndex("by_restaurant_user", (q) =>
        q.eq("restaurantId", restaurantId).eq("userId", access.user._id)
      )
      .first();

    return staffRecord?.permissions?.canManageMenu === true;
  }

  return false;
}

/**
 * Check if user can view restaurant analytics.
 * Requires RESTAURANT_MANAGER or higher, or custom permission.
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check
 * @returns true if user can view analytics
 */
export async function canViewAnalytics(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">
): Promise<boolean> {
  const access = await getRestaurantAccess(ctx, restaurantId);
  if (!access) return false;

  // Owner and Manager can view analytics by default
  if (access.role === "OWNER" || access.role === "RESTAURANT_MANAGER") {
    return true;
  }

  // Check for custom permission override for STAFF
  if (access.role === "RESTAURANT_STAFF") {
    const staffRecord = await ctx.db
      .query("restaurantStaff")
      .withIndex("by_restaurant_user", (q) =>
        q.eq("restaurantId", restaurantId).eq("userId", access.user._id)
      )
      .first();

    return staffRecord?.permissions?.canViewAnalytics === true;
  }

  return false;
}

/**
 * Check if user can manage restaurant settings.
 * Only OWNER can manage settings (billing, hours, etc.).
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check
 * @returns true if user can manage settings
 */
export async function canManageSettings(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">
): Promise<boolean> {
  const access = await getRestaurantAccess(ctx, restaurantId);
  if (!access) return false;

  return access.role === "OWNER";
}

/**
 * Check if user can manage restaurant staff.
 * Requires RESTAURANT_MANAGER or higher.
 *
 * @param ctx - Query or mutation context
 * @param restaurantId - The restaurant to check
 * @returns true if user can manage staff
 */
export async function canManageStaff(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">
): Promise<boolean> {
  const access = await getRestaurantAccess(ctx, restaurantId);
  if (!access) return false;

  return access.role === "OWNER" || access.role === "RESTAURANT_MANAGER";
}

/**
 * Get all restaurants that a user has access to.
 * Includes owned restaurants and staff assignments.
 *
 * @param ctx - Query or mutation context
 * @returns Array of restaurants with user's role for each
 */
export async function getMyRestaurants(
  ctx: QueryCtx | MutationCtx
): Promise<Array<{ restaurant: Doc<"restaurants">; role: RestaurantRole }>> {
  const user = await getCurrentUser(ctx);
  const results: Array<{ restaurant: Doc<"restaurants">; role: RestaurantRole }> = [];

  // Admin sees all active restaurants
  if (user.role === "admin") {
    const allRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return allRestaurants.map((restaurant) => ({
      restaurant,
      role: "OWNER" as RestaurantRole,
    }));
  }

  // Get owned restaurants
  const ownedRestaurants = await ctx.db
    .query("restaurants")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .collect();

  for (const restaurant of ownedRestaurants) {
    results.push({ restaurant, role: "OWNER" });
  }

  // Get staff assignments
  const staffRecords = await ctx.db
    .query("restaurantStaff")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .filter((q) => q.eq(q.field("status"), "ACTIVE"))
    .collect();

  for (const staff of staffRecords) {
    const restaurant = await ctx.db.get(staff.restaurantId);
    if (restaurant && !results.some((r) => r.restaurant._id === restaurant._id)) {
      results.push({ restaurant, role: staff.role as RestaurantRole });
    }
  }

  return results;
}
