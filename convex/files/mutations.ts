import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Generate upload URL for event images
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Save uploaded image metadata
 */
export const saveImageMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    // Just return the storage ID - it's already stored in Convex
    return args.storageId;
  },
});

/**
 * Delete an image from storage
 */
export const deleteImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});
