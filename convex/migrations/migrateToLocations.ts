import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Migration: Convert flat restaurant addresses to multi-location model
 *
 * This migration:
 * 1. For each restaurant WITHOUT a defaultLocationId
 * 2. Creates a restaurantLocation with the restaurant's address data
 * 3. Sets the new location as the restaurant's defaultLocationId
 *
 * Run with: npx convex run migrations/migrateToLocations:migrateAll
 */

// Get all restaurants that need migration
export const getRestaurantsToMigrate = internalQuery({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();

    // Filter to restaurants without a defaultLocationId
    // AND with address data (the old flat fields)
    return restaurants.filter(
      (r) => !r.defaultLocationId && r.address && r.city && r.state
    );
  },
});

// Migrate a single restaurant to the multi-location model
export const migrateRestaurant = internalMutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      console.log(`Restaurant ${args.restaurantId} not found, skipping`);
      return null;
    }

    // Check if already migrated
    if (restaurant.defaultLocationId) {
      console.log(`Restaurant ${restaurant.name} already has a location, skipping`);
      return null;
    }

    // Check for required address fields
    if (!restaurant.address || !restaurant.city || !restaurant.state) {
      console.log(`Restaurant ${restaurant.name} missing address data, skipping`);
      return null;
    }

    // Create the primary location from restaurant's flat address fields
    const now = Date.now();
    const locationSlug = `${restaurant.slug}-main`;

    const locationId = await ctx.db.insert("restaurantLocations", {
      restaurantId: args.restaurantId,
      name: "Main Location",
      slug: locationSlug,
      address: restaurant.address,
      city: restaurant.city,
      state: restaurant.state,
      zipCode: restaurant.zipCode || "",
      phone: restaurant.phone,
      acceptingOrders: restaurant.acceptingOrders ?? true,
      estimatedPickupTime: restaurant.estimatedPickupTime ?? 30,
      operatingHours: restaurant.operatingHours,
      isOpenLateNight: restaurant.isOpenLateNight,
      lateNightDays: restaurant.lateNightDays,
      isPrimary: true,
      isActive: restaurant.isActive ?? true,
      createdAt: restaurant.createdAt || now,
      updatedAt: now,
    });

    // Update restaurant with the new defaultLocationId
    await ctx.db.patch(args.restaurantId, {
      defaultLocationId: locationId,
      updatedAt: now,
    });

    console.log(
      `Migrated restaurant "${restaurant.name}" → location "${locationSlug}"`
    );

    return locationId;
  },
});

// Migrate all restaurants (batch process)
export const migrateAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();

    // Filter to restaurants that need migration
    const toMigrate = restaurants.filter(
      (r) => !r.defaultLocationId && r.address && r.city && r.state
    );

    console.log(`Found ${toMigrate.length} restaurants to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const restaurant of toMigrate) {
      try {
        const now = Date.now();
        const locationSlug = `${restaurant.slug}-main`;

        // Create location
        const locationId = await ctx.db.insert("restaurantLocations", {
          restaurantId: restaurant._id,
          name: "Main Location",
          slug: locationSlug,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          zipCode: restaurant.zipCode || "",
          phone: restaurant.phone,
          acceptingOrders: restaurant.acceptingOrders ?? true,
          estimatedPickupTime: restaurant.estimatedPickupTime ?? 30,
          operatingHours: restaurant.operatingHours,
          isOpenLateNight: restaurant.isOpenLateNight,
          lateNightDays: restaurant.lateNightDays,
          isPrimary: true,
          isActive: restaurant.isActive ?? true,
          createdAt: restaurant.createdAt || now,
          updatedAt: now,
        });

        // Update restaurant
        await ctx.db.patch(restaurant._id, {
          defaultLocationId: locationId,
          updatedAt: now,
        });

        migrated++;
        console.log(`[${migrated}/${toMigrate.length}] Migrated: ${restaurant.name}`);
      } catch (error) {
        console.error(`Failed to migrate ${restaurant.name}:`, error);
        skipped++;
      }
    }

    return {
      total: restaurants.length,
      migrated,
      skipped,
      alreadyMigrated: restaurants.length - toMigrate.length,
    };
  },
});

// Verify migration status
export const checkMigrationStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();
    const locations = await ctx.db.query("restaurantLocations").collect();

    const withLocation = restaurants.filter((r) => r.defaultLocationId);
    const withoutLocation = restaurants.filter((r) => !r.defaultLocationId);
    const needsMigration = withoutLocation.filter(
      (r) => r.address && r.city && r.state
    );

    return {
      totalRestaurants: restaurants.length,
      totalLocations: locations.length,
      restaurantsWithLocation: withLocation.length,
      restaurantsWithoutLocation: withoutLocation.length,
      needsMigration: needsMigration.length,
      migrationComplete: needsMigration.length === 0,
      restaurantNames: {
        migrated: withLocation.map((r) => r.name),
        needsMigration: needsMigration.map((r) => r.name),
      },
    };
  },
});
