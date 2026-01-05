import { v } from "convex/values";
import { mutation, MutationCtx } from "../_generated/server";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Generate a unique ticket number in format TKT-YYYY-NNNN
 */
async function generateTicketNumber(ctx: MutationCtx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;

  // Find the last ticket of this year to determine the next number
  const lastTicket = await ctx.db
    .query("supportTickets")
    .order("desc")
    .first();

  let nextNumber = 1;
  if (lastTicket && lastTicket.ticketNumber.startsWith(prefix)) {
    const lastNumber = parseInt(lastTicket.ticketNumber.slice(-4), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Format as 4-digit number with leading zeros
  const formattedNumber = nextNumber.toString().padStart(4, "0");
  return `${prefix}${formattedNumber}`;
}

/**
 * Create a new support ticket
 */
export const createTicket = mutation({
  args: {
    subject: v.string(),
    message: v.string(),
    category: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to create a support ticket.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found. Please sign up first.");
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber(ctx);
    const now = Date.now();

    const ticketId = await ctx.db.insert("supportTickets", {
      userId: user._id,
      ticketNumber,
      subject: args.subject,
      message: args.message,
      category: args.category,
      priority: args.priority || "medium",
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    return {
      ticketId,
      ticketNumber,
    };
  },
});

/**
 * Add a reply to a ticket
 */
export const addReply = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    message: v.string(),
    isInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let user;
    if (!identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", PRIMARY_ADMIN_EMAIL))
        .first();
    } else {
      let userInfo;
      try {
        userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
      } catch {
        userInfo = identity;
      }

      const email = userInfo.email || identity.email;
      if (!email) {
        throw new Error("User not authenticated");
      }

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Get the ticket
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Check authorization - only ticket owner or admin can reply
    const isAdmin = user.role === "admin";
    if (ticket.userId !== user._id && !isAdmin) {
      throw new Error("Not authorized to reply to this ticket");
    }

    // Only admins can create internal notes
    const isInternal = isAdmin && (args.isInternal ?? false);

    const now = Date.now();

    // Create the reply
    const replyId = await ctx.db.insert("supportTicketReplies", {
      ticketId: args.ticketId,
      authorId: user._id,
      message: args.message,
      isInternal,
      createdAt: now,
    });

    // Update the ticket's updatedAt timestamp
    // If admin is replying and ticket is "open", change to "in_progress"
    const updates: { updatedAt: number; status?: "open" | "in_progress" | "resolved" | "closed" } = {
      updatedAt: now,
    };

    if (isAdmin && ticket.status === "open") {
      updates.status = "in_progress";
    }

    await ctx.db.patch(args.ticketId, updates);

    return {
      replyId,
      isInternal,
    };
  },
});

/**
 * Update ticket status (admin only)
 */
export const updateStatus = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let user;
    if (!identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", PRIMARY_ADMIN_EMAIL))
        .first();
    } else {
      let userInfo;
      try {
        userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
      } catch {
        userInfo = identity;
      }

      const email = userInfo.email || identity.email;
      if (!email) {
        throw new Error("User not authenticated");
      }

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized - admin only");
    }

    // Get the ticket
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const now = Date.now();
    const updates: {
      status: "open" | "in_progress" | "resolved" | "closed";
      updatedAt: number;
      resolvedAt?: number;
    } = {
      status: args.status,
      updatedAt: now,
    };

    // Set resolvedAt if changing to resolved or closed
    if ((args.status === "resolved" || args.status === "closed") && !ticket.resolvedAt) {
      updates.resolvedAt = now;
    }

    await ctx.db.patch(args.ticketId, updates);

    return { success: true };
  },
});

/**
 * Assign ticket to an admin (admin only)
 */
export const assignTicket = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let user;
    if (!identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", PRIMARY_ADMIN_EMAIL))
        .first();
    } else {
      let userInfo;
      try {
        userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
      } catch {
        userInfo = identity;
      }

      const email = userInfo.email || identity.email;
      if (!email) {
        throw new Error("User not authenticated");
      }

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized - admin only");
    }

    // Get the ticket
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // If assigning to someone, verify they are an admin
    if (args.assignedTo) {
      const assignee = await ctx.db.get(args.assignedTo);
      if (!assignee || assignee.role !== "admin") {
        throw new Error("Can only assign to admin users");
      }
    }

    await ctx.db.patch(args.ticketId, {
      assignedTo: args.assignedTo,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Close ticket (can be done by ticket owner or admin)
 */
export const closeTicket = mutation({
  args: {
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let user;
    if (!identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", PRIMARY_ADMIN_EMAIL))
        .first();
    } else {
      let userInfo;
      try {
        userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
      } catch {
        userInfo = identity;
      }

      const email = userInfo.email || identity.email;
      if (!email) {
        throw new Error("User not authenticated");
      }

      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Get the ticket
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Check authorization - only ticket owner or admin can close
    const isAdmin = user.role === "admin";
    if (ticket.userId !== user._id && !isAdmin) {
      throw new Error("Not authorized to close this ticket");
    }

    const now = Date.now();

    await ctx.db.patch(args.ticketId, {
      status: "closed",
      updatedAt: now,
      resolvedAt: ticket.resolvedAt || now,
    });

    return { success: true };
  },
});
