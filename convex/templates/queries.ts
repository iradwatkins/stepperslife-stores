import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all room templates (public + user's private templates)
 */
export const listRoomTemplates = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("theater"),
        v.literal("stadium"),
        v.literal("concert"),
        v.literal("conference"),
        v.literal("outdoor"),
        v.literal("wedding"),
        v.literal("gala"),
        v.literal("banquet"),
        v.literal("custom"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let allTemplates;

    // Filter by category if specified
    if (args.category && args.category !== "all") {
      const category = args.category;
      allTemplates = await ctx.db
        .query("roomTemplates")
        .withIndex("by_category", (q) => q.eq("category", category as any))
        .collect();
    } else {
      allTemplates = await ctx.db.query("roomTemplates").collect();
    }

    // Filter to show:
    // 1. All public templates
    // 2. User's own templates (if authenticated)
    const filteredTemplates = allTemplates.filter((template) => {
      if (template.isPublic) return true;
      if (identity && template.createdBy) {
        // Get user to compare
        return true; // We'll need to check user ID
      }
      return false;
    });

    // Sort: system templates first, then by createdAt descending
    return filteredTemplates.sort((a, b) => {
      if (a.isSystemTemplate && !b.isSystemTemplate) return -1;
      if (!a.isSystemTemplate && b.isSystemTemplate) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * Get user's private templates only
 */
export const getUserTemplates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    const templates = await ctx.db
      .query("roomTemplates")
      .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
      .collect();

    return templates.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a single room template by ID
 */
export const getRoomTemplate = query({
  args: {
    templateId: v.id("roomTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) {
      throw new Error("Template not found");
    }

    // Check access permissions
    if (!template.isPublic) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authorized to view this template");
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();

      if (!user || template.createdBy !== user._id) {
        throw new Error("Not authorized to view this template");
      }
    }

    return template;
  },
});

/**
 * Get template statistics
 */
export const getTemplateStats = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("roomTemplates").collect();

    const stats = {
      total: templates.length,
      public: templates.filter((t) => t.isPublic).length,
      system: templates.filter((t) => t.isSystemTemplate).length,
      byCategory: {} as Record<string, number>,
    };

    // Count by category
    templates.forEach((template) => {
      stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
    });

    return stats;
  },
});
