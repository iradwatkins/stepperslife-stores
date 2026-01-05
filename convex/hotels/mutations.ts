import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";

// Room type validator (shared between create and update)
const roomTypeValidator = v.object({
  id: v.string(),
  name: v.string(),
  pricePerNightCents: v.number(),
  quantity: v.number(),
  sold: v.number(),
  maxGuests: v.number(),
  description: v.optional(v.string()),
});

// Create a hotel package for an event
export const createHotelPackage = mutation({
  args: {
    eventId: v.id("events"),
    hotelName: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    description: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())),
    starRating: v.optional(v.number()),
    images: v.optional(v.array(v.string())),
    roomTypes: v.array(roomTypeValidator),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    bookingCutoffHours: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify event ownership
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.organizerId !== user._id) {
      throw new Error("Not authorized to add hotel packages to this event");
    }

    // Validate room types have unique IDs
    const roomTypeIds = args.roomTypes.map((rt) => rt.id);
    if (new Set(roomTypeIds).size !== roomTypeIds.length) {
      throw new Error("Room type IDs must be unique");
    }

    // Initialize sold count to 0 for all room types
    const roomTypesWithSold = args.roomTypes.map((rt) => ({
      ...rt,
      sold: 0,
    }));

    const now = Date.now();

    const packageId = await ctx.db.insert("hotelPackages", {
      eventId: args.eventId,
      organizerId: user._id,
      hotelName: args.hotelName,
      address: args.address,
      city: args.city,
      state: args.state,
      description: args.description,
      amenities: args.amenities,
      starRating: args.starRating,
      images: args.images,
      roomTypes: roomTypesWithSold,
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      bookingCutoffHours: args.bookingCutoffHours,
      specialInstructions: args.specialInstructions,
      contactName: args.contactName,
      contactPhone: args.contactPhone,
      contactEmail: args.contactEmail,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return packageId;
  },
});

// Update a hotel package
export const updateHotelPackage = mutation({
  args: {
    packageId: v.id("hotelPackages"),
    hotelName: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    description: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())),
    starRating: v.optional(v.number()),
    images: v.optional(v.array(v.string())),
    roomTypes: v.optional(v.array(roomTypeValidator)),
    checkInDate: v.optional(v.number()),
    checkOutDate: v.optional(v.number()),
    bookingCutoffHours: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Get existing package
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");

    // Verify ownership via event
    const event = await ctx.db.get(pkg.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized to update this hotel package");
    }

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.hotelName !== undefined) updates.hotelName = args.hotelName;
    if (args.address !== undefined) updates.address = args.address;
    if (args.city !== undefined) updates.city = args.city;
    if (args.state !== undefined) updates.state = args.state;
    if (args.description !== undefined) updates.description = args.description;
    if (args.amenities !== undefined) updates.amenities = args.amenities;
    if (args.starRating !== undefined) updates.starRating = args.starRating;
    if (args.images !== undefined) updates.images = args.images;
    if (args.checkInDate !== undefined) updates.checkInDate = args.checkInDate;
    if (args.checkOutDate !== undefined) updates.checkOutDate = args.checkOutDate;
    if (args.bookingCutoffHours !== undefined)
      updates.bookingCutoffHours = args.bookingCutoffHours;
    if (args.specialInstructions !== undefined)
      updates.specialInstructions = args.specialInstructions;
    if (args.contactName !== undefined) updates.contactName = args.contactName;
    if (args.contactPhone !== undefined) updates.contactPhone = args.contactPhone;
    if (args.contactEmail !== undefined) updates.contactEmail = args.contactEmail;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // Handle room types update carefully (preserve sold counts)
    if (args.roomTypes !== undefined) {
      const existingRoomTypes = pkg.roomTypes;
      const updatedRoomTypes = args.roomTypes.map((newRt) => {
        // Find existing room type to preserve sold count
        const existing = existingRoomTypes.find((rt) => rt.id === newRt.id);
        return {
          ...newRt,
          sold: existing?.sold ?? 0, // Preserve sold count or default to 0
        };
      });
      updates.roomTypes = updatedRoomTypes;
    }

    await ctx.db.patch(args.packageId, updates);

    return args.packageId;
  },
});

