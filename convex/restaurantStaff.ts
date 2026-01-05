import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { requireRestaurantRole, requireRestaurantOwner, getMyRestaurants } from "./lib/restaurantAuth";
import { validateEmail, validateRequiredString, validatePhoneNumber } from "./lib/validation";

// Get staff for a restaurant (requires MANAGER role or higher)
export const getByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, args.restaurantId, "RESTAURANT_MANAGER");

    const staff = await ctx.db
      .query("restaurantStaff")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    // Get user details for each staff member
    const staffWithUsers = await Promise.all(
      staff.map(async (member) => {
        // userId may be undefined for pending invitations
        const user = member.userId ? await ctx.db.get(member.userId) : null;
        return {
          ...member,
          userEmail: user?.email || member.email,
          userName: user?.name || member.name,
          userImage: user?.image,
        };
      })
    );

    return staffWithUsers;
  },
});

// Get active staff for a restaurant (requires MANAGER role or higher)
export const getActiveByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, args.restaurantId, "RESTAURANT_MANAGER");

    return await ctx.db
      .query("restaurantStaff")
      .withIndex("by_restaurant_status", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("status", "ACTIVE")
      )
      .collect();
  },
});

// Get restaurants where current user is staff
export const getMyRestaurantStaffAssignments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const staffAssignments = await ctx.db
      .query("restaurantStaff")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();

    // Get restaurant details for each assignment
    const assignmentsWithRestaurants = await Promise.all(
      staffAssignments.map(async (assignment) => {
        const restaurant = await ctx.db.get(assignment.restaurantId);
        return {
          ...assignment,
          restaurant,
        };
      })
    );

    return assignmentsWithRestaurants;
  },
});

// Get all restaurants the current user has access to (owned or staff)
export const getMyAccessibleRestaurants = query({
  args: {},
  handler: async (ctx) => {
    // Return empty array if not authenticated - allows UI to handle gracefully
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return [];
    }
    return await getMyRestaurants(ctx);
  },
});

