import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ==========================================
// PRODUCT VARIATIONS - Query Functions
// ==========================================
// Inspired by Dokan Pro's ProductVariationController
// Provides read-only access to variation data

/**
 * Get all variations for a product
 * Used by vendor dashboard and product detail page
 */
export const getVariationsByProduct = query({
  args: {
    productId: v.id("products"),
    includeDisabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { productId, includeDisabled = false } = args;

    // Get product to verify it exists
    const product = await ctx.db.get(productId);
    if (!product) {
      return [];
    }

    // Query variations
    let variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    // Filter out disabled variations unless requested
    if (!includeDisabled) {
      variations = variations.filter((v) => v.isEnabled && v.status === "ACTIVE");
    }

    // Sort by menuOrder
    variations.sort((a, b) => a.menuOrder - b.menuOrder);

    return variations;
  },
});

/**
 * Get a single variation by ID
 */
export const getVariationById = query({
  args: {
    variationId: v.id("productVariations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.variationId);
  },
});

/**
 * Get variation by attribute combination
 * Used when customer selects options to find matching variation
 */
export const getVariationByAttributes = query({
  args: {
    productId: v.id("products"),
    attributes: v.any(), // { size: "M", color: "Blue" }
  },
  handler: async (ctx, args) => {
    const { productId, attributes } = args;

    // Get all enabled variations for this product
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .filter((q) =>
        q.and(q.eq(q.field("isEnabled"), true), q.eq(q.field("status"), "ACTIVE"))
      )
      .collect();

    // Find variation matching all attributes
    const matchingVariation = variations.find((variation) => {
      const varAttrs = variation.attributes as Record<string, string>;
      const reqAttrs = attributes as Record<string, string>;

      // Check if all required attributes match
      const reqKeys = Object.keys(reqAttrs);
      const varKeys = Object.keys(varAttrs);

      // Must have same number of attribute keys
      if (reqKeys.length !== varKeys.length) {
        return false;
      }

      // All values must match
      return reqKeys.every((key) => varAttrs[key] === reqAttrs[key]);
    });

    return matchingVariation || null;
  },
});

/**
 * Get variation inventory status
 * Returns in-stock, low-stock, or out-of-stock
 */
export const getVariationInventoryStatus = query({
  args: {
    variationId: v.id("productVariations"),
  },
  handler: async (ctx, args) => {
    const variation = await ctx.db.get(args.variationId);
    if (!variation) {
      return null;
    }

    const { inventoryQuantity, trackInventory, allowBackorder, lowStockThreshold } =
      variation;

    if (!trackInventory) {
      return { status: "in_stock", quantity: null };
    }

    if (inventoryQuantity <= 0) {
      return {
        status: allowBackorder ? "backorder" : "out_of_stock",
        quantity: inventoryQuantity,
      };
    }

    if (lowStockThreshold && inventoryQuantity <= lowStockThreshold) {
      return { status: "low_stock", quantity: inventoryQuantity };
    }

    return { status: "in_stock", quantity: inventoryQuantity };
  },
});

/**
 * Get price range for a variable product
 * Returns min and max prices across all variations
 */
export const getProductPriceRange = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) =>
        q.and(q.eq(q.field("isEnabled"), true), q.eq(q.field("status"), "ACTIVE"))
      )
      .collect();

    if (variations.length === 0) {
      // Fall back to parent product price
      const product = await ctx.db.get(args.productId);
      return product
        ? { minPrice: product.price, maxPrice: product.price, hasRange: false }
        : null;
    }

    const prices = variations.map((v) => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      minPrice,
      maxPrice,
      hasRange: minPrice !== maxPrice,
    };
  },
});

/**
 * Get total inventory across all variations
 * Used for parent product inventory aggregation
 */
export const getTotalVariationInventory = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) =>
        q.and(q.eq(q.field("isEnabled"), true), q.eq(q.field("status"), "ACTIVE"))
      )
      .collect();

    const totalQuantity = variations.reduce(
      (sum, v) => sum + (v.trackInventory ? v.inventoryQuantity : 0),
      0
    );

    const trackingCount = variations.filter((v) => v.trackInventory).length;

    return {
      totalQuantity,
      variationCount: variations.length,
      trackingInventoryCount: trackingCount,
    };
  },
});

/**
 * Get available attribute options for a product
 * Filters options based on what's actually available (in stock)
 */
