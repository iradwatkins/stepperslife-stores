import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "../lib/auth";
import { Id } from "../_generated/dataModel";

/**
 * Admin Restaurant Image Upload Mutations
 *
 * These mutations allow SteppersLife admins to manage restaurant images:
 * - Logo
 * - Cover image
 * - Food photos gallery (up to 10)
 */

/**
 * Upload/update restaurant logo (admin)
 */
export const adminUploadRestaurantLogo = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    logoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    await ctx.db.patch(args.restaurantId, {
      logoUrl: args.logoUrl,
    });

    return {
      success: true,
      message: "Restaurant logo updated",
    };
  },
});

/**
 * Upload/update restaurant cover image (admin)
 */
export const adminUploadRestaurantCover = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    coverImageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    await ctx.db.patch(args.restaurantId, {
      coverImageUrl: args.coverImageUrl,
    });

    return {
      success: true,
      message: "Restaurant cover image updated",
    };
  },
});

/**
 * Add a food photo to restaurant gallery (admin)
 * Max 10 photos per restaurant
 */
export const adminAddFoodPhoto = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    storageId: v.id("_storage"),
    url: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const currentPhotos = restaurant.foodPhotos || [];

    // Enforce max 10 photos
    if (currentPhotos.length >= 10) {
      throw new Error("Maximum of 10 food photos allowed. Please remove a photo before adding a new one.");
    }

    const newPhoto = {
      storageId: args.storageId,
      url: args.url,
      caption: args.caption,
      uploadedAt: Date.now(),
      uploadedBy: admin._id,
      isAdminUploaded: true,
    };

    await ctx.db.patch(args.restaurantId, {
      foodPhotos: [...currentPhotos, newPhoto],
    });

    return {
      success: true,
      message: "Food photo added to gallery",
      photoCount: currentPhotos.length + 1,
    };
  },
});

/**
 * Remove a food photo from restaurant gallery (admin)
 */
export const adminRemoveFoodPhoto = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const currentPhotos = restaurant.foodPhotos || [];
    const updatedPhotos = currentPhotos.filter(
      (photo) => photo.storageId !== args.storageId
    );

    if (updatedPhotos.length === currentPhotos.length) {
      throw new Error("Photo not found in gallery");
    }

    await ctx.db.patch(args.restaurantId, {
      foodPhotos: updatedPhotos,
    });

    return {
      success: true,
      message: "Food photo removed from gallery",
      photoCount: updatedPhotos.length,
    };
  },
});

/**
 * Update food photo caption (admin)
 */
export const adminUpdateFoodPhotoCaption = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    storageId: v.id("_storage"),
    caption: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const currentPhotos = restaurant.foodPhotos || [];
    const photoIndex = currentPhotos.findIndex(
      (photo) => photo.storageId === args.storageId
    );

    if (photoIndex === -1) {
      throw new Error("Photo not found in gallery");
    }

    const updatedPhotos = [...currentPhotos];
    updatedPhotos[photoIndex] = {
      ...updatedPhotos[photoIndex],
      caption: args.caption,
    };

    await ctx.db.patch(args.restaurantId, {
      foodPhotos: updatedPhotos,
    });

    return {
      success: true,
      message: "Photo caption updated",
    };
  },
});

/**
 * Reorder food photos in gallery (admin)
 * Takes array of storageIds in desired order
 */
export const adminReorderFoodPhotos = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    photoOrder: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const currentPhotos = restaurant.foodPhotos || [];

    // Create a map of storageId to photo object
    const photoMap = new Map(
      currentPhotos.map((photo) => [photo.storageId, photo])
    );

    // Reorder based on provided order
    const reorderedPhotos = args.photoOrder
      .map((storageId) => photoMap.get(storageId))
      .filter((photo): photo is NonNullable<typeof photo> => photo !== undefined);

    // Validate all photos were found
    if (reorderedPhotos.length !== currentPhotos.length) {
      throw new Error("Invalid photo order - some photos not found");
    }

    await ctx.db.patch(args.restaurantId, {
      foodPhotos: reorderedPhotos,
    });

    return {
      success: true,
      message: "Photo order updated",
    };
  },
});

/**
 * Get restaurant with images (for admin image manager)
 */
export const getRestaurantImages = query({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      return null;
    }

    return {
      id: restaurant._id,
      name: restaurant.name,
      logoUrl: restaurant.logoUrl,
      coverImageUrl: restaurant.coverImageUrl,
      foodPhotos: restaurant.foodPhotos || [],
    };
  },
});

/**
 * Bulk update all restaurant images (admin)
 */
export const adminBulkUpdateRestaurantImages = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    logoUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    foodPhotos: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      url: v.string(),
      caption: v.optional(v.string()),
      uploadedAt: v.number(),
      uploadedBy: v.optional(v.id("users")),
      isAdminUploaded: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (args.logoUrl !== undefined) {
      updates.logoUrl = args.logoUrl;
    }

    if (args.coverImageUrl !== undefined) {
      updates.coverImageUrl = args.coverImageUrl;
    }

    if (args.foodPhotos !== undefined) {
      // Enforce max 10 photos
      if (args.foodPhotos.length > 10) {
        throw new Error("Maximum of 10 food photos allowed");
      }
      updates.foodPhotos = args.foodPhotos;
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, message: "No changes to save" };
    }

    await ctx.db.patch(args.restaurantId, updates);

    return {
      success: true,
      message: "Restaurant images updated",
    };
  },
});

/**
 * Get restaurants with missing images (for bulk upload dashboard)
 */
export const getRestaurantsNeedingImages = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();

    return restaurants
      .filter((r) => {
        const hasLogo = !!r.logoUrl;
        const hasCover = !!r.coverImageUrl;
        const hasFoodPhotos = (r.foodPhotos?.length || 0) > 0;
        // Return if missing any images
        return !hasLogo || !hasCover || !hasFoodPhotos;
      })
      .map((r) => ({
        id: r._id,
        name: r.name,
        slug: r.slug,
        hasLogo: !!r.logoUrl,
        hasCover: !!r.coverImageUrl,
        foodPhotoCount: r.foodPhotos?.length || 0,
      }));
  },
});
