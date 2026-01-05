import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";

// Get all hotel packages for an event (public - for customers)
export const getHotelPackagesForEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const packages = await ctx.db
      .query("hotelPackages")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return packages;
  },
});

// Get a single hotel package by ID
export const getHotelPackage = query({
  args: {
    packageId: v.id("hotelPackages"),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    return pkg;
  },
});

// Get hotel packages for organizer's event (for management)
export const getOrganizerHotelPackages = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify ownership
    const event = await ctx.db.get(args.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized to view hotel packages for this event");
    }

    const packages = await ctx.db
      .query("hotelPackages")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return packages;
  },
});

// Get reservations for an event (organizer only)
export const getReservationsForEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify ownership
    const event = await ctx.db.get(args.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized to view reservations for this event");
    }

    const reservations = await ctx.db
      .query("hotelReservations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Enrich with package info
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const pkg = await ctx.db.get(reservation.packageId);
        return {
          ...reservation,
          hotelName: pkg?.hotelName || "Unknown Hotel",
          roomTypeName:
            pkg?.roomTypes.find((rt) => rt.id === reservation.roomTypeId)?.name ||
            "Unknown Room",
        };
      })
    );

    return enrichedReservations;
  },
});

// Get reservations for a specific hotel package (organizer only)
export const getReservationsForPackage = query({
  args: {
    packageId: v.id("hotelPackages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify ownership via package -> event
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");

    const event = await ctx.db.get(pkg.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    const reservations = await ctx.db
      .query("hotelReservations")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    return reservations;
  },
});

// Get user's reservations (for "My Bookings" page)
export const getMyReservations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const reservations = await ctx.db
      .query("hotelReservations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Enrich with package and event info
    const enrichedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const pkg = await ctx.db.get(reservation.packageId);
        const event = await ctx.db.get(reservation.eventId);

        return {
          ...reservation,
          hotelName: pkg?.hotelName || "Unknown Hotel",
          hotelAddress: pkg?.address || "",
          hotelCity: pkg?.city || "",
          hotelState: pkg?.state || "",
          roomTypeName:
            pkg?.roomTypes.find((rt) => rt.id === reservation.roomTypeId)?.name ||
            "Unknown Room",
          eventName: event?.name || "Unknown Event",
          eventDate: event?.startDate,
        };
      })
    );

    // Sort by check-in date (upcoming first)
    return enrichedReservations.sort((a, b) => a.checkInDate - b.checkInDate);
  },
});

// Get reservation by confirmation number (public)
export const getReservationByConfirmation = query({
  args: {
    confirmationNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("hotelReservations")
      .withIndex("by_confirmation", (q) =>
        q.eq("confirmationNumber", args.confirmationNumber)
      )
      .first();

    if (!reservation) return null;

    // Enrich with package info
    const pkg = await ctx.db.get(reservation.packageId);
    const event = await ctx.db.get(reservation.eventId);

    return {
      ...reservation,
      hotelName: pkg?.hotelName || "Unknown Hotel",
      hotelAddress: pkg?.address || "",
      hotelCity: pkg?.city || "",
      hotelState: pkg?.state || "",
      roomTypeName:
        pkg?.roomTypes.find((rt) => rt.id === reservation.roomTypeId)?.name ||
        "Unknown Room",
      eventName: event?.name || "Unknown Event",
    };
  },
});

// Check availability for a room type on specific dates
export const checkAvailability = query({
  args: {
    packageId: v.id("hotelPackages"),
    roomTypeId: v.string(),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    numberOfRooms: v.number(),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return { available: false, reason: "Package not found" };

    const roomType = pkg.roomTypes.find((rt) => rt.id === args.roomTypeId);
    if (!roomType) return { available: false, reason: "Room type not found" };

    // Calculate remaining availability
    const remainingRooms = roomType.quantity - roomType.sold;

    if (args.numberOfRooms > remainingRooms) {
      return {
        available: false,
        reason: `Only ${remainingRooms} rooms available`,
        remainingRooms,
      };
    }

    // Calculate nights
    const nights = Math.ceil(
      (args.checkOutDate - args.checkInDate) / (1000 * 60 * 60 * 24)
    );

    // Calculate total price
    const subtotalCents = roomType.pricePerNightCents * nights * args.numberOfRooms;
    const platformFeeCents = Math.round(subtotalCents * 0.05); // 5% platform fee
    const totalCents = subtotalCents + platformFeeCents;

    return {
      available: true,
      remainingRooms,
      pricePerNightCents: roomType.pricePerNightCents,
      nights,
      subtotalCents,
      platformFeeCents,
      totalCents,
    };
  },
});

// Get hotel stats for organizer dashboard
export const getHotelStats = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify ownership
    const event = await ctx.db.get(args.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    const packages = await ctx.db
      .query("hotelPackages")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const reservations = await ctx.db
      .query("hotelReservations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "CONFIRMED"))
      .collect();

    // Calculate totals
    const totalRevenue = reservations.reduce((sum, r) => sum + r.totalCents, 0);
    const totalReservations = reservations.length;
    const totalRoomsBooked = reservations.reduce(
      (sum, r) => sum + r.numberOfRooms,
      0
    );

    // Calculate total capacity and fill rate
    const totalCapacity = packages.reduce((sum, pkg) => {
      return sum + pkg.roomTypes.reduce((roomSum, rt) => roomSum + rt.quantity, 0);
    }, 0);

    const fillRate =
      totalCapacity > 0 ? Math.round((totalRoomsBooked / totalCapacity) * 100) : 0;

    return {
      totalPackages: packages.length,
      activePackages: packages.filter((p) => p.isActive).length,
      totalReservations,
      totalRoomsBooked,
      totalCapacity,
      fillRate,
      totalRevenue,
    };
  },
});
