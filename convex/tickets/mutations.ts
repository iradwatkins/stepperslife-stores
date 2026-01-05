import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import { requireEventOwnership } from "../lib/auth";

/**
 * Create a ticket tier for an event
 */
export const createTicketTier = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // in cents (per seat)
    quantity: v.number(),
    saleStart: v.optional(v.number()),
    saleEnd: v.optional(v.number()),
    // Early Bird Pricing - time-based pricing tiers
    pricingTiers: v.optional(
      v.array(
        v.object({
          name: v.string(), // "Early Bird", "Regular", "Last Chance"
          price: v.number(), // Price in cents for this tier
          availableFrom: v.number(), // Start timestamp
          availableUntil: v.optional(v.number()), // End timestamp (optional for last tier)
        })
      )
    ),
    // Simple Table Package Support
    isTablePackage: v.optional(v.boolean()),
    tableCapacity: v.optional(v.number()), // Seats per table
  },
  handler: async (ctx, args) => {
    // BYPASS ctx.auth - use same workaround as createEvent
    const identity = await ctx.auth.getUserIdentity();

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get the event organizer as the user
    if (!event.organizerId) {
      throw new Error("Event has no organizer");
    }

    const user = await ctx.db.get(event.organizerId);

    if (!user) {
      throw new Error("Event organizer not found");
    }

    // Allow the event organizer to create tickets for their event
    // (we're trusting that the event.organizerId is valid)

    // NO ALLOCATION CHECK - Organizers can create any ticket configuration up to event capacity
    // The only limit is the event's venue capacity, which is checked below

    // VALIDATE AGAINST EVENT CAPACITY
    // This ensures total ticket tiers don't exceed the event's maximum capacity
    if (event.capacity && event.capacity > 0) {
      const existingTiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      // Simple capacity calculation
      const getTierCapacity = (tier: any) => {
        const qty = tier.quantity || 0;
        if (tier.isTablePackage && tier.tableCapacity) {
          return qty * tier.tableCapacity; // Tables × seats per table
        }
        return qty; // Individual tickets
      };

      const currentAllocated = existingTiers.reduce((sum, tier) => {
        return sum + getTierCapacity(tier);
      }, 0);

      // Calculate new tier capacity (simple)
      const newSeats =
        args.isTablePackage && args.tableCapacity
          ? args.quantity * args.tableCapacity // Tables × seats per table
          : args.quantity; // Individual tickets

      const newTotal = currentAllocated + newSeats;

      if (newTotal > event.capacity) {
        throw new Error(
          `Cannot create tier: Total ticket allocation (${newTotal.toLocaleString()}) would exceed event capacity (${event.capacity.toLocaleString()}). ` +
            `Currently allocated: ${currentAllocated.toLocaleString()}. Remaining: ${(event.capacity - currentAllocated).toLocaleString()}. ` +
            `Please reduce the quantity or increase your event capacity.`
        );
      }

    }

    // Create ticket tier (simplified)
    const tierId = await ctx.db.insert("ticketTiers", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      price: args.price,
      pricingTiers: args.pricingTiers, // Early bird pricing support
      quantity: args.quantity,
      sold: 0,
      version: 0, // PRODUCTION: Initialize version for optimistic locking
      saleStart: args.saleStart,
      saleEnd: args.saleEnd,
      // Simple table package support
      isTablePackage: args.isTablePackage,
      tableCapacity: args.tableCapacity, // Seats per table
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return tierId;
  },
});

/**
 * Delete a ticket tier
 * Refunds credits for unsold ticket allocations
 */
export const deleteTicketTier = mutation({
  args: {
    tierId: v.id("ticketTiers"),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    // Verify ownership (throws if not authorized)
    const { user, event } = await requireEventOwnership(ctx, tier.eventId);

    // Check if event has started
    const now = Date.now();
    const eventHasStarted = event.startDate && now >= event.startDate;

    if (eventHasStarted) {
      throw new Error(
        "Cannot delete tickets after the event has started. " +
          "The event began and ticket configurations are now locked."
      );
    }

    // Check if any tickets have been sold
    if (tier.sold > 0) {
      throw new Error(
        `Cannot delete ticket tier with sold tickets. ${tier.sold} ticket${tier.sold === 1 ? " has" : "s have"} already been sold. ` +
          `You can reduce the quantity instead of deleting.`
      );
    }

    // NO CREDIT REFUND - Tickets are per-event and don't transfer
    // Deleting a tier simply frees up allocation for THIS event only
    // The tickets remain allocated to this event and can be used for other tiers

    await ctx.db.delete(args.tierId);

    return {
      success: true,
      ticketsFreed: tier.quantity,
    };
  },
});

/**
 * Update a ticket tier
 * SAFEGUARDS: Prevents dangerous changes after tickets have been sold
 */