// Invite staff to a restaurant (requires MANAGER role or owner)
export const inviteStaff = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("RESTAURANT_MANAGER"), v.literal("RESTAURANT_STAFF")),
    permissions: v.optional(v.object({
      canManageMenu: v.optional(v.boolean()),
      canManageHours: v.optional(v.boolean()),
      canManageOrders: v.optional(v.boolean()),
      canViewAnalytics: v.optional(v.boolean()),
      canManageSettings: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    validateEmail(args.email, "Staff email");
    validateRequiredString(args.name, "Staff name", { maxLength: 100 });

    if (args.phone) {
      validatePhoneNumber(args.phone, "Phone number");
    }

    // Get current user
    const user = await getCurrentUser(ctx);

    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, args.restaurantId, "RESTAURANT_MANAGER");

    // Only owner can invite MANAGERS
    if (args.role === "RESTAURANT_MANAGER") {
      await requireRestaurantOwner(ctx, args.restaurantId);
    }

    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if email is already invited to this restaurant
    const existingInvite = await ctx.db
      .query("restaurantStaff")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
      .first();

    if (existingInvite) {
      throw new Error("This email has already been invited to this restaurant");
    }

    // Check if user exists with this email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    const now = Date.now();

    // Get restaurant details for email
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Create staff invitation
    // userId is optional when status is PENDING (invitation not yet accepted)
    const staffId = await ctx.db.insert("restaurantStaff", {
      restaurantId: args.restaurantId,
      userId: existingUser?._id,
      email: normalizedEmail,
      name: args.name.trim(),
      phone: args.phone,
      role: args.role,
      permissions: args.permissions,
      status: "PENDING" as const,
      invitedAt: now,
      invitedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Return info needed for email action (called separately)
    return {
      staffId,
      status: "invited",
      emailInfo: {
        email: normalizedEmail,
        name: args.name.trim(),
        restaurantName: restaurant.name,
        role: args.role,
        invitedByName: user.name || "A team member",
      },
    };
  },
});

// Accept staff invitation (for current user)
export const acceptInvitation = mutation({
  args: {
    staffId: v.id("restaurantStaff"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUser(ctx);

    // Get the invitation
    const invitation = await ctx.db.get(args.staffId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify the invitation is for this user's email
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error("This invitation is not for you");
    }

    // Verify it's still pending
    if (invitation.status !== "PENDING") {
      throw new Error("This invitation is no longer pending");
    }

    const now = Date.now();

    // Update the invitation
    await ctx.db.patch(args.staffId, {
      userId: user._id,
      status: "ACTIVE",
      acceptedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Decline staff invitation (for current user)
export const declineInvitation = mutation({
  args: {
    staffId: v.id("restaurantStaff"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUser(ctx);

    // Get the invitation
    const invitation = await ctx.db.get(args.staffId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify the invitation is for this user's email
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error("This invitation is not for you");
    }

    // Verify it's still pending
    if (invitation.status !== "PENDING") {
      throw new Error("This invitation is no longer pending");
    }

    // Delete the invitation
    await ctx.db.delete(args.staffId);

    return { success: true };
  },
});

// Update staff member (requires MANAGER role or owner)
export const updateStaff = mutation({
  args: {
    staffId: v.id("restaurantStaff"),
    role: v.optional(v.union(v.literal("RESTAURANT_MANAGER"), v.literal("RESTAURANT_STAFF"))),
    permissions: v.optional(v.object({
      canManageMenu: v.optional(v.boolean()),
      canManageHours: v.optional(v.boolean()),
      canManageOrders: v.optional(v.boolean()),
      canViewAnalytics: v.optional(v.boolean()),
      canManageSettings: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    // Get the staff record
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, staff.restaurantId, "RESTAURANT_MANAGER");

    // Only owner can change to/from MANAGER role
    if (args.role && args.role !== staff.role) {
      await requireRestaurantOwner(ctx, staff.restaurantId);
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.role !== undefined) {
      updates.role = args.role;
    }
    if (args.permissions !== undefined) {
      updates.permissions = args.permissions;
    }

    await ctx.db.patch(args.staffId, updates);

    return { success: true };
  },
});

// Deactivate staff member (requires MANAGER role or owner)
export const deactivateStaff = mutation({
  args: {
    staffId: v.id("restaurantStaff"),
  },
  handler: async (ctx, args) => {
    // Get the staff record
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify user has at least MANAGER role for this restaurant
    const { user } = await requireRestaurantRole(ctx, staff.restaurantId, "RESTAURANT_MANAGER");

    // Can't deactivate yourself
    if (staff.userId === user._id) {
      throw new Error("You cannot deactivate yourself");
    }

    // Only owner can deactivate MANAGERS
    if (staff.role === "RESTAURANT_MANAGER") {
      await requireRestaurantOwner(ctx, staff.restaurantId);
    }

    await ctx.db.patch(args.staffId, {
      status: "INACTIVE",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Reactivate staff member (requires MANAGER role or owner)
export const reactivateStaff = mutation({
  args: {
    staffId: v.id("restaurantStaff"),
  },
  handler: async (ctx, args) => {
    // Get the staff record
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, staff.restaurantId, "RESTAURANT_MANAGER");

    // Only owner can reactivate MANAGERS
    if (staff.role === "RESTAURANT_MANAGER") {
      await requireRestaurantOwner(ctx, staff.restaurantId);
    }

    await ctx.db.patch(args.staffId, {
      status: "ACTIVE",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove staff member permanently (requires owner)
export const removeStaff = mutation({
  args: {
    staffId: v.id("restaurantStaff"),
  },
  handler: async (ctx, args) => {
    // Get the staff record
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Only owner can permanently remove staff
    const { user } = await requireRestaurantOwner(ctx, staff.restaurantId);

    // Can't remove yourself
    if (staff.userId === user._id) {
      throw new Error("You cannot remove yourself from the restaurant");
    }

    await ctx.db.delete(args.staffId);

    return { success: true };
  },
});

// Get pending invitations for current user
export const getMyPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user.email) {
      return [];
    }

    const invitations = await ctx.db
      .query("restaurantStaff")
      .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    // Get restaurant details for each invitation
    const invitationsWithRestaurants = await Promise.all(
      invitations.map(async (invitation) => {
        const restaurant = await ctx.db.get(invitation.restaurantId);
        const invitedBy = await ctx.db.get(invitation.invitedBy);
        return {
          ...invitation,
          restaurant,
          invitedByName: invitedBy?.name || "Unknown",
        };
      })
    );

    return invitationsWithRestaurants;
  },
});

/**
 * Action: Invite staff with email notification
 * This is the preferred way to invite staff as it handles both
 * the database insert and email notification
 */
export const inviteStaffWithEmail = action({
  args: {
    restaurantId: v.id("restaurants"),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("RESTAURANT_MANAGER"), v.literal("RESTAURANT_STAFF")),
    permissions: v.optional(v.object({
      canManageMenu: v.optional(v.boolean()),
      canManageHours: v.optional(v.boolean()),
      canManageOrders: v.optional(v.boolean()),
      canViewAnalytics: v.optional(v.boolean()),
      canManageSettings: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args): Promise<{ staffId: string; emailSent: boolean }> => {
    // Create the invitation via mutation
    const result = await ctx.runMutation(api.restaurantStaff.inviteStaff, {
      restaurantId: args.restaurantId,
      email: args.email,
      name: args.name,
      phone: args.phone,
      role: args.role,
      permissions: args.permissions,
    });

    // Send invitation email
    const emailResult = await ctx.runAction(
      api.notifications.staffNotifications.sendStaffInvitationEmail,
      {
        staffId: result.staffId,
        email: result.emailInfo.email,
        name: result.emailInfo.name,
        restaurantName: result.emailInfo.restaurantName,
        role: result.emailInfo.role,
        invitedByName: result.emailInfo.invitedByName,
      }
    );

    return {
      staffId: result.staffId,
      emailSent: emailResult.success,
    };
  },
});

/**
 * Action: Accept invitation with notification to owner
 * This handles accepting and notifying the restaurant owner
 */
export const acceptInvitationWithNotification = action({
  args: {
    staffId: v.id("restaurantStaff"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; ownerNotified: boolean }> => {
    // Accept the invitation via mutation
    await ctx.runMutation(api.restaurantStaff.acceptInvitation, {
      staffId: args.staffId,
    });

    // Get the staff record to find restaurant and owner
    const staff = await ctx.runQuery(api.restaurantStaff.getStaffById, {
      staffId: args.staffId,
    });

    if (!staff) {
      return { success: true, ownerNotified: false };
    }

    // Send notification to owner
    const emailResult = await ctx.runAction(
      api.notifications.staffNotifications.sendInvitationAcceptedEmail,
      {
        ownerEmail: staff.ownerEmail,
        ownerName: staff.ownerName,
        staffName: staff.name,
        staffRole: staff.role,
        restaurantName: staff.restaurantName,
      }
    );

    return {
      success: true,
      ownerNotified: emailResult.success,
    };
  },
});

/**
 * Helper query to get staff by ID with restaurant and owner info
 */
export const getStaffById = query({
  args: { staffId: v.id("restaurantStaff") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) return null;

    const restaurant = await ctx.db.get(staff.restaurantId);
    if (!restaurant) return null;

    const owner = await ctx.db.get(restaurant.ownerId);

    return {
      ...staff,
      restaurantName: restaurant.name,
      ownerEmail: owner?.email || "",
      ownerName: owner?.name || "Restaurant Owner",
    };
  },
});
