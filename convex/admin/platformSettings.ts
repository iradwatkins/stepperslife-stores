import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Get a single platform setting by key
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting;
  },
});

// Get all platform settings
export const getAllSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("platformSettings").collect();
    return settings;
  },
});

// Get a setting value with default fallback
export const getSettingValue = query({
  args: {
    key: v.string(),
    defaultValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting?.value ?? args.defaultValue ?? null;
  },
});

// Set/update a platform setting
export const setSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    type: v.optional(v.union(
      v.literal("string"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("json")
    )),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();
      userId = user?._id;
    }

    // Check if setting already exists
    const existingSetting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existingSetting) {
      // Update existing setting
      await ctx.db.patch(existingSetting._id, {
        value: args.value,
        type: args.type ?? existingSetting.type,
        description: args.description ?? existingSetting.description,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return existingSetting._id;
    } else {
      // Create new setting
      const id = await ctx.db.insert("platformSettings", {
        key: args.key,
        value: args.value,
        type: args.type ?? "string",
        description: args.description,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return id;
    }
  },
});

// Update multiple settings at once
export const updateSettings = mutation({
  args: {
    settings: v.array(v.object({
      key: v.string(),
      value: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();
      userId = user?._id;
    }

    const results = [];
    for (const setting of args.settings) {
      const existing = await ctx.db
        .query("platformSettings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: setting.value,
          updatedAt: Date.now(),
          updatedBy: userId,
        });
        results.push({ key: setting.key, action: "updated", id: existing._id });
      } else {
        const id = await ctx.db.insert("platformSettings", {
          key: setting.key,
          value: setting.value,
          type: "string",
          updatedAt: Date.now(),
          updatedBy: userId,
        });
        results.push({ key: setting.key, action: "created", id });
      }
    }

    return results;
  },
});

// Initialize default platform settings
export const initializeDefaultSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultSettings = [
      {
        key: "platform_name",
        value: "Steppers Life Events",
        type: "string" as const,
        description: "The platform display name",
      },
      {
        key: "support_email",
        value: "support@stepperslife.com",
        type: "string" as const,
        description: "Support email address",
      },
      {
        key: "platform_fee_percent",
        value: "10",
        type: "number" as const,
        description: "Default platform fee percentage per ticket sale",
      },
      {
        key: "organizer_credits",
        value: "100",
        type: "number" as const,
        description: "Default credits given to new organizers",
      },
      {
        key: "max_file_upload_mb",
        value: "5",
        type: "number" as const,
        description: "Maximum file upload size in megabytes",
      },
    ];

    const results = [];
    for (const setting of defaultSettings) {
      const existing = await ctx.db
        .query("platformSettings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("platformSettings", {
          ...setting,
          updatedAt: Date.now(),
        });
        results.push({ key: setting.key, action: "created", id });
      } else {
        results.push({ key: setting.key, action: "exists", id: existing._id });
      }
    }

    return results;
  },
});

// Delete a platform setting (admin only)
export const deleteSetting = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (setting) {
      await ctx.db.delete(setting._id);
      return { success: true, deleted: args.key };
    }

    return { success: false, error: "Setting not found" };
  },
});
