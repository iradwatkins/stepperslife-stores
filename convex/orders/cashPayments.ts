/**
 * Cash Payment System for In-Person Ticket Sales
 *
 * Flow:
 * 1. Customer selects "Pay Cash In-Person" at checkout
 * 2. Order created with PENDING_PAYMENT status (paymentMethod: "CASH")
 * 3. Seller receives push notification
 * 4. Seller approves payment OR generates activation code
 * 5. Order completes
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const CASH_HOLD_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Helper: Generate 4-digit activation code
 */
function generateActivationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Helper: Generate order confirmation number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CASH-${timestamp}-${random}`;
}

/**
 * Create a cash payment order (from checkout page)
 * Customer selects "Pay Cash In-Person" option
 */
export const createCashOrder = mutation({
  args: {
    eventId: v.id("events"),
    buyerName: v.string(),
    buyerPhone: v.string(), // Phone required, email optional for cash orders
    buyerEmail: v.optional(v.string()),
    tickets: v.array(
      v.object({
        tierId: v.id("ticketTiers"),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const holdExpiresAt = now + CASH_HOLD_DURATION;


    // Get event
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Calculate totals
    let subtotalCents = 0;
    const ticketDetails = [];

    for (const ticketRequest of args.tickets) {
      const tier = await ctx.db.get(ticketRequest.tierId);
      if (!tier) {
        throw new Error(`Ticket tier ${ticketRequest.tierId} not found`);
      }

      const tierTotal = tier.price * ticketRequest.quantity;
      subtotalCents += tierTotal;

      ticketDetails.push({
        tierId: ticketRequest.tierId,
        tierName: tier.name,
        quantity: ticketRequest.quantity,
        price: tier.price,
      });
    }

    // For cash orders, no platform or processing fees
    const platformFeeCents = 0;
    const processingFeeCents = 0;
    const totalCents = subtotalCents;

    // Create temporary/anonymous user for cash orders (no email required)
    const buyerId = await ctx.db.insert("users", {
      name: args.buyerName,
      email: args.buyerEmail || `cash-${now}@temp.local`,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });

    // Create order with PENDING_PAYMENT status
    const orderNumber = generateOrderNumber();
    const orderId = await ctx.db.insert("orders", {
      eventId: args.eventId,
      buyerId,
      buyerName: args.buyerName,
      buyerEmail: args.buyerEmail || "",
      buyerPhone: args.buyerPhone,
      status: "PENDING_PAYMENT",
      subtotalCents,
      platformFeeCents,
      processingFeeCents,
      totalCents,
      paymentMethod: "CASH",
      createdAt: now,
      updatedAt: now,
    });


    // CRITICAL FIX: Reserve inventory BEFORE creating tickets
    // This prevents multiple staff from overselling the same tickets
    // Check availability and increment sold count atomically
    for (const detail of ticketDetails) {
      const tier = await ctx.db.get(detail.tierId);
      if (!tier) {
        throw new Error(`Ticket tier ${detail.tierId} not found`);
      }

      // Check if enough tickets are available
      const available = tier.quantity - tier.sold;
      if (available < detail.quantity) {
        throw new Error(
          `Not enough ${tier.name} tickets available. Only ${available} remaining.`
        );
      }

      // Reserve inventory by incrementing sold count NOW (not when approved)
      await ctx.db.patch(detail.tierId, {
        sold: tier.sold + detail.quantity,
      });
    }

    // Create ticket placeholders (not activated yet)
    const ticketIds = [];
    for (const detail of ticketDetails) {
      for (let i = 0; i < detail.quantity; i++) {
        const ticketCode =
          `CASH-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase();

        const ticketId = await ctx.db.insert("tickets", {
          eventId: args.eventId,
          orderId,
          ticketTierId: detail.tierId,
          attendeeId: buyerId,
          attendeeName: args.buyerName,
          attendeeEmail: args.buyerEmail || "",
          ticketCode,
          status: "PENDING", // Pending until cash payment approved
          price: detail.price,
          createdAt: now,
          updatedAt: now,
        });

        ticketIds.push(ticketId);
      }
    }

    // Send push notification to sellers
    await ctx.scheduler.runAfter(0, api.notifications.pushNotifications.notifyNewCashOrder, {
      orderId,
      eventId: args.eventId,
      buyerName: args.buyerName,
      totalCents,
    });

    return {
      orderId,
      orderNumber,
      totalCents,
      ticketIds,
      message: `Your tickets are on hold for 30 minutes. Pay the organizer to activate your tickets. Order #: ${orderNumber}`,
    };
  },
});