export const updateTicketTier = mutation({
  args: {
    tierId: v.id("ticketTiers"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    quantity: v.optional(v.number()),
    saleStart: v.optional(v.number()),
    saleEnd: v.optional(v.number()),
    // Simple table package support
    isTablePackage: v.optional(v.boolean()),
    tableCapacity: v.optional(v.number()),
    // Early bird pricing support
    pricingTiers: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          price: v.number(),
          availableFrom: v.number(),
          availableUntil: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // BYPASS ctx.auth - use same workaround as createTicketTier
    const identity = await ctx.auth.getUserIdentity();

    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    // Get event and verify ownership
    const event = await ctx.db.get(tier.eventId);
    if (!event) throw new Error("Event not found");
    if (!event.organizerId) throw new Error("Event has no organizer");

    // Get the event organizer as the user (bypass auth check)
    const user = await ctx.db.get(event.organizerId);

    if (!user) {
      throw new Error("Event organizer not found");
    }

    // Allow the event organizer to update tickets for their event
    // (we're trusting that the event.organizerId is valid)
    const organizerId: Id<"users"> = user._id;

    // CHECK IF EVENT HAS STARTED - Can edit tickets until event begins
    const now = Date.now();
    const eventHasStarted = event.startDate && now >= event.startDate;

    if (eventHasStarted) {
      throw new Error(
        "Cannot edit tickets after the event has started. " +
          "The event began and ticket configurations are now locked. " +
          "Please contact support if you need assistance."
      );
    }

    // SAFEGUARD: Cannot reduce quantity below sold count
    if (args.quantity !== undefined && args.quantity < tier.sold) {
      throw new Error(
        `Cannot reduce quantity to ${args.quantity} because ${tier.sold} ticket${tier.sold === 1 ? " has" : "s have"} already been sold. ` +
          `Quantity must be at least ${tier.sold}.`
      );
    }

    // NO ALLOCATION CHECK - Only validate against event capacity below

    // VALIDATE AGAINST EVENT CAPACITY
    if (event.capacity && event.capacity > 0) {
      // Check if any allocation-related fields are being updated
      const hasAllocationChange =
        args.quantity !== undefined ||
        args.tableCapacity !== undefined ||
        args.isTablePackage !== undefined;

      if (hasAllocationChange) {
        const existingTiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event", (q) => q.eq("eventId", tier.eventId))
          .collect();

        // Simple capacity calculation
        const getTierCapacity = (t: any) => {
          const qty = t.quantity || 0;
          if (t.isTablePackage && t.tableCapacity) {
            return qty * t.tableCapacity; // Tables × seats per table
          }
          return qty; // Individual tickets
        };

        // Calculate new total (excluding this tier, then adding new capacity)
        const otherTiersTotal = existingTiers
          .filter((t) => t._id !== args.tierId)
          .reduce((sum, t) => sum + getTierCapacity(t), 0);

        // Calculate new tier capacity with updated values
        const updatedIsTablePackage =
          args.isTablePackage !== undefined ? args.isTablePackage : tier.isTablePackage;
        const updatedTableCap =
          args.tableCapacity !== undefined ? args.tableCapacity : tier.tableCapacity;
        const updatedQty = args.quantity !== undefined ? args.quantity : tier.quantity;

        const newSeats =
          updatedIsTablePackage && updatedTableCap
            ? updatedQty * updatedTableCap // Tables × seats per table
            : updatedQty; // Individual tickets

        const newTotal = otherTiersTotal + newSeats;

        if (newTotal > event.capacity) {
          const maxAllowedForThisTier = event.capacity - otherTiersTotal;

          throw new Error(
            `Cannot update tier: Total ticket allocation (${newTotal.toLocaleString()}) would exceed event capacity (${event.capacity.toLocaleString()}). ` +
              `Other tiers are using ${otherTiersTotal.toLocaleString()} seats. ` +
              `You can allocate at most ${maxAllowedForThisTier.toLocaleString()} seats to this tier. ` +
              `Please reduce the quantity or increase your event capacity.`
          );
        }

      }
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: now,
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.quantity !== undefined) updates.quantity = args.quantity;
    if (args.saleStart !== undefined) updates.saleStart = args.saleStart;
    if (args.saleEnd !== undefined) updates.saleEnd = args.saleEnd;
    if (args.isTablePackage !== undefined) updates.isTablePackage = args.isTablePackage;
    if (args.tableCapacity !== undefined) updates.tableCapacity = args.tableCapacity;
    if (args.pricingTiers !== undefined) updates.pricingTiers = args.pricingTiers;

    await ctx.db.patch(args.tierId, updates);

    return {
      success: true,
    };
  },
});

/**
 * Create a new order for ticket purchase
 */
export const createOrder = mutation({
  args: {
    eventId: v.id("events"),
    ticketTierId: v.id("ticketTiers"),
    quantity: v.number(),
    buyerEmail: v.string(),
    buyerName: v.string(),
    subtotalCents: v.number(),
    platformFeeCents: v.number(),
    processingFeeCents: v.number(),
    totalCents: v.number(),
    referralCode: v.optional(v.string()),
    discountCodeId: v.optional(v.id("discountCodes")),
    discountAmountCents: v.optional(v.number()),
    selectedSeats: v.optional(
      v.array(
        v.object({
          sectionId: v.string(),
          sectionName: v.string(),
          rowId: v.optional(v.string()),
          rowLabel: v.optional(v.string()),
          tableId: v.optional(v.string()),
          tableNumber: v.optional(v.union(v.string(), v.number())),
          seatId: v.string(),
          seatNumber: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for creating orders
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to create orders");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Verify ticket tier exists
    const ticketTier = await ctx.db.get(args.ticketTierId);
    if (!ticketTier) throw new Error("Ticket tier not found");

    // Validate tier sale dates
    const now = Date.now();
    if (ticketTier.saleStart && ticketTier.saleStart > now) {
      throw new Error("Ticket sales have not started yet for this tier");
    }
    if (ticketTier.saleEnd && ticketTier.saleEnd < now) {
      throw new Error("Ticket sales have ended for this tier");
    }

    // Look up staff member if referral code provided
    let staffMember = null;
    if (args.referralCode && args.referralCode.length > 0) {
      staffMember = await ctx.db
        .query("eventStaff")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode!))
        .first();

      if (staffMember && !staffMember.isActive) {
        staffMember = null; // Don't count inactive staff
      }
    }

    // Verify and increment discount code usage if provided
    if (args.discountCodeId && args.discountAmountCents) {
      const discountCode = await ctx.db.get(args.discountCodeId);
      if (!discountCode) {
        throw new Error("Discount code not found");
      }

      if (!discountCode.isActive) {
        throw new Error("This discount code is no longer active");
      }

      // Check if discount code has expired
      const now = Date.now();
      if (discountCode.validUntil && discountCode.validUntil < now) {
        throw new Error("This discount code has expired");
      }

      // Check if discount code has reached max uses
      if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
        throw new Error("This discount code has reached its usage limit");
      }

      // Increment usage count
      await ctx.db.patch(args.discountCodeId, {
        usedCount: discountCode.usedCount + 1,
        updatedAt: now,
      });
    }

    // Validate seat selection if seating chart exists
    if (args.selectedSeats && args.selectedSeats.length > 0) {
      // Verify seats match quantity
      if (args.selectedSeats.length !== args.quantity) {
        throw new Error("Number of selected seats must match ticket quantity");
      }

      // Check if event has a seating chart
      const seatingChart = await ctx.db
        .query("seatingCharts")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .first();

      if (!seatingChart) {
        throw new Error("Seating chart not found for this event");
      }

      // Verify all seats are available (check for existing reservations)
      for (const seat of args.selectedSeats) {
        let existingReservation;

        if (seat.rowId) {
          // Row-based seat
          existingReservation = await ctx.db
            .query("seatReservations")
            .withIndex("by_seat", (q) =>
              q
                .eq("seatingChartId", seatingChart._id)
                .eq("sectionId", seat.sectionId)
                .eq("seatId", seat.seatId)
            )
            .filter((q) =>
              q.and(q.eq(q.field("status"), "RESERVED"), q.eq(q.field("rowId"), seat.rowId))
            )
            .first();
        } else if (seat.tableId) {
          // Table-based seat
          existingReservation = await ctx.db
            .query("seatReservations")
            .withIndex("by_table", (q) =>
              q
                .eq("seatingChartId", seatingChart._id)
                .eq("sectionId", seat.sectionId)
                .eq("tableId", seat.tableId)
            )
            .filter((q) =>
              q.and(q.eq(q.field("status"), "RESERVED"), q.eq(q.field("seatId"), seat.seatId))
            )
            .first();
        }

        if (existingReservation) {
          const location = seat.rowId ? `Row ${seat.rowLabel}` : `Table ${seat.tableNumber}`;
          throw new Error(
            `Seat ${seat.seatNumber} at ${location} in ${seat.sectionName} is already reserved`
          );
        }
      }
    }

    // Create order
    const orderId = await ctx.db.insert("orders", {
      eventId: args.eventId,
      buyerId: user._id,
      buyerEmail: args.buyerEmail,
      buyerName: args.buyerName,
      status: "PENDING",
      subtotalCents: args.subtotalCents,
      platformFeeCents: args.platformFeeCents,
      processingFeeCents: args.processingFeeCents,
      totalCents: args.totalCents,
      soldByStaffId: staffMember?._id,
      referralCode: args.referralCode,
      selectedSeats: args.selectedSeats,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Track discount code usage
    if (args.discountCodeId && args.discountAmountCents) {
      await ctx.db.insert("discountCodeUsage", {
        discountCodeId: args.discountCodeId,
        orderId,
        userEmail: args.buyerEmail,
        discountAmountCents: args.discountAmountCents,
        createdAt: Date.now(),
      });
    }

    // Create order items (tickets)
    for (let i = 0; i < args.quantity; i++) {
      await ctx.db.insert("orderItems", {
        orderId,
        ticketTierId: args.ticketTierId,
        priceCents: ticketTier.price,
        createdAt: Date.now(),
      });
    }

    return orderId;
  },
});

/**
 * Complete an order after successful payment
 */
export const completeOrder = mutation({
  args: {
    orderId: v.id("orders"),
    paymentId: v.string(),
    paymentMethod: v.union(v.literal("SQUARE"), v.literal("STRIPE"), v.literal("CASH"), v.literal("PAYPAL"), v.literal("TEST"), v.literal("FREE")),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for completing orders
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to complete orders");
    }

    // Get order
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Verify order belongs to current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");
    if (order.buyerId !== user._id) {
      throw new Error("Not authorized to complete this order");
    }

    // Update order status - CASH payments are PENDING_PAYMENT until staff validates
    const orderStatus = args.paymentMethod === "CASH" ? "PENDING_PAYMENT" : "COMPLETED";
    await ctx.db.patch(args.orderId, {
      status: orderStatus,
      paymentId: args.paymentId,
      paymentMethod: args.paymentMethod,
      paidAt: args.paymentMethod === "CASH" ? undefined : Date.now(), // Don't set paidAt for cash until validated
      updatedAt: Date.now(),
    });

    // Generate tickets for each order item
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Track sold count per tier
    const tierSoldCount = new Map<string, number>();

    // CRITICAL FIX: Count tickets per tier FIRST, then validate availability BEFORE creating tickets
    for (const item of orderItems) {
      const currentCount = tierSoldCount.get(item.ticketTierId) || 0;
      tierSoldCount.set(item.ticketTierId, currentCount + 1);
    }

    // Validate availability BEFORE creating any tickets
    for (const [tierId, count] of Array.from(tierSoldCount.entries())) {
      const tier = await ctx.db.get(tierId as Id<"ticketTiers">);
      if (!tier) {
        throw new Error(`Ticket tier not found: ${tierId}`);
      }

      const newSold = tier.sold + count;
      if (newSold > tier.quantity) {
        throw new Error(
          `Tickets sold out during checkout. "${tier.name}" only has ` +
            `${tier.quantity - tier.sold} tickets remaining, but ${count} were requested. ` +
            `Please try again with fewer tickets or choose a different tier.`
        );
      }
    }

    // Get seating chart if seats were selected
    let seatingChart = null;
    if (order.selectedSeats && order.selectedSeats.length > 0) {
      seatingChart = await ctx.db
        .query("seatingCharts")
        .withIndex("by_event", (q) => q.eq("eventId", order.eventId))
        .first();
    }

    let seatIndex = 0;
    for (const item of orderItems) {
      // Generate unique ticket code
      const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // CASH payments start as PENDING until staff validates at door
      // All other payment methods are immediately VALID
      const ticketStatus = args.paymentMethod === "CASH" ? "PENDING" : "VALID";

      const ticketId = await ctx.db.insert("tickets", {
        orderId: args.orderId,
        orderItemId: item._id,
        eventId: order.eventId,
        ticketTierId: item.ticketTierId,
        attendeeId: user._id,
        attendeeEmail: order.buyerEmail,
        attendeeName: order.buyerName,
        ticketCode,
        status: ticketStatus,
        soldByStaffId: order.soldByStaffId || undefined,
        paymentMethod: args.paymentMethod as "SQUARE" | "STRIPE" | "CASH" | "PAYPAL" | "FREE" | "TEST",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Reserve seat if seating chart exists and seats were selected
      if (seatingChart && order.selectedSeats && seatIndex < order.selectedSeats.length) {
        const seat = order.selectedSeats[seatIndex];
        await ctx.db.insert("seatReservations", {
          eventId: order.eventId,
          seatingChartId: seatingChart._id,
          ticketId,
          orderId: args.orderId,
          sectionId: seat.sectionId,
          rowId: seat.rowId,
          rowLabel: seat.rowLabel,
          tableId: seat.tableId,
          tableNumber: seat.tableNumber,
          seatId: seat.seatId,
          seatNumber: seat.seatNumber,
          status: "RESERVED",
          reservedAt: Date.now(),
        });

        seatIndex++;
      }
    }

    // Update reserved seats count on seating chart if seats were reserved
    if (seatingChart && order.selectedSeats) {
      await ctx.db.patch(seatingChart._id, {
        reservedSeats: seatingChart.reservedSeats + order.selectedSeats.length,
      });
    }

    // Update sold count - availability was already validated above
    const now = Date.now();
    for (const [tierId, count] of Array.from(tierSoldCount.entries())) {
      const tier = await ctx.db.get(tierId as Id<"ticketTiers">);
      if (tier && "sold" in tier) {
        const currentVersion = tier.version || 0;
        const newSold = tier.sold + count;

        const updates: Record<string, unknown> = {
          sold: newSold,
          version: currentVersion + 1, // Increment version for optimistic locking
          updatedAt: now,
        };

        // Set firstSaleAt if this is the first sale for this tier
        if (tier.sold === 0 && !tier.firstSaleAt) {
          updates.firstSaleAt = now;
        }

        // Atomic update with version check
        await ctx.db.patch(tierId as Id<"ticketTiers">, updates);
      }
    }

    // Update staff member statistics if this sale was from a referral
    if (order.soldByStaffId) {
      const staffMember = await ctx.db.get(order.soldByStaffId);
      if (staffMember) {
        const ticketCount = orderItems.length;

        // Calculate commission
        let commission = 0;
        if (staffMember.commissionType === "PERCENTAGE") {
          // Calculate percentage commission on subtotal
          commission = Math.round((order.subtotalCents * (staffMember.commissionValue || 0)) / 100);
        } else if (staffMember.commissionType === "FIXED") {
          // Fixed commission per ticket (commissionValue is already in cents)
          commission = (staffMember.commissionValue || 0) * ticketCount;
        }

        // Update staff statistics
        await ctx.db.patch(order.soldByStaffId, {
          ticketsSold: staffMember.ticketsSold + ticketCount,
          commissionEarned: staffMember.commissionEarned + commission,
          updatedAt: Date.now(),
        });

        // Create a staff sale record for tracking
        await ctx.db.insert("staffSales", {
          staffId: order.soldByStaffId,
          staffUserId: staffMember.staffUserId,
          eventId: order.eventId,
          orderId: args.orderId,
          ticketCount,
          commissionAmount: commission,
          paymentMethod: args.paymentMethod === "TEST" || args.paymentMethod === "FREE"
            ? "ONLINE"
            : (args.paymentMethod as "SQUARE" | "STRIPE" | "CASH" | "ONLINE" | "CASH_APP"),
          createdAt: Date.now(),
        });
      }
    }

    // Send confirmation email for completed online payments
    // CASH payments don't send email here - they send when staff validates payment
    if (args.paymentMethod !== "CASH") {
      await ctx.scheduler.runAfter(
        0, // Send immediately
        api.notifications.ticketNotifications.sendCashOrderConfirmation,
        { orderId: args.orderId }
      );
    }

    return { success: true, ticketCount: orderItems.length };
  },
});

/**
 * Cancel a pending order
 */
export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || order.buyerId !== user._id) {
      throw new Error("Not authorized");
    }

    if (order.status !== "PENDING") {
      throw new Error("Cannot cancel completed order");
    }

    await ctx.db.patch(args.orderId, {
      status: "CANCELLED",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Register for a free event
 * Creates a free ticket for the attendee
 */
export const registerFreeEvent = mutation({
  args: {
    eventId: v.id("events"),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify event exists and is a FREE_EVENT
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.eventType !== "FREE_EVENT") {
      throw new Error("This event is not a free event. Please use the checkout flow.");
    }

    // Get or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.attendeeEmail))
      .first();

    if (!user) {
      // Create a basic user account for this attendee
      const userId = await ctx.db.insert("users", {
        email: args.attendeeEmail,
        name: args.attendeeName,
        role: "user",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to create user account");
    }

    // Look up staff member if referral code provided
    let staffMember = null;
    if (args.referralCode && args.referralCode.length > 0) {
      staffMember = await ctx.db
        .query("eventStaff")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode!))
        .first();

      if (staffMember && !staffMember.isActive) {
        staffMember = null; // Don't count inactive staff
      }
    }

    // Create a free order (completed immediately)
    const orderId = await ctx.db.insert("orders", {
      eventId: args.eventId,
      buyerId: user._id,
      buyerName: args.attendeeName,
      buyerEmail: args.attendeeEmail,
      status: "COMPLETED",
      subtotalCents: 0,
      platformFeeCents: 0,
      processingFeeCents: 0,
      totalCents: 0,
      paymentMethod: "TEST", // Free registration
      paidAt: Date.now(),
      soldByStaffId: staffMember?._id,
      referralCode: args.referralCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Generate ticket with QR code
    const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const ticketId = await ctx.db.insert("tickets", {
      orderId,
      eventId: args.eventId,
      attendeeId: user._id,
      attendeeEmail: args.attendeeEmail,
      attendeeName: args.attendeeName,
      ticketCode,
      status: "VALID",
      soldByStaffId: staffMember?._id,
      paymentMethod: "ONLINE", // Free but registered online
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update staff statistics if referred
    if (staffMember) {
      await ctx.db.patch(staffMember._id, {
        ticketsSold: staffMember.ticketsSold + 1,
        updatedAt: Date.now(),
      });

      // Create staff sale record (with $0 commission)
      await ctx.db.insert("staffSales", {
        staffId: staffMember._id,
        staffUserId: staffMember.staffUserId,
        eventId: args.eventId,
        orderId,
        ticketCount: 1,
        commissionAmount: 0, // No commission for free events
        paymentMethod: "ONLINE",
        createdAt: Date.now(),
      });
    }

    return {
      success: true,
      orderId,
      ticketId,
      ticketCode,
    };
  },
});

/**
 * Cancel a ticket and release its seat
 */
export const cancelTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    // Verify user owns this ticket
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || ticket.attendeeId !== user._id) {
      throw new Error("Not authorized");
    }

    // Can't cancel already scanned tickets
    if (ticket.scannedAt) {
      throw new Error("Cannot cancel a ticket that has been scanned");
    }

    // Update ticket status
    await ctx.db.patch(args.ticketId, {
      status: "CANCELLED",
      updatedAt: Date.now(),
    });

    // Release seat if exists
    const seatReservation = await ctx.db
      .query("seatReservations")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .filter((q) => q.eq(q.field("status"), "RESERVED"))
      .first();

    if (seatReservation) {
      await ctx.db.patch(seatReservation._id, {
        status: "RELEASED",
        releasedAt: Date.now(),
      });

      // Update seating chart reserved count
      const seatingChart = await ctx.db.get(seatReservation.seatingChartId);
      if (seatingChart) {
        await ctx.db.patch(seatingChart._id, {
          reservedSeats: Math.max(0, seatingChart.reservedSeats - 1),
        });
      }
    }

    // PRODUCTION: Decrement sold count with optimistic locking
    if (ticket.ticketTierId) {
      const tier = await ctx.db.get(ticket.ticketTierId);
      if (tier) {
        const currentVersion = tier.version || 0;
        const newSold = Math.max(0, tier.sold - 1);

        // Atomic update with version increment
        await ctx.db.patch(ticket.ticketTierId, {
          sold: newSold,
          version: currentVersion + 1,
          updatedAt: Date.now(),
        });

      }
    }

    return { success: true };
  },
});

/**
 * Create an order for a ticket bundle purchase
 */
export const createBundleOrder = mutation({
  args: {
    eventId: v.id("events"),
    bundleId: v.id("ticketBundles"),
    quantity: v.number(),
    buyerEmail: v.string(),
    buyerName: v.string(),
    subtotalCents: v.number(),
    platformFeeCents: v.number(),
    processingFeeCents: v.number(),
    totalCents: v.number(),
    referralCode: v.optional(v.string()),
    discountCodeId: v.optional(v.id("discountCodes")),
    discountAmountCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for creating bundle orders
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to create bundle orders");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Verify bundle exists
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) throw new Error("Bundle not found");
    if (bundle.eventId !== args.eventId) {
      throw new Error("Bundle does not belong to this event");
    }

    // Check bundle availability
    const available = bundle.totalQuantity - bundle.sold;
    if (available < args.quantity) {
      throw new Error(`Only ${available} bundle${available === 1 ? "" : "s"} available`);
    }

    // Look up staff member if referral code provided
    let staffMember = null;
    if (args.referralCode && args.referralCode.length > 0) {
      staffMember = await ctx.db
        .query("eventStaff")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode!))
        .first();

      if (staffMember && !staffMember.isActive) {
        staffMember = null;
      }
    }

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      eventId: args.eventId,
      buyerId: user._id,
      buyerName: args.buyerName,
      buyerEmail: args.buyerEmail,
      status: "PENDING",
      subtotalCents: args.subtotalCents,
      platformFeeCents: args.platformFeeCents,
      processingFeeCents: args.processingFeeCents,
      totalCents: args.totalCents,
      soldByStaffId: staffMember?._id,
      referralCode: args.referralCode,
      bundleId: args.bundleId,
      isBundlePurchase: true,
      discountCodeId: args.discountCodeId,
      discountAmountCents: args.discountAmountCents,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create order items for each tier in the bundle
    for (const includedTier of bundle.includedTiers) {
      const tier = await ctx.db.get(includedTier.tierId);
      if (!tier) {
        throw new Error(`Ticket tier ${includedTier.tierName} not found`);
      }

      // Check tier availability
      const tierQuantityNeeded = includedTier.quantity * args.quantity;
      const tierAvailable = tier.quantity - tier.sold;
      if (tierAvailable < tierQuantityNeeded) {
        throw new Error(`Not enough ${tier.name} tickets available`);
      }

      // Create order item
      await ctx.db.insert("orderItems", {
        orderId,
        ticketTierId: tier._id,
        priceCents: tier.price * includedTier.quantity,
        createdAt: Date.now(),
      });
    }

    return orderId;
  },
});

/**
 * Complete a bundle order after payment succeeds
 */
export const completeBundleOrder = mutation({
  args: {
    orderId: v.id("orders"),
    paymentId: v.string(),
    paymentMethod: v.union(v.literal("SQUARE"), v.literal("STRIPE"), v.literal("CASH"), v.literal("PAYPAL"), v.literal("TEST"), v.literal("FREE")),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (!order.bundleId) throw new Error("Not a bundle order");

    const bundle = await ctx.db.get(order.bundleId);
    if (!bundle) throw new Error("Bundle not found");

    // Update order status - CASH payments are PENDING_PAYMENT until staff validates
    const orderStatus = args.paymentMethod === "CASH" ? "PENDING_PAYMENT" : "COMPLETED";
    await ctx.db.patch(args.orderId, {
      status: orderStatus,
      paymentId: args.paymentId,
      paymentMethod: args.paymentMethod,
      paidAt: args.paymentMethod === "CASH" ? undefined : Date.now(),
      updatedAt: Date.now(),
    });

    // Generate tickets for each tier in the bundle
    const generatedTickets = [];

    for (const includedTier of bundle.includedTiers) {
      const tier = await ctx.db.get(includedTier.tierId);
      if (!tier) continue;

      // Generate tickets for this tier
      // CASH payments start as PENDING until staff validates
      const ticketStatus = args.paymentMethod === "CASH" ? "PENDING" : "VALID";

      for (let i = 0; i < includedTier.quantity; i++) {
        // Generate unique ticket code for QR scanning
        const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const ticketId = await ctx.db.insert("tickets", {
          eventId: tier.eventId, // FIXED: Use tier's eventId for multi-event bundles
          ticketTierId: tier._id,
          orderId: args.orderId,
          attendeeId: order.buyerId,
          attendeeEmail: order.buyerEmail,
          attendeeName: order.buyerName,
          ticketCode, // FIXED: Add unique ticket code for QR scanning
          status: ticketStatus,
          soldByStaffId: order.soldByStaffId,
          paymentMethod: args.paymentMethod === "TEST" ? "ONLINE" : args.paymentMethod,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        generatedTickets.push(ticketId);
      }

      // PRODUCTION: Increment sold count with optimistic locking
      const currentVersion = tier.version || 0;
      const newSold = tier.sold + includedTier.quantity;

      // CRITICAL: Validate availability BEFORE updating
      if (newSold > tier.quantity) {
        throw new Error(
          `Tickets sold out during checkout. Tier "${tier.name}" only has ` +
            `${tier.quantity - tier.sold} tickets remaining, but ${includedTier.quantity} were requested.`
        );
      }

      // Atomic update with version increment
      await ctx.db.patch(tier._id, {
        sold: newSold,
        version: currentVersion + 1,
        updatedAt: Date.now(),
      });

    }

    // Increment bundle sold count
    await ctx.db.patch(bundle._id, {
      sold: bundle.sold + 1,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      ticketsGenerated: generatedTickets.length,
      ticketIds: generatedTickets,
    };
  },
});

/**
 * Activate a ticket using 4-digit activation code
 * Used by customers who purchased tickets via cash from staff
 *
 * Flow:
 * 1. Staff generates activation code via generateCashActivationCode
 * 2. Customer receives code and uses this mutation to activate
 * 3. When all tickets in order are activated, order is marked COMPLETED
 * 4. Staff stats are updated when order completes
 */
export const activateTicket = mutation({
  args: {
    activationCode: v.string(),
    customerEmail: v.string(),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find ticket by activation code
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_activation_code", (q) => q.eq("activationCode", args.activationCode))
      .first();

    if (!ticket) {
      throw new Error("Invalid activation code. Please check the code and try again.");
    }

    // Check if already activated
    if (ticket.status !== "PENDING_ACTIVATION") {
      if (ticket.status === "VALID") {
        throw new Error("This ticket has already been activated.");
      } else {
        throw new Error(`This ticket cannot be activated (status: ${ticket.status}).`);
      }
    }

    // Generate unique ticket code (QR code)
    const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Update ticket with activation details
    await ctx.db.patch(ticket._id, {
      ticketCode,
      status: "VALID",
      attendeeEmail: args.customerEmail,
      attendeeName: args.customerName || ticket.attendeeName,
      activatedAt: now,
      updatedAt: now,
    });

    // Get event and ticket tier details for response
    const event = await ctx.db.get(ticket.eventId);
    const ticketTier = ticket.ticketTierId ? await ctx.db.get(ticket.ticketTierId) : null;

    // Check if this was a cash order that needs to be completed
    if (ticket.orderId) {
      const order = await ctx.db.get(ticket.orderId);

      if (order && order.status === "PENDING_PAYMENT" && order.paymentMethod === "CASH") {
        // Check if ALL tickets in this order are now activated (status = VALID)
        const allOrderTickets = await ctx.db
          .query("tickets")
          .withIndex("by_order", (q) => q.eq("orderId", ticket.orderId!))
          .collect();

        const allActivated = allOrderTickets.every(
          (t) => t._id === ticket._id || t.status === "VALID"
        );

        if (allActivated) {
          // Complete the order
          await ctx.db.patch(order._id, {
            status: "COMPLETED",
            paidAt: now,
            updatedAt: now,
          });

          // Update staff stats if a staff member sold this
          const staffId = ticket.soldByStaffId || order.soldByStaffId;
          if (staffId) {
            const staff = await ctx.db.get(staffId);
            if (staff) {
              const ticketCount = allOrderTickets.length;

              // Update staff sales tracking
              await ctx.db.patch(staffId, {
                ticketsSold: (staff.ticketsSold || 0) + ticketCount,
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
                await ctx.db.patch(staffId, {
                  commissionEarned: (staff.commissionEarned || 0) + commission,
                });
              }

              // Record staff sale
              await ctx.db.insert("staffSales", {
                orderId: order._id,
                eventId: order.eventId,
                staffId: staffId,
                staffUserId: staff.staffUserId,
                ticketCount,
                commissionAmount: commission,
                paymentMethod: "CASH",
                createdAt: now,
              });
            }
          }
        }
      }
    }

    return {
      success: true,
      ticketId: ticket._id,
      ticketCode,
      eventName: event?.name || "Unknown Event",
      eventDate: event?.startDate,
      tierName: ticketTier?.name || "General Admission",
      attendeeName: args.customerName || ticket.attendeeName,
      attendeeEmail: args.customerEmail,
    };
  },
});

/**
 * Update ticket details (for ticket owners)
 * Can only update before ticket is scanned
 */
export const updateTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    attendeeName: v.optional(v.string()),
    attendeeEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for updating tickets
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to update tickets");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    // Check ticket status
    if (ticket.status === "SCANNED") {
      throw new Error("Cannot edit a ticket that has been scanned");
    }
    if (ticket.status === "CANCELLED") {
      throw new Error("Cannot edit a cancelled ticket");
    }

    // Check ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");
    if (ticket.attendeeId !== user._id) {
      throw new Error("You can only edit your own tickets");
    }

    // Check if event has started (prevent editing after event begins)
    const event = await ctx.db.get(ticket.eventId);
    if (event && event.startDate && Date.now() >= event.startDate) {
      throw new Error("Cannot edit ticket after event has started");
    }

    // Update ticket details
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.attendeeName !== undefined) {
      updates.attendeeName = args.attendeeName;
    }
    if (args.attendeeEmail !== undefined) {
      updates.attendeeEmail = args.attendeeEmail;
    }

    await ctx.db.patch(args.ticketId, updates);

    return { success: true, ticketId: args.ticketId };
  },
});

/**
 * Delete/Cancel a ticket (for ticket owners)
 * Releases seat if assigned and updates tier sold count
 */
export const deleteTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for deleting tickets
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to delete tickets.");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    // Check ticket status
    if (ticket.status === "SCANNED") {
      throw new Error("Cannot delete a ticket that has been scanned");
    }
    if (ticket.status === "CANCELLED") {
      throw new Error("Ticket is already cancelled");
    }

    // Check ownership
    if (!identity.email) {
      throw new Error("User email not found");
    }

    const userEmail = identity.email;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    if (ticket.attendeeId !== user._id) {
      throw new Error("You can only delete your own tickets");
    }

    // Seat reservations are now handled via:
    // 1. Session holds with 15-minute expiry (seatingCharts.sections.tables.seats.sessionExpiry)
    // 2. Cron job "release-expired-seat-holds" auto-releases after expiry
    // 3. Permanent reservations stored in seatReservations table
    // No manual release needed here - the cron handles expired holds

    // PRODUCTION: Update tier sold count with optimistic locking
    if (ticket.ticketTierId) {
      const tier = await ctx.db.get(ticket.ticketTierId);
      if (tier && tier.sold > 0) {
        const currentVersion = tier.version || 0;
        const newSold = Math.max(0, tier.sold - 1);

        // Atomic update with version increment
        await ctx.db.patch(ticket.ticketTierId, {
          sold: newSold,
          version: currentVersion + 1,
          updatedAt: Date.now(),
        });

      }
    }

    // Cancel the ticket (don't actually delete, just mark as cancelled)
    await ctx.db.patch(args.ticketId, {
      status: "CANCELLED" as const,
      updatedAt: Date.now(),
    });

    return { success: true, ticketId: args.ticketId };
  },
});

