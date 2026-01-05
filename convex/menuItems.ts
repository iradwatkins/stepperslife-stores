import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  validatePrice,
  validateRequiredString,
  validateSortOrder,
} from "./lib/validation";
import {
  canAddMenuItem,
  canAddCategory,
  getDefaultPlanTier,
  type RestaurantPlanTier
} from "./lib/restaurantPlans";

// Helper to verify restaurant ownership
async function verifyRestaurantOwnership(
  ctx: { db: any; auth: any },
  restaurantId: Id<"restaurants">
): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  // Get user by email from identity
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .first();

  if (!user) return false;

  // Get restaurant and check ownership
  const restaurant = await ctx.db.get(restaurantId);
  if (!restaurant) return false;

  return restaurant.ownerId === user._id;
}

// Get menu categories for restaurant
export const getCategories = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuCategories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Get menu items for restaurant
export const getByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Get menu items by category
export const getByCategory = query({
  args: { categoryId: v.id("menuCategories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
  },
});

// Create menu category
export const createCategory = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    validateRequiredString(args.name, "Category name", { maxLength: 100 });
    validateSortOrder(args.sortOrder, "Sort order");

    if (args.description) {
      validateRequiredString(args.description, "Description", { minLength: 0, maxLength: 500 });
    }

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, args.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    // Check subscription plan limits
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Get current category count
    const existingCategories = await ctx.db
      .query("menuCategories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    // Check if plan allows adding more categories
    const planTier = (restaurant.subscriptionTier || getDefaultPlanTier()) as RestaurantPlanTier;
    const planCheck = canAddCategory(planTier, existingCategories.length);

    if (!planCheck.allowed) {
      throw new Error(planCheck.message || `Category limit reached for your plan. Upgrade to add more categories.`);
    }

    const now = Date.now();
    return await ctx.db.insert("menuCategories", {
      ...args,
      name: args.name.trim(),
      description: args.description?.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create menu item
export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    categoryId: v.optional(v.id("menuCategories")),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    validateRequiredString(args.name, "Menu item name", { maxLength: 200 });
    validatePrice(args.price, "Menu item price");
    validateSortOrder(args.sortOrder, "Sort order");

    if (args.description) {
      validateRequiredString(args.description, "Description", { minLength: 0, maxLength: 1000 });
    }

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, args.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    // Check subscription plan limits
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Get current menu item count
    const existingItems = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    // Check if plan allows adding more items
    const planTier = (restaurant.subscriptionTier || getDefaultPlanTier()) as RestaurantPlanTier;
    const planCheck = canAddMenuItem(planTier, existingItems.length);

    if (!planCheck.allowed) {
      throw new Error(planCheck.message || `Menu item limit reached for your plan. Upgrade to add more items.`);
    }

    const now = Date.now();
    return await ctx.db.insert("menuItems", {
      ...args,
      name: args.name.trim(),
      description: args.description?.trim(),
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update menu item
export const update = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    categoryId: v.optional(v.id("menuCategories")),
    isAvailable: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate inputs if provided
    if (args.name !== undefined) {
      validateRequiredString(args.name, "Menu item name", { maxLength: 200 });
    }
    if (args.price !== undefined) {
      validatePrice(args.price, "Menu item price");
    }
    if (args.sortOrder !== undefined) {
      validateSortOrder(args.sortOrder, "Sort order");
    }
    if (args.description !== undefined && args.description !== null) {
      validateRequiredString(args.description, "Description", { minLength: 0, maxLength: 1000 });
    }

    // Get the menu item to check restaurant ownership
    const menuItem = await ctx.db.get(args.id);
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, menuItem.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      name: args.name?.trim(),
      description: args.description?.trim(),
      updatedAt: Date.now(),
    });
  },
});

// Toggle item availability
export const toggleAvailability = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Menu item not found");

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, item.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    return await ctx.db.patch(args.id, {
      isAvailable: !item.isAvailable,
      updatedAt: Date.now(),
    });
  },
});

// Delete menu item
export const remove = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Menu item not found");

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, item.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    return await ctx.db.delete(args.id);
  },
});

// Update menu category
export const updateCategory = mutation({
  args: {
    id: v.id("menuCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the category to check restaurant ownership
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, category.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Duplicate menu item
export const duplicate = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Menu item not found");

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, item.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    // Check subscription plan limits
    const restaurant = await ctx.db.get(item.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Get current menu item count
    const existingItems = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", item.restaurantId))
      .collect();

    // Check if plan allows adding more items
    const planTier = (restaurant.subscriptionTier || getDefaultPlanTier()) as RestaurantPlanTier;
    const planCheck = canAddMenuItem(planTier, existingItems.length);

    if (!planCheck.allowed) {
      throw new Error(planCheck.message || `Menu item limit reached for your plan. Upgrade to add more items.`);
    }

    const now = Date.now();
    return await ctx.db.insert("menuItems", {
      restaurantId: item.restaurantId,
      categoryId: item.categoryId,
      name: `${item.name} (Copy)`,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      sortOrder: item.sortOrder + 1,
      isAvailable: false, // Start as unavailable so they can review before publishing
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Delete menu category
export const removeCategory = mutation({
  args: { id: v.id("menuCategories") },
  handler: async (ctx, args) => {
    // Get the category to check restaurant ownership
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, category.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    // Check if there are any items in this category
    const itemsInCategory = await ctx.db
      .query("menuItems")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (itemsInCategory) {
      throw new Error("Cannot delete category with items. Move or delete items first.");
    }

    return await ctx.db.delete(args.id);
  },
});

// Get restaurant owned by user
export const getRestaurantByOwner = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
  },
});

/**
 * Internal mutation to create a menu category (for admin setup)
 */
export const createCategoryInternal = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("menuCategories", {
      ...args,
      name: args.name.trim(),
      description: args.description?.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal mutation to create a menu item (for admin setup)
 */
export const createInternal = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    categoryId: v.optional(v.id("menuCategories")),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("menuItems", {
      ...args,
      name: args.name.trim(),
      description: args.description?.trim(),
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Internal mutation to update menu item without auth (for setup scripts)
export const updateInternal = internalMutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    categoryId: v.optional(v.id("menuCategories")),
    isAvailable: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Reorder menu items within a category
export const reorderMenuItems = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.id("menuItems"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) return;

    // Get the first item to determine the restaurant for ownership check
    const firstItem = await ctx.db.get(args.items[0].id);
    if (!firstItem) {
      throw new Error("Menu item not found");
    }

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, firstItem.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    // Update all items with their new sort orders
    const now = Date.now();
    await Promise.all(
      args.items.map(({ id, sortOrder }) =>
        ctx.db.patch(id, { sortOrder, updatedAt: now })
      )
    );
  },
});

// Reorder menu categories
export const reorderMenuCategories = mutation({
  args: {
    categories: v.array(
      v.object({
        id: v.id("menuCategories"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.categories.length === 0) return;

    // Get the first category to determine the restaurant for ownership check
    const firstCategory = await ctx.db.get(args.categories[0].id);
    if (!firstCategory) {
      throw new Error("Category not found");
    }

    // Verify ownership
    const isOwner = await verifyRestaurantOwnership(ctx, firstCategory.restaurantId);
    if (!isOwner) {
      throw new Error("Unauthorized: You do not own this restaurant");
    }

    // Update all categories with their new sort orders
    const now = Date.now();
    await Promise.all(
      args.categories.map(({ id, sortOrder }) =>
        ctx.db.patch(id, { sortOrder, updatedAt: now })
      )
    );
  },
});