/**
 * Approve a cash payment (seller manually approves)
 * Instantly completes the order
 */
export const approveCashOrder = mutation({
  args: {
    orderId: v.id("orders"),
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();


    // Get order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order status
    if (order.status !== "PENDING_PAYMENT") {
      throw new Error(`Cannot approve order with status: ${order.status}`);
    }

    // Get staff
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify staff has cash acceptance enabled
    if (!staff.acceptCashInPerson) {
      throw new Error("Staff member is not authorized to accept cash payments");
    }

    // Update order to COMPLETED
    await ctx.db.patch(args.orderId, {
      status: "COMPLETED",
      paidAt: now,
      soldByStaffId: args.staffId, // Track who made the sale
      updatedAt: now,
    });

    // Activate all tickets
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const ticket of tickets) {
      await ctx.db.patch(ticket._id, {
        status: "VALID",
        soldByStaffId: args.staffId,
        updatedAt: now,
      });
    }

    // Update staff sales tracking
    const ticketCount = tickets.length;
    await ctx.db.patch(args.staffId, {
      ticketsSold: staff.ticketsSold + ticketCount,
      cashCollected: (staff.cashCollected || 0) + order.totalCents,
      updatedAt: now,
    });

    // Calculate commission
    let commission = 0;
    if (staff.commissionType === "PERCENTAGE" && staff.commissionValue) {
      commission = Math.round((order.subtotalCents * staff.commissionValue) / 100);
    } else if (staff.commissionType === "FIXED" && staff.commissionValue) {
      commission = staff.commissionValue * ticketCount;
    }

    // Update commission earned
    if (commission > 0) {
      await ctx.db.patch(args.staffId, {
        commissionEarned: staff.commissionEarned + commission,
      });
    }

    // Record staff sale
    await ctx.db.insert("staffSales", {
      orderId: args.orderId,
      eventId: order.eventId,
      staffId: args.staffId,
      staffUserId: staff.staffUserId,
      ticketCount,
      commissionAmount: commission,
      paymentMethod: "CASH",
      createdAt: now,
    });

    // Track platform debt for CREDIT_CARD model events
    // (For PREPAY events, the organizer already paid the platform fee upfront)
    const event = await ctx.db.get(order.eventId);
    if (event?.organizerId) {
      const paymentConfig = await ctx.db
        .query("eventPaymentConfig")
        .withIndex("by_event", (q) => q.eq("eventId", order.eventId))
        .first();

      if (paymentConfig?.paymentModel === "CREDIT_CARD") {
        // Record the platform fee owed from this cash order
        await ctx.runMutation(internal.platformDebt.mutations.addCashOrderDebt, {
          organizerId: event.organizerId,
          orderId: args.orderId,
          eventId: order.eventId,
          subtotalCents: order.subtotalCents,
        });
      }
    }

    return {
      success: true,
      orderId: args.orderId,
      ticketsActivated: ticketCount,
      commission,
    };
  },
});

/**
 * Approve a cash payment as the event organizer
 * Simpler than approveCashOrder - just requires being the event owner
 * Used from organizer dashboard to quickly approve pending cash orders
 */
