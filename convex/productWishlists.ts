import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

// Get user's wishlist products
export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return [];
    }

    const wishlistItems = await ctx.db
      .query("productWishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Get product details for each wishlist item
    const productsWithDetails = await Promise.all(
      wishlistItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (!product || product.status !== "ACTIVE") {
          return null;
        }

        // Get vendor info
        let vendor = null;
        if (product.vendorId) {
          vendor = await ctx.db.get(product.vendorId);
        }

        // Get first image
        let imageUrl = product.primaryImage;
        if (!imageUrl && product.images && product.images.length > 0) {
          imageUrl = product.images[0];
        }

        return {
          ...item,
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            imageUrl,
            vendorId: product.vendorId,
            vendorName: vendor?.name,
            vendorSlug: vendor?.slug,
            inventory: product.inventoryQuantity,
            status: product.status,
          },
        };
      })
    );

    // Filter out null products (deleted or inactive)
    return productsWithDetails.filter((p) => p !== null);
  },
});

// Check if a product is in user's wishlist
export const isInWishlist = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return false;
    }

    const wishlistItem = await ctx.db
      .query("productWishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    return !!wishlistItem;
  },
});

// Toggle wishlist status (add or remove)
export const toggle = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Check if already in wishlist
    const existing = await ctx.db
      .query("productWishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      // Remove from wishlist
      await ctx.db.delete(existing._id);
      return { action: "removed", isInWishlist: false };
    } else {
      // Add to wishlist
      await ctx.db.insert("productWishlists", {
        userId: user._id,
        productId: args.productId,
        createdAt: Date.now(),
      });
      return { action: "added", isInWishlist: true };
    }
  },
});

// Add to wishlist
export const add = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Check if already in wishlist
    const existing = await ctx.db
      .query("productWishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("productWishlists", {
      userId: user._id,
      productId: args.productId,
      createdAt: Date.now(),
    });
  },
});

// Remove from wishlist
export const remove = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const existing = await ctx.db
      .query("productWishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Get wishlist count for user
export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return 0;
    }

    const wishlistItems = await ctx.db
      .query("productWishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return wishlistItems.length;
  },
});
