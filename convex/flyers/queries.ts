import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get recent uploaded flyers for admin dashboard
 */
export const getRecentFlyers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 8;

    const flyers = await ctx.db.query("uploadedFlyers").order("desc").take(limit);

    return flyers;
  },
});

/**
 * Get draft/unpublished flyers for admin review
 * Only returns flyers where eventCreated === false
 */
export const getDraftFlyers = query({
  args: {},
  handler: async (ctx) => {
    const flyers = await ctx.db
      .query("uploadedFlyers")
      .filter((q) => q.eq(q.field("eventCreated"), false))
      .order("desc")
      .collect();

    return flyers;
  },
});

/**
 * Get a single flyer by ID
 */
export const getFlyerById = query({
  args: {
    flyerId: v.id("uploadedFlyers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.flyerId);
  },
});

/**
 * Find a flyer by file hash (for duplicate detection)
 */
export const getFlyerByHash = query({
  args: {
    fileHash: v.string(),
  },
  handler: async (ctx, args) => {
    const flyer = await ctx.db
      .query("uploadedFlyers")
      .filter((q) => q.eq(q.field("fileHash"), args.fileHash))
      .first();

    return flyer;
  },
});

/**
 * Get ALL flyers (for bulk operations like delete all)
 */
export const getAllFlyers = query({
  args: {},
  handler: async (ctx) => {
    const flyers = await ctx.db.query("uploadedFlyers").collect();

    return flyers;
  },
});
