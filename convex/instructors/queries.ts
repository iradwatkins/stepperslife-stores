import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get all active instructors
 * Used for the instructor directory page
 */
export const getAll = query({
  args: {
    search: v.optional(v.string()),
    specialty: v.optional(v.string()),
    location: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let instructors = await ctx.db
      .query("instructors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Apply filters
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      instructors = instructors.filter(
        (i) =>
          i.name.toLowerCase().includes(searchLower) ||
          i.bio?.toLowerCase().includes(searchLower) ||
          i.location?.toLowerCase().includes(searchLower)
      );
    }

    if (args.specialty) {
      instructors = instructors.filter((i) =>
        i.specialties.some(
          (s) => s.toLowerCase() === args.specialty!.toLowerCase()
        )
      );
    }

    if (args.location) {
      instructors = instructors.filter(
        (i) =>
          i.location?.toLowerCase().includes(args.location!.toLowerCase())
      );
    }

    if (args.verifiedOnly) {
      instructors = instructors.filter((i) => i.verified);
    }

    // Sort: verified first, then by name
    instructors.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return instructors;
  },
});

/**
 * Get a single instructor by slug
 * Used for instructor profile page
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const instructor = await ctx.db
      .query("instructors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!instructor || !instructor.isActive) {
      return null;
    }

    return instructor;
  },
});

/**
 * Get featured instructors
 * Used for homepage spotlight
 */
export const getFeatured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 6;

    const instructors = await ctx.db
      .query("instructors")
      .withIndex("by_featured", (q) =>
        q.eq("featured", true).eq("isActive", true)
      )
      .take(limit);

    return instructors;
  },
});

/**
 * Get instructor by user ID
 * Used for organizers to check if they have an instructor profile
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("instructors")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get unique specialties for filter dropdown
 */
export const getSpecialties = query({
  args: {},
  handler: async (ctx) => {
    const instructors = await ctx.db
      .query("instructors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const specialtiesSet = new Set<string>();
    instructors.forEach((i) => {
      i.specialties.forEach((s) => specialtiesSet.add(s));
    });

    return Array.from(specialtiesSet).sort();
  },
});

/**
 * Get unique locations for filter dropdown
 */
export const getLocations = query({
  args: {},
  handler: async (ctx) => {
    const instructors = await ctx.db
      .query("instructors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const locationsSet = new Set<string>();
    instructors.forEach((i) => {
      if (i.location) locationsSet.add(i.location);
    });

    return Array.from(locationsSet).sort();
  },
});

/**
 * Get instructor count for directory stats
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allInstructors = await ctx.db
      .query("instructors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const verifiedCount = allInstructors.filter((i) => i.verified).length;

    const locationsSet = new Set<string>();
    allInstructors.forEach((i) => {
      if (i.location) locationsSet.add(i.location);
    });

    return {
      total: allInstructors.length,
      verified: verifiedCount,
      cities: locationsSet.size,
    };
  },
});