export const organizerApproveCashOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order status
    if (order.status !== "PENDING_PAYMENT") {
      throw new Error(`Cannot approve order with status: ${order.status}`);
    }

    // Get event and verify ownership
    const event = await ctx.db.get(order.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get user to check if they're the organizer or admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check authorization: must be event organizer or admin
    const isOrganizer = event.organizerId === user._id;
    const isAdmin = user.role === "admin";

    if (!isOrganizer && !isAdmin) {
      throw new Error("Not authorized to approve orders for this event");
    }

    // Update order to COMPLETED
    await ctx.db.patch(args.orderId, {
      status: "COMPLETED",
      paidAt: now,
      updatedAt: now,
    });

    // Activate all tickets
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const ticket of tickets) {
      await ctx.db.patch(ticket._id, {
        status: "VALID",
        updatedAt: now,
      });
    }

    // NOTE: Inventory (ticketTiers.sold) was already incremented when cash order was created
    // No need to increment again here - that would cause double-counting

    // Send confirmation email with QR codes to customer
    // Only send if customer has a valid email address
    if (order.buyerEmail && !order.buyerEmail.includes("@temp.local")) {
      await ctx.scheduler.runAfter(
        0, // Send immediately
        api.notifications.ticketNotifications.sendCashOrderConfirmation,
        { orderId: args.orderId }
      );
    }

    // Track platform debt for CREDIT_CARD model events
    // (For PREPAY events, the organizer already paid the platform fee upfront)
    if (event.organizerId) {
      const paymentConfig = await ctx.db
        .query("eventPaymentConfig")
        .withIndex("by_event", (q) => q.eq("eventId", order.eventId))
        .first();

      if (paymentConfig?.paymentModel === "CREDIT_CARD") {
        // Record the platform fee owed from this cash order
        await ctx.runMutation(internal.platformDebt.mutations.addCashOrderDebt, {
          organizerId: event.organizerId,
          orderId: args.orderId,
          eventId: order.eventId,
          subtotalCents: order.subtotalCents,
        });
      }
    }

    return {
      success: true,
      orderId: args.orderId,
      ticketsActivated: tickets.length,
      approvedBy: user.name || user.email,
      emailSent: !!(order.buyerEmail && !order.buyerEmail.includes("@temp.local")),
    };
  },
});

/**
 * Generate activation code for cash order
 * Seller generates code, gives to customer, customer activates
 */
export const generateCashActivationCode = mutation({
  args: {
    orderId: v.id("orders"),
    staffId: v.id("eventStaff"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();


    // Get order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order status
    if (order.status !== "PENDING_PAYMENT") {
      throw new Error(`Cannot generate code for order with status: ${order.status}`);
    }

    // Get staff
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify staff has cash acceptance enabled
    if (!staff.acceptCashInPerson) {
      throw new Error("Staff member is not authorized to accept cash payments");
    }

    // Generate 4-digit activation code
    const activationCode = generateActivationCode();

    // Update all tickets with activation code and change status to PENDING_ACTIVATION
    // This allows customers to use the activateTicket mutation
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const ticket of tickets) {
      await ctx.db.patch(ticket._id, {
        activationCode,
        status: "PENDING_ACTIVATION", // Change from PENDING to PENDING_ACTIVATION
        soldByStaffId: args.staffId,
        updatedAt: now,
      });
    }

    // Mark order as having code generated
    // Keep status as PENDING_PAYMENT - will change to COMPLETED when customer activates
    await ctx.db.patch(args.orderId, {
      soldByStaffId: args.staffId,
      updatedAt: now,
    });


    return {
      success: true,
      activationCode,
      ticketCount: tickets.length,
      orderId: args.orderId,
    };
  },
});

/**
 * Get pending cash orders for a staff member or event
 */
export const getPendingCashOrders = query({
  args: {
    eventId: v.optional(v.id("events")),
    staffId: v.optional(v.id("eventStaff")),
  },
  handler: async (ctx, args) => {
    let orders;

    if (args.eventId) {
      // Get all pending cash orders for event
      orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId!))
        .filter((q) => q.eq(q.field("status"), "PENDING_PAYMENT"))
        .collect();
    } else {
      // Get all pending cash orders (admin view)
      const allOrders = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", "PENDING_PAYMENT"))
        .collect();
      orders = allOrders;
    }

    // Filter for CASH payment method only
    const cashOrders = orders.filter((order) => order.paymentMethod === "CASH");

    // Enrich with ticket details
    const enriched = await Promise.all(
      cashOrders.map(async (order) => {
        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        return {
          ...order,
          ticketCount: tickets.length,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get expired cash orders for a staff member or event
 */
export const getExpiredCashOrders = query({
  args: {
    eventId: v.id("events"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "EXPIRED"))
      .order("desc")
      .take(args.limit || 50);

    // Enrich with ticket details
    const enriched = await Promise.all(
      orders.map(async (order) => {
        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        return {
          ...order,
          ticketCount: tickets.length,
        };
      })
    );

    return enriched;
  },
});
