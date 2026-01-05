import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Create a new room template
 */
export const createRoomTemplate = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("theater"),
      v.literal("stadium"),
      v.literal("concert"),
      v.literal("conference"),
      v.literal("outdoor"),
      v.literal("wedding"),
      v.literal("gala"),
      v.literal("banquet"),
      v.literal("custom")
    ),
    seatingStyle: v.union(v.literal("ROW_BASED"), v.literal("TABLE_BASED"), v.literal("MIXED")),
    estimatedCapacity: v.number(),
    sections: v.array(v.any()),
    isPublic: v.boolean(),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for creating templates
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to create room templates.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    const userId = user._id;

    const now = Date.now();

    const templateId = await ctx.db.insert("roomTemplates", {
      name: args.name,
      description: args.description,
      category: args.category,
      seatingStyle: args.seatingStyle,
      estimatedCapacity: args.estimatedCapacity,
      sections: args.sections,
      createdBy: userId,
      isPublic: args.isPublic,
      isSystemTemplate: false,
      thumbnailUrl: args.thumbnailUrl,
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

/**
 * Update an existing room template
 */
export const updateRoomTemplate = mutation({
  args: {
    templateId: v.id("roomTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
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
        v.literal("custom")
      )
    ),
    seatingStyle: v.optional(
      v.union(v.literal("ROW_BASED"), v.literal("TABLE_BASED"), v.literal("MIXED"))
    ),
    estimatedCapacity: v.optional(v.number()),
    sections: v.optional(v.array(v.any())),
    isPublic: v.optional(v.boolean()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to update templates.");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check if user owns this template
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found.");
    }

    if (template.createdBy !== user._id) {
      throw new Error("Not authorized to update this template");
    }

    // Cannot update system templates
    if (template.isSystemTemplate) {
      throw new Error("Cannot update system templates");
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.seatingStyle !== undefined) updates.seatingStyle = args.seatingStyle;
    if (args.estimatedCapacity !== undefined) updates.estimatedCapacity = args.estimatedCapacity;
    if (args.sections !== undefined) updates.sections = args.sections;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.thumbnailUrl !== undefined) updates.thumbnailUrl = args.thumbnailUrl;

    await ctx.db.patch(args.templateId, updates);

    return args.templateId;
  },
});

/**
 * Delete a room template
 */
export const deleteRoomTemplate = mutation({
  args: {
    templateId: v.id("roomTemplates"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to delete templates.");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check if user owns this template
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found.");
    }

    if (template.createdBy !== user._id) {
      throw new Error("Not authorized to delete this template");
    }

    // Cannot delete system templates
    if (template.isSystemTemplate) {
      throw new Error("Cannot delete system templates");
    }

    await ctx.db.delete(args.templateId);

    return { success: true };
  },
});

/**
 * Clone a template (create a copy)
 */
export const cloneRoomTemplate = mutation({
  args: {
    templateId: v.id("roomTemplates"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to clone templates.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found.");
    }

    const userId = user._id;

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check access to source template
    if (!template.isPublic && template.createdBy !== userId) {
      throw new Error("Not authorized to clone this template");
    }

    const now = Date.now();

    // Create a copy
    const newTemplateId = await ctx.db.insert("roomTemplates", {
      name: args.name || `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      seatingStyle: template.seatingStyle,
      estimatedCapacity: template.estimatedCapacity,
      sections: template.sections,
      createdBy: userId,
      isPublic: false, // Cloned templates are private by default
      isSystemTemplate: false,
      thumbnailUrl: template.thumbnailUrl,
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
    });

    return newTemplateId;
  },
});

/**
 * Increment template usage counter
 */
export const incrementTemplateUsage = mutation({
  args: {
    templateId: v.id("roomTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return;

    await ctx.db.patch(args.templateId, {
      timesUsed: (template.timesUsed || 0) + 1,
    });
  },
});