// Delete a hotel package
export const deleteHotelPackage = mutation({
  args: {
    packageId: v.id("hotelPackages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Get package
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");

    // Verify ownership via event
    const event = await ctx.db.get(pkg.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized to delete this hotel package");
    }

    // Check for existing reservations
    const reservations = await ctx.db
      .query("hotelReservations")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "PENDING"),
          q.eq(q.field("status"), "CONFIRMED")
        )
      )
      .first();

    if (reservations) {
      throw new Error(
        "Cannot delete hotel package with active reservations. Deactivate it instead."
      );
    }

    await ctx.db.delete(args.packageId);

    return { success: true };
  },
});

// Toggle active status of a hotel package
export const toggleHotelPackageActive = mutation({
  args: {
    packageId: v.id("hotelPackages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");

    const event = await ctx.db.get(pkg.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.packageId, {
      isActive: !pkg.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !pkg.isActive };
  },
});

// Duplicate a hotel package (for quick creation)
export const duplicateHotelPackage = mutation({
  args: {
    packageId: v.id("hotelPackages"),
    newEventId: v.optional(v.id("events")), // Optionally copy to different event
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");

    // Verify ownership of source package
    const sourceEvent = await ctx.db.get(pkg.eventId);
    if (!sourceEvent || sourceEvent.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    // If copying to new event, verify ownership
    const targetEventId = args.newEventId || pkg.eventId;
    if (args.newEventId) {
      const targetEvent = await ctx.db.get(args.newEventId);
      if (!targetEvent || targetEvent.organizerId !== user._id) {
        throw new Error("Not authorized to add to target event");
      }
    }

    const now = Date.now();

    // Reset sold counts in room types
    const roomTypesReset = pkg.roomTypes.map((rt) => ({
      ...rt,
      id: `${rt.id}-copy-${Date.now()}`, // New unique ID
      sold: 0,
    }));

    const newPackageId = await ctx.db.insert("hotelPackages", {
      eventId: targetEventId,
      organizerId: user._id,
      hotelName: `${pkg.hotelName} (Copy)`,
      address: pkg.address,
      city: pkg.city,
      state: pkg.state,
      description: pkg.description,
      amenities: pkg.amenities,
      starRating: pkg.starRating,
      images: pkg.images,
      roomTypes: roomTypesReset,
      checkInDate: pkg.checkInDate,
      checkOutDate: pkg.checkOutDate,
      bookingCutoffHours: pkg.bookingCutoffHours,
      specialInstructions: pkg.specialInstructions,
      contactName: pkg.contactName,
      contactPhone: pkg.contactPhone,
      contactEmail: pkg.contactEmail,
      isActive: false, // Start inactive
      createdAt: now,
      updatedAt: now,
    });

    return newPackageId;
  },
});

// Add a room type to existing package
export const addRoomType = mutation({
  args: {
    packageId: v.id("hotelPackages"),
    roomType: roomTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");

    const event = await ctx.db.get(pkg.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    // Check for duplicate ID
    if (pkg.roomTypes.some((rt) => rt.id === args.roomType.id)) {
      throw new Error("Room type ID already exists");
    }

    const updatedRoomTypes = [
      ...pkg.roomTypes,
      { ...args.roomType, sold: 0 },
    ];

    await ctx.db.patch(args.packageId, {
      roomTypes: updatedRoomTypes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove a room type from package
export const removeRoomType = mutation({
  args: {
    packageId: v.id("hotelPackages"),
    roomTypeId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Hotel package not found");

    const event = await ctx.db.get(pkg.eventId);
    if (!event || event.organizerId !== user._id) {
      throw new Error("Not authorized");
    }

    const roomType = pkg.roomTypes.find((rt) => rt.id === args.roomTypeId);
    if (!roomType) throw new Error("Room type not found");

    // Check for reservations using this room type
    const reservations = await ctx.db
      .query("hotelReservations")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .filter((q) => q.eq(q.field("roomTypeId"), args.roomTypeId))
      .first();

    if (reservations) {
      throw new Error(
        "Cannot remove room type with existing reservations"
      );
    }

    const updatedRoomTypes = pkg.roomTypes.filter(
      (rt) => rt.id !== args.roomTypeId
    );

    await ctx.db.patch(args.packageId, {
      roomTypes: updatedRoomTypes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
