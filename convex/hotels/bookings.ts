import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";

// Generate a unique confirmation number
function generateConfirmationNumber(): string {
  const prefix = "HR"; // Hotel Reservation
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Generate a unique hold token
function generateHoldToken(): string {
  return `hold_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

// Hold duration: 15 minutes
const HOLD_DURATION_MS = 15 * 60 * 1000;

// Create a hotel reservation (customer booking)
// HOLD-FIRST PATTERN: Rooms are reserved immediately to prevent race conditions.
// If payment fails or times out (15 min), the hold expires and rooms are released.
export const createReservation = mutation({
  args: {
    packageId: v.id("hotelPackages"),
    roomTypeId: v.string(),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    numberOfRooms: v.number(),
    numberOfGuests: v.number(),
    guestName: v.string(),
    guestEmail: v.string(),
    guestPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    paymentMethod: v.union(v.literal("STRIPE"), v.literal("PAYPAL")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Get the hotel package
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");
    if (!pkg.isActive) throw new Error("This hotel is no longer available");

    // Find the room type
    const roomType = pkg.roomTypes.find((rt) => rt.id === args.roomTypeId);
    if (!roomType) throw new Error("Room type not found");

    // Check availability (accounting for current sold count)
    const remainingRooms = roomType.quantity - roomType.sold;
    if (args.numberOfRooms > remainingRooms) {
      throw new Error(
        `Only ${remainingRooms} rooms available for this room type`
      );
    }

    // Validate dates
    if (args.checkOutDate <= args.checkInDate) {
      throw new Error("Check-out date must be after check-in date");
    }

    // Validate guest count
    const maxGuestsForBooking = roomType.maxGuests * args.numberOfRooms;
    if (args.numberOfGuests > maxGuestsForBooking) {
      throw new Error(
        `Maximum ${maxGuestsForBooking} guests allowed for ${args.numberOfRooms} room(s)`
      );
    }

    // Check booking cutoff
    if (pkg.bookingCutoffHours) {
      const event = await ctx.db.get(pkg.eventId);
      if (event?.startDate) {
        const cutoffTime =
          event.startDate - pkg.bookingCutoffHours * 60 * 60 * 1000;
        if (Date.now() > cutoffTime) {
          throw new Error(
            `Booking closed ${pkg.bookingCutoffHours} hours before event`
          );
        }
      }
    }

    // Calculate pricing
    const nights = Math.ceil(
      (args.checkOutDate - args.checkInDate) / (1000 * 60 * 60 * 24)
    );
    const subtotalCents =
      roomType.pricePerNightCents * nights * args.numberOfRooms;
    const platformFeeCents = Math.round(subtotalCents * 0.05); // 5% platform fee
    const totalCents = subtotalCents + platformFeeCents;

    const now = Date.now();
    const confirmationNumber = generateConfirmationNumber();
    const holdToken = generateHoldToken();
    const expiresAt = now + HOLD_DURATION_MS;

    // HOLD-FIRST: Immediately reserve the rooms with optimistic locking
    // This prevents race conditions where two users could book the same room
    const currentVersion = roomType.version || 0;
    const updatedRoomTypes = pkg.roomTypes.map((rt) => {
      if (rt.id === args.roomTypeId) {
        const newSold = rt.sold + args.numberOfRooms;
        // Double-check availability with fresh calculation
        if (newSold > rt.quantity) {
          throw new Error("Rooms no longer available - please try again");
        }
        return {
          ...rt,
          sold: newSold,
          version: currentVersion + 1, // Increment version for optimistic locking
        };
      }
      return rt;
    });

    // Update package with reserved rooms
    await ctx.db.patch(args.packageId, {
      roomTypes: updatedRoomTypes,
      updatedAt: now,
    });

    // Create the reservation with hold info (PENDING until payment)
    const reservationId = await ctx.db.insert("hotelReservations", {
      packageId: args.packageId,
      eventId: pkg.eventId,
      roomTypeId: args.roomTypeId,
      userId: user._id,
      guestName: args.guestName,
      guestEmail: args.guestEmail,
      guestPhone: args.guestPhone,
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      numberOfNights: nights,
      numberOfRooms: args.numberOfRooms,
      numberOfGuests: args.numberOfGuests,
      pricePerNightCents: roomType.pricePerNightCents,
      subtotalCents,
      platformFeeCents,
      totalCents,
      paymentMethod: args.paymentMethod,
      status: "PENDING",
      holdToken, // For verification on confirmation
      expiresAt, // When the hold expires (15 min)
      specialRequests: args.specialRequests,
      confirmationNumber,
      createdAt: now,
      updatedAt: now,
    });

    return {
      reservationId,
      confirmationNumber,
      totalCents,
      holdToken,
      expiresAt,
    };
  },
});

// Confirm a reservation after payment
// Note: With hold-first pattern, rooms are already reserved. This just confirms the payment.
export const confirmReservation = mutation({
  args: {
    reservationId: v.id("hotelReservations"),
    stripePaymentIntentId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
    holdToken: v.optional(v.string()), // Optional verification
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (reservation.status !== "PENDING") {
      throw new Error("Reservation is not pending");
    }

    // Check if hold has expired
    if (reservation.expiresAt && Date.now() > reservation.expiresAt) {
      throw new Error("Reservation hold has expired. Please start a new booking.");
    }

    // Optional: Verify hold token matches (security)
    if (args.holdToken && reservation.holdToken !== args.holdToken) {
      throw new Error("Invalid hold token");
    }

    // Note: Sold count was already updated in createReservation (hold-first pattern)
    // No need to update it again here

    // Confirm the reservation and clear hold fields
    await ctx.db.patch(args.reservationId, {
      status: "CONFIRMED",
      stripePaymentIntentId: args.stripePaymentIntentId,
      paypalOrderId: args.paypalOrderId,
      holdToken: undefined, // Clear hold token
      expiresAt: undefined, // Clear expiration
      updatedAt: Date.now(),
    });

    return { success: true, confirmationNumber: reservation.confirmationNumber };
  },
});

// Cancel a reservation
export const cancelReservation = mutation({
  args: {
    reservationId: v.id("hotelReservations"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    // Verify ownership or organizer access
    const pkg = await ctx.db.get(reservation.packageId);
    const event = pkg ? await ctx.db.get(pkg.eventId) : null;

    const isGuest = reservation.userId === user._id;
    const isOrganizer = event?.organizerId === user._id;

    if (!isGuest && !isOrganizer) {
      throw new Error("Not authorized to cancel this reservation");
    }

    if (
      reservation.status === "CANCELLED" ||
      reservation.status === "REFUNDED"
    ) {
      throw new Error("Reservation is already cancelled");
    }

    // With hold-first pattern, rooms are reserved for both PENDING and CONFIRMED
    // So we need to release them for both statuses
    if ((reservation.status === "CONFIRMED" || reservation.status === "PENDING") && pkg) {
      const updatedRoomTypes = pkg.roomTypes.map((rt) => {
        if (rt.id === reservation.roomTypeId) {
          return {
            ...rt,
            sold: Math.max(0, rt.sold - reservation.numberOfRooms),
          };
        }
        return rt;
      });

      await ctx.db.patch(reservation.packageId, {
        roomTypes: updatedRoomTypes,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.reservationId, {
      status: "CANCELLED",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark reservation as refunded (admin/organizer only)
export const refundReservation = mutation({
  args: {
    reservationId: v.id("hotelReservations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    // Verify organizer access
    const pkg = await ctx.db.get(reservation.packageId);
    const event = pkg ? await ctx.db.get(pkg.eventId) : null;

    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized to refund this reservation");
    }

    if (reservation.status !== "CONFIRMED") {
      throw new Error("Can only refund confirmed reservations");
    }

    // Restore room availability
    if (pkg) {
      const updatedRoomTypes = pkg.roomTypes.map((rt) => {
        if (rt.id === reservation.roomTypeId) {
          return {
            ...rt,
            sold: Math.max(0, rt.sold - reservation.numberOfRooms),
          };
        }
        return rt;
      });

      await ctx.db.patch(reservation.packageId, {
        roomTypes: updatedRoomTypes,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.reservationId, {
      status: "REFUNDED",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update reservation details (organizer only)
export const updateReservation = mutation({
  args: {
    reservationId: v.id("hotelReservations"),
    guestName: v.optional(v.string()),
    guestEmail: v.optional(v.string()),
    guestPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    // Verify ownership or organizer access
    const pkg = await ctx.db.get(reservation.packageId);
    const event = pkg ? await ctx.db.get(pkg.eventId) : null;

    const isGuest = reservation.userId === user._id;
    const isOrganizer = event?.organizerId === user._id;

    if (!isGuest && !isOrganizer) {
      throw new Error("Not authorized to update this reservation");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.guestName !== undefined) updates.guestName = args.guestName;
    if (args.guestEmail !== undefined) updates.guestEmail = args.guestEmail;
    if (args.guestPhone !== undefined) updates.guestPhone = args.guestPhone;
    if (args.specialRequests !== undefined)
      updates.specialRequests = args.specialRequests;

    await ctx.db.patch(args.reservationId, updates);

    return { success: true };
  },
});