/**
 * Bundle multiple tickets together for organization
 * Creates a virtual grouping for easier management
 */
export const bundleTickets = mutation({
  args: {
    ticketIds: v.array(v.id("tickets")),
    bundleName: v.string(),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for bundling tickets
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to bundle tickets.");
    }

    if (args.ticketIds.length < 2) {
      throw new Error("Must select at least 2 tickets to bundle");
    }

    // Verify all tickets exist and belong to the user
    const tickets = await Promise.all(args.ticketIds.map((id) => ctx.db.get(id)));

    // Check ownership (skip in testing mode)
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();

      if (user) {
        for (const ticket of tickets) {
          if (!ticket) throw new Error("One or more tickets not found");
          if (ticket.attendeeId !== user._id) {
            throw new Error("You can only bundle your own tickets");
          }
          if (ticket.status === "CANCELLED") {
            throw new Error("Cannot bundle cancelled tickets");
          }
        }
      }
    }

    // Create a bundle ID (could be stored in a separate bundles table for more features)
    const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update all tickets with the bundle information
    for (const ticketId of args.ticketIds) {
      await ctx.db.patch(ticketId, {
        bundleId,
        bundleName: args.bundleName,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      bundleId,
      bundleName: args.bundleName,
      ticketCount: args.ticketIds.length,
    };
  },
});

