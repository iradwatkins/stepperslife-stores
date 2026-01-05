import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireRestaurantOwner } from "./lib/restaurantAuth";
import { validateRequiredString, validatePhoneNumber } from "./lib/validation";
import { Id } from "./_generated/dataModel";

// ==========================================
// RESTAURANT LOCATIONS - Multi-Location Support
// Enables franchise model: 1 restaurant brand → many locations
// ==========================================

// Get all locations for a restaurant
export const getByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurantLocations")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Get active locations for a restaurant
export const getActiveByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const locations = await ctx.db
      .query("restaurantLocations")
      .withIndex("by_active", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("isActive", true)
      )
      .collect();
    return locations;
  },
});

// Get location by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurantLocations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get location by ID
export const getById = query({
  args: { id: v.id("restaurantLocations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get primary location for a restaurant
export const getPrimary = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    // First check if restaurant has a defaultLocationId
    const restaurant = await ctx.db.get(args.restaurantId);
    if (restaurant?.defaultLocationId) {
      return await ctx.db.get(restaurant.defaultLocationId);
    }

    // Otherwise find the location marked as primary
    const locations = await ctx.db
      .query("restaurantLocations")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const primary = locations.find((loc) => loc.isPrimary);
    return primary || locations[0] || null;
  },
});

// Get restaurants by city (for location-based browsing)
export const getByCity = query({
  args: {
    city: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurantLocations")
      .withIndex("by_city", (q) =>
        q.eq("city", args.city).eq("state", args.state)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Create a new location (restaurant owner only)
export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    acceptingOrders: v.optional(v.boolean()),
    estimatedPickupTime: v.optional(v.number()),
    operatingHours: v.optional(v.any()),
    isOpenLateNight: v.optional(v.boolean()),
    lateNightDays: v.optional(v.array(v.string())),
    hasParking: v.optional(v.boolean()),
    parkingDetails: v.optional(v.string()),
    isAccessible: v.optional(v.boolean()),
    seatingCapacity: v.optional(v.number()),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify user owns the restaurant
    await requireRestaurantOwner(ctx, args.restaurantId);

    // Validate inputs
    validateRequiredString(args.name, "Location name", { maxLength: 100 });
    validateRequiredString(args.address, "Address", { maxLength: 500 });
    validateRequiredString(args.city, "City", { maxLength: 100 });
    validateRequiredString(args.state, "State", { maxLength: 50 });
    validateRequiredString(args.zipCode, "ZIP code", { maxLength: 20 });
    if (args.phone) {
      validatePhoneNumber(args.phone, "Phone number");
    }

    // Generate slug from restaurant slug + location name
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const locationSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${restaurant.slug}-${locationSlug}`;

    // Check if this is the first location (make it primary)
    const existingLocations = await ctx.db
      .query("restaurantLocations")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const isFirstLocation = existingLocations.length === 0;
    const isPrimary = args.isPrimary ?? isFirstLocation;

    // If setting this as primary, unset other primaries
    if (isPrimary) {
      for (const loc of existingLocations) {
        if (loc.isPrimary) {
          await ctx.db.patch(loc._id, { isPrimary: false });
        }
      }
    }

    const now = Date.now();
    const locationId = await ctx.db.insert("restaurantLocations", {
      restaurantId: args.restaurantId,
      name: args.name.trim(),
      slug,
      address: args.address.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      zipCode: args.zipCode.trim(),
      phone: args.phone?.trim(),
      email: args.email?.trim(),
      acceptingOrders: args.acceptingOrders ?? true,
      estimatedPickupTime: args.estimatedPickupTime ?? 30,
      operatingHours: args.operatingHours,
      isOpenLateNight: args.isOpenLateNight ?? false,
      lateNightDays: args.lateNightDays,
      hasParking: args.hasParking,
      parkingDetails: args.parkingDetails,
      isAccessible: args.isAccessible,
      seatingCapacity: args.seatingCapacity,
      coordinates: args.coordinates,
      isPrimary,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // If this is the first/primary location, update the restaurant's defaultLocationId
    if (isPrimary) {
      await ctx.db.patch(args.restaurantId, {
        defaultLocationId: locationId,
        updatedAt: now,
      });
    }

    return locationId;
  },
});

// Update a location
export const update = mutation({
  args: {
    id: v.id("restaurantLocations"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    acceptingOrders: v.optional(v.boolean()),
    estimatedPickupTime: v.optional(v.number()),
    operatingHours: v.optional(v.any()),
    isOpenLateNight: v.optional(v.boolean()),
    lateNightDays: v.optional(v.array(v.string())),
    hasParking: v.optional(v.boolean()),
    parkingDetails: v.optional(v.string()),
    isAccessible: v.optional(v.boolean()),
    seatingCapacity: v.optional(v.number()),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    isPrimary: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.id);
    if (!location) {
      throw new Error("Location not found");
    }

    // Verify user owns the restaurant
    await requireRestaurantOwner(ctx, location.restaurantId);

    // Validate inputs if provided
    if (args.name) {
      validateRequiredString(args.name, "Location name", { maxLength: 100 });
    }
    if (args.address) {
      validateRequiredString(args.address, "Address", { maxLength: 500 });
    }
    if (args.phone) {
      validatePhoneNumber(args.phone, "Phone number");
    }

    // If setting this as primary, unset other primaries
    if (args.isPrimary) {
      const locations = await ctx.db
        .query("restaurantLocations")
        .withIndex("by_restaurant", (q) =>
          q.eq("restaurantId", location.restaurantId)
        )
        .collect();

      for (const loc of locations) {
        if (loc._id !== args.id && loc.isPrimary) {
          await ctx.db.patch(loc._id, { isPrimary: false });
        }
      }

      // Update restaurant's defaultLocationId
      await ctx.db.patch(location.restaurantId, {
        defaultLocationId: args.id,
        updatedAt: Date.now(),
      });
    }

    const { id, ...updateData } = args;
    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete a location (soft delete - sets isActive to false)
export const remove = mutation({
  args: { id: v.id("restaurantLocations") },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.id);
    if (!location) {
      throw new Error("Location not found");
    }

    // Verify user owns the restaurant
    await requireRestaurantOwner(ctx, location.restaurantId);

    // Check if this is the only active location
    const activeLocations = await ctx.db
      .query("restaurantLocations")
      .withIndex("by_active", (q) =>
        q.eq("restaurantId", location.restaurantId).eq("isActive", true)
      )
      .collect();

    if (activeLocations.length <= 1) {
      throw new Error("Cannot delete the last location. Add another location first.");
    }

    // If this was the primary location, set another as primary
    if (location.isPrimary) {
      const nextPrimary = activeLocations.find((loc) => loc._id !== args.id);
      if (nextPrimary) {
        await ctx.db.patch(nextPrimary._id, { isPrimary: true });
        await ctx.db.patch(location.restaurantId, {
          defaultLocationId: nextPrimary._id,
          updatedAt: Date.now(),
        });
      }
    }

    // Soft delete
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Hard delete a location (permanent - admin only)
export const hardDelete = mutation({
  args: { id: v.id("restaurantLocations") },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.id);
    if (!location) {
      throw new Error("Location not found");
    }

    // Verify user owns the restaurant
    await requireRestaurantOwner(ctx, location.restaurantId);

    // Remove from database
    await ctx.db.delete(args.id);

    return args.id;
  },
});

// Internal mutation for migration
export const createFromMigration = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    slug: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.optional(v.string()),
    acceptingOrders: v.boolean(),
    estimatedPickupTime: v.number(),
    operatingHours: v.optional(v.any()),
    isOpenLateNight: v.optional(v.boolean()),
    lateNightDays: v.optional(v.array(v.string())),
    isPrimary: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const locationId = await ctx.db.insert("restaurantLocations", {
      ...args,
      updatedAt: now,
    });
    return locationId;
  },
});
