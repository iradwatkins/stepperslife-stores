import { v } from "convex/values";
import { query } from "../_generated/server";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Get tickets for the current user (organizer view)
 */
export const getUserTickets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view your tickets.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return [];
    }

    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return tickets;
  },
});

/**
 * Get a specific ticket by ID (with user authorization check)
 */
export const getTicketById = query({
  args: {
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view ticket details.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return null;
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      return null;
    }

    // Check if user owns the ticket or is an admin
    const isAdmin = user.role === "admin";
    if (ticket.userId !== user._id && !isAdmin) {
      return null;
    }

    // Get the ticket creator's info
    const ticketUser = await ctx.db.get(ticket.userId);

    // Get assigned admin info if assigned
    let assignedUser = null;
    if (ticket.assignedTo) {
      assignedUser = await ctx.db.get(ticket.assignedTo);
    }

    return {
      ...ticket,
      user: ticketUser ? {
        _id: ticketUser._id,
        name: ticketUser.name,
        email: ticketUser.email,
      } : null,
      assignedUser: assignedUser ? {
        _id: assignedUser._id,
        name: assignedUser.name,
        email: assignedUser.email,
      } : null,
    };
  },
});

/**
 * Get all tickets (admin view)
 */
export const getAdminTickets = query({
  args: {
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    )),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to access admin tickets.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required. You do not have permission to view admin tickets.");
    }

    // Query tickets with optional filters
    let tickets;
    if (args.status) {
      tickets = await ctx.db
        .query("supportTickets")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.priority) {
      tickets = await ctx.db
        .query("supportTickets")
        .withIndex("by_priority", (q) => q.eq("priority", args.priority!))
        .order("desc")
        .collect();
    } else {
      tickets = await ctx.db
        .query("supportTickets")
        .order("desc")
        .collect();
    }

    // Enrich tickets with user info
    const enrichedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const ticketUser = await ctx.db.get(ticket.userId);
        let assignedUser = null;
        if (ticket.assignedTo) {
          assignedUser = await ctx.db.get(ticket.assignedTo);
        }

        return {
          ...ticket,
          user: ticketUser ? {
            _id: ticketUser._id,
            name: ticketUser.name,
            email: ticketUser.email,
          } : null,
          assignedUser: assignedUser ? {
            _id: assignedUser._id,
            name: assignedUser.name,
            email: assignedUser.email,
          } : null,
        };
      })
    );

    return enrichedTickets;
  },
});

/**
 * Get replies for a ticket
 */
export const getTicketReplies = query({
  args: {
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view ticket replies.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return [];
    }

    // Get the ticket to check authorization
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      return [];
    }

    // Check if user owns the ticket or is an admin
    const isAdmin = user.role === "admin";
    if (ticket.userId !== user._id && !isAdmin) {
      return [];
    }

    // Get replies
    const replies = await ctx.db
      .query("supportTicketReplies")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .collect();

    // Filter out internal notes for non-admin users
    const filteredReplies = isAdmin
      ? replies
      : replies.filter((reply) => !reply.isInternal);

    // Enrich with author info
    const enrichedReplies = await Promise.all(
      filteredReplies.map(async (reply) => {
        const author = await ctx.db.get(reply.authorId);
        return {
          ...reply,
          author: author ? {
            _id: author._id,
            name: author.name,
            email: author.email,
            role: author.role,
          } : null,
        };
      })
    );

    return enrichedReplies;
  },
});

/**
 * Get ticket statistics for admin dashboard
 */
export const getTicketStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to view ticket statistics.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required. You do not have permission to view ticket statistics.");
    }

    // Get all tickets
    const allTickets = await ctx.db
      .query("supportTickets")
      .collect();

    // Calculate stats
    const openCount = allTickets.filter((t) => t.status === "open").length;
    const inProgressCount = allTickets.filter((t) => t.status === "in_progress").length;

    // Resolved today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const resolvedTodayCount = allTickets.filter(
      (t) =>
        (t.status === "resolved" || t.status === "closed") &&
        t.resolvedAt &&
        t.resolvedAt >= todayStart.getTime()
    ).length;

    // Calculate average response time based on first admin reply
    let totalResponseTimeMs = 0;
    let ticketsWithResponse = 0;

    // Only calculate for tickets that have replies
    for (const ticket of allTickets) {
      // Get the first non-internal reply from an admin
      const replies = await ctx.db
        .query("supportTicketReplies")
        .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
        .order("asc")
        .collect();

      // Find first reply from admin (not internal note, not from ticket creator)
      const firstAdminReply = replies.find(
        (reply) => !reply.isInternal && reply.authorId !== ticket.userId
      );

      if (firstAdminReply) {
        const responseTimeMs = firstAdminReply.createdAt - ticket.createdAt;
        totalResponseTimeMs += responseTimeMs;
        ticketsWithResponse++;
      }
    }

    // Format average response time
    let avgResponseTime = "N/A";
    if (ticketsWithResponse > 0) {
      const avgMs = totalResponseTimeMs / ticketsWithResponse;
      const avgMinutes = Math.floor(avgMs / (1000 * 60));
      const avgHours = Math.floor(avgMinutes / 60);
      const remainingMinutes = avgMinutes % 60;

      if (avgHours > 24) {
        const days = Math.floor(avgHours / 24);
        const remainingHours = avgHours % 24;
        avgResponseTime = `${days}d ${remainingHours}h`;
      } else if (avgHours > 0) {
        avgResponseTime = `${avgHours}h ${remainingMinutes}m`;
      } else {
        avgResponseTime = `${avgMinutes}m`;
      }
    }

    return {
      open: openCount,
      inProgress: inProgressCount,
      resolvedToday: resolvedTodayCount,
      avgResponseTime,
    };
  },
});