/**
 * Unbundle tickets to remove them from a bundle
 */
export const unbundleTickets = mutation({
  args: {
    ticketIds: v.array(v.id("tickets")),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for unbundling tickets
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to unbundle tickets");
    }

    // Verify all tickets exist and belong to the user
    const tickets = await Promise.all(args.ticketIds.map((id) => ctx.db.get(id)));

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    for (const ticket of tickets) {
      if (!ticket) throw new Error("One or more tickets not found");
      if (ticket.attendeeId !== user._id) {
        throw new Error("You can only unbundle your own tickets");
      }
    }

    // Remove bundle information from tickets
    for (const ticketId of args.ticketIds) {
      await ctx.db.patch(ticketId, {
        bundleId: undefined,
        bundleName: undefined,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      ticketCount: args.ticketIds.length,
    };
  },
});

/**
 * Duplicate a ticket tier with reset sold counts
 */
export const duplicateTicketTier = mutation({
  args: {
    tierId: v.id("ticketTiers"),
    newName: v.optional(v.string()),
    newPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for duplicating ticket tiers
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required to duplicate ticket tiers");
    }

    // Get original tier
    const originalTier = await ctx.db.get(args.tierId);
    if (!originalTier) {
      throw new Error("Ticket tier not found");
    }

    // Verify ownership (throws if not authorized)
    const ownershipCheck = await requireEventOwnership(ctx, originalTier.eventId);
    const event = ownershipCheck.event;
    const user = ownershipCheck.user;

    // Create new tier with duplicated data
    const newTierData = {
      ...originalTier,
      _id: undefined, // Remove ID to create new record
      _creationTime: undefined, // Remove system fields
      name: args.newName || `${originalTier.name} (Copy)`,
      price: args.newPrice !== undefined ? args.newPrice : originalTier.price,
      sold: 0, // Reset sold count
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create the new tier
    const newTierId = await ctx.db.insert("ticketTiers", newTierData);


    return {
      success: true,
      originalTierId: args.tierId,
      newTierId,
      newName: newTierData.name,
      newPrice: newTierData.price,
    };
  },
});

// =====================================================
// SIMPLIFIED EARLY BIRD PRICING HELPERS
// =====================================================

/**
 * Quick Early Bird Setup - Simplified way to add early bird pricing
 *
 * Instead of manually configuring pricingTiers with timestamps,
 * just specify a discount and end date.
 *
 * Example: "20% off until Dec 31" automatically creates:
 * - Early Bird tier: 80% of base price, ends Dec 31
 * - Regular tier: 100% of base price, starts Dec 31
 */
export const setupEarlyBirdPricing = mutation({
  args: {
    tierId: v.id("ticketTiers"),
    discountPercent: v.number(), // e.g., 20 for 20% off
    earlyBirdEndDate: v.number(), // Timestamp when early bird ends
    earlyBirdName: v.optional(v.string()), // Default: "Early Bird"
    regularName: v.optional(v.string()), // Default: "Regular"
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    // Calculate early bird price (discount from base price)
    const regularPrice = tier.price;
    const earlyBirdPrice = Math.round(regularPrice * (1 - args.discountPercent / 100));

    // Create pricing tiers
    const pricingTiers = [
      {
        name: args.earlyBirdName || "Early Bird",
        price: earlyBirdPrice,
        availableFrom: Date.now(), // Start immediately
        availableUntil: args.earlyBirdEndDate,
      },
      {
        name: args.regularName || "Regular",
        price: regularPrice,
        availableFrom: args.earlyBirdEndDate,
        // No availableUntil - runs until sale end
      },
    ];

    await ctx.db.patch(args.tierId, {
      pricingTiers,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      earlyBirdPrice,
      regularPrice,
      savings: regularPrice - earlyBirdPrice,
      savingsPercent: args.discountPercent,
      earlyBirdEnds: args.earlyBirdEndDate,
    };
  },
});

/**
 * Three-Tier Pricing Setup (Early Bird → Regular → Last Chance)
 *
 * Common pattern for events that want to reward early buyers
 * and create urgency near the event date.
 */
export const setupThreeTierPricing = mutation({
  args: {
    tierId: v.id("ticketTiers"),
    earlyBirdDiscountPercent: v.number(), // e.g., 30 for 30% off
    earlyBirdEndDate: v.number(),
    lastChancePremiumPercent: v.number(), // e.g., 20 for 20% markup
    lastChanceStartDate: v.number(),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    const regularPrice = tier.price;
    const earlyBirdPrice = Math.round(regularPrice * (1 - args.earlyBirdDiscountPercent / 100));
    const lastChancePrice = Math.round(regularPrice * (1 + args.lastChancePremiumPercent / 100));

    const pricingTiers = [
      {
        name: "Early Bird",
        price: earlyBirdPrice,
        availableFrom: Date.now(),
        availableUntil: args.earlyBirdEndDate,
      },
      {
        name: "Regular",
        price: regularPrice,
        availableFrom: args.earlyBirdEndDate,
        availableUntil: args.lastChanceStartDate,
      },
      {
        name: "Last Chance",
        price: lastChancePrice,
        availableFrom: args.lastChanceStartDate,
      },
    ];

    await ctx.db.patch(args.tierId, {
      pricingTiers,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      earlyBirdPrice,
      regularPrice,
      lastChancePrice,
      earlyBirdSavings: regularPrice - earlyBirdPrice,
      lastChancePremium: lastChancePrice - regularPrice,
    };
  },
});

/**
 * Clear early bird pricing - revert to simple base price
 */
export const clearEarlyBirdPricing = mutation({
  args: {
    tierId: v.id("ticketTiers"),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) throw new Error("Ticket tier not found");

    await ctx.db.patch(args.tierId, {
      pricingTiers: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, basePrice: tier.price };
  },
});
