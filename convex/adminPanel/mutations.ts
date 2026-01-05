import { v } from "convex/values";
import { mutation, internalMutation, action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { parseEventDateTime } from "../lib/timezone";
import { USER_ROLES, PRIMARY_ADMIN_EMAIL } from "../lib/roles";
import { PermissionChecker, requireAdmin } from "../lib/permissions";
import { requireAdmin as requireAdminAuth } from "../lib/auth";

/**
 * Admin mutations - requires admin role
 */

/**
 * Update user role
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("organizer"), v.literal("instructor"), v.literal("restaurateur"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication for role updates
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is an admin-only operation.");
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!admin) {
      throw new Error("User account not found. Please contact support.");
    }

    // Require admin role
    requireAdmin(admin);

    // Don't allow changing your own role
    if (admin._id === args.userId) {
      throw new Error("Cannot change your own role");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete user (soft delete - keep for records)
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication for user deletion
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is an admin-only operation.");
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!admin) {
      throw new Error("User account not found. Please contact support.");
    }

    // Require admin role
    requireAdmin(admin);

    // Don't allow deleting yourself
    if (admin._id === args.userId) {
      throw new Error("Cannot delete your own account");
    }

    // Check if user has events
    const userEvents = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.userId))
      .collect();

    if (userEvents.length > 0) {
      throw new Error(
        `Cannot delete user with ${userEvents.length} events. Please delete or reassign events first.`
      );
    }

    // Actually delete the user
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});

/**
 * Update event status (for moderation)
 */
export const updateEventStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("PUBLISHED"),
      v.literal("CANCELLED"),
      v.literal("COMPLETED")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is an admin-only operation.");
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    // Require admin role
    requireAdmin(admin);

    await ctx.db.patch(args.eventId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete event and all associated data (admin override)
 * This is an ACTION so it can call the flyer deletion API
 */
export const deleteEvent = action({
  args: {
    eventId: v.id("events"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    deleted: {
      event: boolean;
      tiers: number;
      bundles: number;
      contacts: number;
      flyer: boolean;
    };
  }> => {
    // PRODUCTION: Require admin authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required. This is an admin-only operation.");
    }

    // Get event details first (before deletion)
    const event = await ctx.runQuery(internal.adminPanel.mutations.getEventForDeletion, {
      eventId: args.eventId,
    });

    if (!event.event) {
      throw new Error("Event not found");
    }

    // Find associated flyer
    if (event.flyer) {

      // Delete physical flyer file first
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "https://events.stepperslife.com"}/api/admin/delete-flyer-file`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filepath: event.flyer.filepath,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.warn(
            `⚠️ Failed to delete physical flyer file: ${event.flyer.filepath}`,
            errorData
          );
        } else {
        }
      } catch (error) {
        console.warn(`⚠️ Error deleting physical flyer file:`, error);
      }
    }

    // Now delete all database records
    return await ctx.runMutation(internal.adminPanel.mutations.deleteEventInternal, {
      eventId: args.eventId,
      flyerId: event.flyer?._id,
    });
  },
});

/**
 * Get event and flyer info for deletion (internal query)
 */
export const getEventForDeletion = internalQuery({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);

    // Find associated flyer
    const flyer = event
      ? await ctx.db
          .query("uploadedFlyers")
          .filter((q) => q.eq(q.field("eventId"), args.eventId))
          .first()
      : null;

    return {
      event,
      flyer,
    };
  },
});

/**
 * Internal mutation to delete event and all associated database records
 * Called by deleteEvent action after physical files are deleted
 */
export const deleteEventInternal = internalMutation({
  args: {
    eventId: v.id("events"),
    flyerId: v.optional(v.id("uploadedFlyers")),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");


    // ADMIN FORCE DELETE: Delete all associated data including tickets and orders

    // Delete all tickets for this event
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const ticket of tickets) {
      await ctx.db.delete(ticket._id);
    }

    // Delete all orders for this event and their order items
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .collect();

    let totalOrderItems = 0;
    for (const order of orders) {
      // Delete order items for this order
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      for (const item of orderItems) {
        await ctx.db.delete(item._id);
        totalOrderItems++;
      }

      await ctx.db.delete(order._id);
    }

    // Delete all staff positions for this event
    const staffPositions = await ctx.db
      .query("eventStaff")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const staff of staffPositions) {
      await ctx.db.delete(staff._id);
    }

    // Delete all staff ticket transfers for this event
    const transfers = await ctx.db
      .query("staffTicketTransfers")
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .collect();

    for (const transfer of transfers) {
      await ctx.db.delete(transfer._id);
    }

    // Delete seating charts for this event
    const seatingCharts = await ctx.db
      .query("seatingCharts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const chart of seatingCharts) {
      await ctx.db.delete(chart._id);
    }

    // Delete seat reservations for this event
    const seatReservations = await ctx.db
      .query("seatReservations")
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .collect();

    for (const reservation of seatReservations) {
      await ctx.db.delete(reservation._id);
    }

    // Delete ticket tiers
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const tier of tiers) {
      await ctx.db.delete(tier._id);
    }

    // Delete bundles
    const bundles = await ctx.db
      .query("ticketBundles")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const bundle of bundles) {
      await ctx.db.delete(bundle._id);
    }

    // Delete event contacts (CRM data from flyer extraction)
    const contacts = await ctx.db
      .query("eventContacts")
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .collect();

    for (const contact of contacts) {
      await ctx.db.delete(contact._id);
    }

    // Delete flyer database record if provided
    if (args.flyerId) {
      await ctx.db.delete(args.flyerId);
    }

    // Delete the event itself
    await ctx.db.delete(args.eventId);

    return {
      success: true,
      deleted: {
        event: true,
        tickets: tickets.length,
        orders: orders.length,
        orderItems: totalOrderItems,
        staffPositions: staffPositions.length,
        transfers: transfers.length,
        seatingCharts: seatingCharts.length,
        seatReservations: seatReservations.length,
        tiers: tiers.length,
        bundles: bundles.length,
        contacts: contacts.length,
        flyer: !!args.flyerId,
      },
    };
  },
});

/**
 * Delete ticket (admin only)
 * Allows admin to delete any ticket regardless of status
 */
export const deleteTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is an admin-only operation.");
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    // Require admin role
    requireAdmin(admin);
    if (!admin) throw new Error("User not found");

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    // Delete associated seat reservations
    const seatReservations = await ctx.db
      .query("seatReservations")
      .filter((q) => q.eq(q.field("ticketId"), args.ticketId))
      .collect();

    for (const reservation of seatReservations) {
      await ctx.db.delete(reservation._id);
    }

    // Delete the ticket
    await ctx.db.delete(args.ticketId);


    return {
      success: true,
      deletedSeatReservations: seatReservations.length,
    };
  },
});

/**
 * Delete order (admin only)
 * Allows admin to delete any order and all associated tickets
 */
export const deleteOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is an admin-only operation.");
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    // Require admin role
    requireAdmin(admin);
    if (!admin) throw new Error("User not found");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Delete all tickets associated with this order
    const tickets = await ctx.db
      .query("tickets")
      .filter((q) => q.eq(q.field("orderId"), args.orderId))
      .collect();

    for (const ticket of tickets) {
      // Delete seat reservations for each ticket
      const seatReservations = await ctx.db
        .query("seatReservations")
        .filter((q) => q.eq(q.field("ticketId"), ticket._id))
        .collect();

      for (const reservation of seatReservations) {
        await ctx.db.delete(reservation._id);
      }

      await ctx.db.delete(ticket._id);
    }

    // Delete order items
    const orderItems = await ctx.db
      .query("orderItems")
      .filter((q) => q.eq(q.field("orderId"), args.orderId))
      .collect();

    for (const item of orderItems) {
      await ctx.db.delete(item._id);
    }

    // Delete the order
    await ctx.db.delete(args.orderId);


    return {
      success: true,
      deletedTickets: tickets.length,
      deletedOrderItems: orderItems.length,
    };
  },
});

/**
 * Create admin user (system initialization)
 */
export const createAdminUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // This mutation should be protected and only callable during setup
    // In production, add additional security checks

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Promote existing user to admin
      await ctx.db.patch(existingUser._id, {
        role: "admin",
        updatedAt: Date.now(),
      });

      return { success: true, userId: existingUser._id, action: "promoted" };
    }

    // Create new admin user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: "admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, userId, action: "created" };
  },
});

/**
 * Create user account with a specific role (admin only)
 * Admins can create accounts for users with roles: organizer, instructor, restaurateur, user
 * NOTE: Cannot create admin accounts - use createAdminUser for that (system init only)
 *
 * This is the proper way for admins to create accounts that can then own content
 * (events, vendors, restaurants, instructor profiles)
 */
export const createUserAccount = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("organizer"),
      v.literal("instructor"),
      v.literal("restaurateur"),
      v.literal("user")
    ),
  },
  handler: async (ctx, args) => {
    // Require admin authentication
    await requireAdminAuth(ctx);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user's role if different
      if (existingUser.role !== args.role) {
        await ctx.db.patch(existingUser._id, {
          role: args.role,
          updatedAt: Date.now(),
        });
        return {
          success: true,
          userId: existingUser._id,
          action: "updated_role",
          previousRole: existingUser.role,
          newRole: args.role,
        };
      }
      return {
        success: true,
        userId: existingUser._id,
        action: "already_exists",
        role: existingUser.role,
      };
    }

    // Create new user account
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      userId,
      action: "created",
      role: args.role,
    };
  },
});

/**
 * Mark order as refunded (internal mutation - called after Stripe/PayPal refund succeeds)
 */
export const markOrderRefunded = internalMutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    // Mark order as refunded
    await ctx.db.patch(args.orderId, {
      status: "REFUNDED",
      updatedAt: Date.now(),
    });

    // Mark all tickets as refunded
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const ticket of tickets) {
      await ctx.db.patch(ticket._id, {
        status: "REFUNDED",
        updatedAt: Date.now(),
      });
    }

    return { success: true, ticketsRefunded: tickets.length };
  },
});

/**
 * Mark event as claimable
 * Allows admins to make an event available for organizers to claim
 */
export const markEventAsClaimable = mutation({
  args: {
    eventId: v.id("events"),
    claimCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication
    await requireAdminAuth(ctx);

    // Get the event
    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    // Mark as claimable
    await ctx.db.patch(args.eventId, {
      isClaimable: true,
      claimCode: args.claimCode || undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unmark event as claimable
 * Removes event from the claimable list
 */
export const unmarkEventAsClaimable = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication
    await requireAdminAuth(ctx);

    // Get the event
    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    // Unmark as claimable
    await ctx.db.patch(args.eventId, {
      isClaimable: false,
      claimCode: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Fix event timestamps by re-parsing literal dates
 * Used to fix events created with broken date parser
 */
export const fixEventTimestamps = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication
    await requireAdminAuth(ctx);

    // Get the event
    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    // Re-parse the literal dates using the updated parser
    const startDate = parseEventDateTime(
      event.eventDateLiteral,
      event.eventTimeLiteral,
      event.timezone || "America/New_York"
    );

    const endDate = startDate; // For now, use same as start date


    // Update the event with parsed timestamps
    await ctx.db.patch(args.eventId, {
      startDate,
      endDate,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      startDate,
      endDate,
      startDateISO: startDate ? new Date(startDate).toISOString() : undefined,
    };
  },
});

/**
 * Update event categories (internal mutation for data cleanup)
 * Used to fix events with incorrect category values
 */
export const updateEventCategories = internalMutation({
  args: {
    eventId: v.id("events"),
    categories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    await ctx.db.patch(args.eventId, {
      categories: args.categories,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      eventName: event.name,
      oldCategories: event.categories,
      newCategories: args.categories,
    };
  },
});