export const getAvailableAttributeOptions = query({
  args: {
    productId: v.id("products"),
    selectedAttributes: v.optional(v.any()), // Already selected attributes
  },
  handler: async (ctx, args) => {
    const { productId, selectedAttributes = {} } = args;

    // Get product with attributes
    const product = await ctx.db.get(productId);
    if (!product || !product.attributes) {
      return [];
    }

    // Get all enabled variations
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .filter((q) =>
        q.and(q.eq(q.field("isEnabled"), true), q.eq(q.field("status"), "ACTIVE"))
      )
      .collect();

    // For each attribute, determine which values are available
    return product.attributes.map((attr) => {
      // Get variations matching selected attributes (except current attribute)
      const relevantVariations = variations.filter((variation) => {
        const varAttrs = variation.attributes as Record<string, string>;
        const selAttrs = selectedAttributes as Record<string, string>;

        // Check if variation matches all selected attributes except the current one
        return Object.entries(selAttrs).every(([key, value]) => {
          if (key === attr.slug) return true; // Skip current attribute
          return varAttrs[key] === value;
        });
      });

      // Get available values for this attribute
      const availableValues = attr.values.filter((value) => {
        return relevantVariations.some((v) => {
          const varAttrs = v.attributes as Record<string, string>;
          return varAttrs[attr.slug] === value && v.inventoryQuantity > 0;
        });
      });

      // Get all values with their stock status
      const valuesWithStock = attr.values.map((value) => {
        const matchingVariation = relevantVariations.find((v) => {
          const varAttrs = v.attributes as Record<string, string>;
          return varAttrs[attr.slug] === value;
        });

        return {
          value,
          available: matchingVariation
            ? matchingVariation.inventoryQuantity > 0 || matchingVariation.allowBackorder
            : false,
          inStock: matchingVariation ? matchingVariation.inventoryQuantity > 0 : false,
          variation: matchingVariation || null,
        };
      });

      return {
        ...attr,
        availableValues,
        valuesWithStock,
      };
    });
  },
});

/**
 * Search variations by SKU
 * Used for inventory management and order fulfillment
 */
export const searchVariationsBySku = query({
  args: {
    sku: v.string(),
    vendorId: v.optional(v.id("vendors")),
  },
  handler: async (ctx, args) => {
    const { sku, vendorId } = args;

    let query = ctx.db
      .query("productVariations")
      .withIndex("by_sku", (q) => q.eq("sku", sku));

    const variations = await query.collect();

    // Filter by vendor if specified
    if (vendorId) {
      return variations.filter((v) => v.vendorId === vendorId);
    }

    return variations;
  },
});

/**
 * Get variations for vendor dashboard
 * Includes product info for display
 */
export const getVendorVariations = query({
  args: {
    vendorId: v.id("vendors"),
    productId: v.optional(v.id("products")),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"))),
    lowStockOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { vendorId, productId, status, lowStockOnly } = args;

    let variations = await ctx.db
      .query("productVariations")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
      .collect();

    // Filter by product if specified
    if (productId) {
      variations = variations.filter((v) => v.productId === productId);
    }

    // Filter by status if specified
    if (status) {
      variations = variations.filter((v) => v.status === status);
    }

    // Filter low stock only
    if (lowStockOnly) {
      variations = variations.filter((v) => {
        if (!v.trackInventory) return false;
        const threshold = v.lowStockThreshold || 5;
        return v.inventoryQuantity <= threshold;
      });
    }

    // Enrich with product info
    const enrichedVariations = await Promise.all(
      variations.map(async (variation) => {
        const product = await ctx.db.get(variation.productId);
        return {
          ...variation,
          productName: product?.name || "Unknown Product",
          productImage: product?.primaryImage || null,
        };
      })
    );

    return enrichedVariations;
  },
});

/**
 * Get variation count for a product
 * Quick count without loading all data
 */
export const getVariationCount = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return {
      total: variations.length,
      active: variations.filter((v) => v.status === "ACTIVE" && v.isEnabled).length,
      draft: variations.filter((v) => v.status === "DRAFT").length,
      disabled: variations.filter((v) => !v.isEnabled).length,
    };
  },
});

/**
 * Validate if a variation combination is unique
 * Used before creating new variation
 */
export const isVariationCombinationUnique = query({
  args: {
    productId: v.id("products"),
    attributes: v.any(),
    excludeVariationId: v.optional(v.id("productVariations")),
  },
  handler: async (ctx, args) => {
    const { productId, attributes, excludeVariationId } = args;

    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    // Filter out the variation being edited (if updating)
    const otherVariations = excludeVariationId
      ? variations.filter((v) => v._id !== excludeVariationId)
      : variations;

    // Check if any existing variation has the same attributes
    const reqAttrs = attributes as Record<string, string>;
    const duplicate = otherVariations.find((variation) => {
      const varAttrs = variation.attributes as Record<string, string>;
      const reqKeys = Object.keys(reqAttrs);
      const varKeys = Object.keys(varAttrs);

      if (reqKeys.length !== varKeys.length) return false;
      return reqKeys.every((key) => varAttrs[key] === reqAttrs[key]);
    });

    return !duplicate;
  },
});
