import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ==========================================
// PRODUCT VARIATIONS - Mutation Functions
// ==========================================
// Inspired by Dokan Pro's ProductVariationController and dokan_save_variations()
// Handles all write operations for product variations

/**
 * Create a single variation
 */
export const createVariation = mutation({
  args: {
    productId: v.id("products"),
    attributes: v.any(), // { size: "M", color: "Blue" }
    price: v.number(),
    sku: v.optional(v.string()),
    compareAtPrice: v.optional(v.number()),
    inventoryQuantity: v.number(),
    trackInventory: v.optional(v.boolean()),
    allowBackorder: v.optional(v.boolean()),
    lowStockThreshold: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    weight: v.optional(v.number()),
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),
    isVirtual: v.optional(v.boolean()),
    isDownloadable: v.optional(v.boolean()),
    downloadFiles: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          url: v.string(),
        })
      )
    ),
    downloadLimit: v.optional(v.number()),
    downloadExpiry: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      productId,
      attributes,
      price,
      sku,
      compareAtPrice,
      inventoryQuantity,
      trackInventory = true,
      allowBackorder = false,
      lowStockThreshold,
      imageUrl,
      weight,
      dimensions,
      isVirtual = false,
      isDownloadable = false,
      downloadFiles,
      downloadLimit,
      downloadExpiry,
      isEnabled = true,
    } = args;

    // Verify product exists and is VARIABLE type
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check for duplicate attribute combination
    const existingVariations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    const reqAttrs = attributes as Record<string, string>;
    const duplicate = existingVariations.find((variation) => {
      const varAttrs = variation.attributes as Record<string, string>;
      const reqKeys = Object.keys(reqAttrs);
      const varKeys = Object.keys(varAttrs);

      if (reqKeys.length !== varKeys.length) return false;
      return reqKeys.every((key) => varAttrs[key] === reqAttrs[key]);
    });

    if (duplicate) {
      throw new Error("A variation with this attribute combination already exists");
    }

    // Check SKU uniqueness if provided
    if (sku) {
      const existingSku = await ctx.db
        .query("productVariations")
        .withIndex("by_sku", (q) => q.eq("sku", sku))
        .first();
      if (existingSku) {
        throw new Error(`SKU "${sku}" is already in use`);
      }
    }

    // Generate display name from attributes
    const displayName = Object.values(reqAttrs).join(" / ");

    // Get next menu order
    const maxOrder = existingVariations.reduce(
      (max, v) => Math.max(max, v.menuOrder),
      0
    );

    const now = Date.now();
    const variationId = await ctx.db.insert("productVariations", {
      productId,
      vendorId: product.vendorId,
      attributes,
      sku,
      price,
      compareAtPrice,
      inventoryQuantity,
      trackInventory,
      allowBackorder,
      lowStockThreshold,
      imageUrl,
      isEnabled,
      status: "ACTIVE",
      weight,
      dimensions,
      isVirtual,
      isDownloadable,
      downloadFiles,
      downloadLimit,
      downloadExpiry,
      menuOrder: maxOrder + 1,
      displayName,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Update parent product if not already marked as VARIABLE
    if (product.productType !== "VARIABLE") {
      await ctx.db.patch(productId, {
        productType: "VARIABLE",
        hasVariants: true,
        updatedAt: now,
      });
    }

    return variationId;
  },
});

/**
 * Update a single variation
 */
export const updateVariation = mutation({
  args: {
    variationId: v.id("productVariations"),
    expectedVersion: v.optional(v.number()), // For optimistic locking
    updates: v.object({
      attributes: v.optional(v.any()),
      price: v.optional(v.number()),
      sku: v.optional(v.string()),
      compareAtPrice: v.optional(v.number()),
      inventoryQuantity: v.optional(v.number()),
      trackInventory: v.optional(v.boolean()),
      allowBackorder: v.optional(v.boolean()),
      lowStockThreshold: v.optional(v.number()),
      imageUrl: v.optional(v.string()),
      weight: v.optional(v.number()),
      dimensions: v.optional(
        v.object({
          length: v.number(),
          width: v.number(),
          height: v.number(),
        })
      ),
      isVirtual: v.optional(v.boolean()),
      isDownloadable: v.optional(v.boolean()),
      downloadFiles: v.optional(
        v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            url: v.string(),
          })
        )
      ),
      downloadLimit: v.optional(v.number()),
      downloadExpiry: v.optional(v.number()),
      isEnabled: v.optional(v.boolean()),
      status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"))),
      menuOrder: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { variationId, expectedVersion, updates } = args;

    const variation = await ctx.db.get(variationId);
    if (!variation) {
      throw new Error("Variation not found");
    }

    // Optimistic locking check
    if (expectedVersion !== undefined && variation.version !== expectedVersion) {
      throw new Error(
        "Variation was modified by another request. Please refresh and try again."
      );
    }

    // If SKU is being updated, check uniqueness
    if (updates.sku && updates.sku !== variation.sku) {
      const existingSku = await ctx.db
        .query("productVariations")
        .withIndex("by_sku", (q) => q.eq("sku", updates.sku))
        .first();
      if (existingSku && existingSku._id !== variationId) {
        throw new Error(`SKU "${updates.sku}" is already in use`);
      }
    }

    // If attributes are being updated, check for duplicates
    if (updates.attributes) {
      const existingVariations = await ctx.db
        .query("productVariations")
        .withIndex("by_product", (q) => q.eq("productId", variation.productId))
        .collect();

      const reqAttrs = updates.attributes as Record<string, string>;
      const duplicate = existingVariations.find((v) => {
        if (v._id === variationId) return false; // Skip self
        const varAttrs = v.attributes as Record<string, string>;
        const reqKeys = Object.keys(reqAttrs);
        const varKeys = Object.keys(varAttrs);

        if (reqKeys.length !== varKeys.length) return false;
        return reqKeys.every((key) => varAttrs[key] === reqAttrs[key]);
      });

      if (duplicate) {
        throw new Error("A variation with this attribute combination already exists");
      }
    }

    // Update display name if attributes changed
    let displayName = variation.displayName;
    if (updates.attributes) {
      displayName = Object.values(updates.attributes as Record<string, string>).join(
        " / "
      );
    }

    await ctx.db.patch(variationId, {
      ...updates,
      displayName,
      version: variation.version + 1,
      updatedAt: Date.now(),
    });

    return variationId;
  },
});

/**
 * Delete a single variation
 */
export const deleteVariation = mutation({
  args: {
    variationId: v.id("productVariations"),
  },
  handler: async (ctx, args) => {
    const variation = await ctx.db.get(args.variationId);
    if (!variation) {
      throw new Error("Variation not found");
    }

    await ctx.db.delete(args.variationId);

    // Check if this was the last variation
    const remainingVariations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", variation.productId))
      .collect();

    // If no variations left, revert product to SIMPLE type
    if (remainingVariations.length === 0) {
      await ctx.db.patch(variation.productId, {
        productType: "SIMPLE",
        hasVariants: false,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Generate all variations from product attributes
 * Creates variations for all possible attribute combinations
 */
export const generateVariationsFromAttributes = mutation({
  args: {
    productId: v.id("products"),
    basePrice: v.number(),
    baseInventory: v.number(),
    trackInventory: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { productId, basePrice, baseInventory, trackInventory = true } = args;

    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.attributes || product.attributes.length === 0) {
      throw new Error("Product has no attributes defined");
    }

    // Get only variation attributes (isVariation: true)
    const variationAttributes = product.attributes.filter((attr) => attr.isVariation);

    if (variationAttributes.length === 0) {
      throw new Error("No attributes are marked for variations");
    }

    // Generate all combinations
    const generateCombinations = (
      attrs: typeof variationAttributes,
      current: Record<string, string> = {},
      index = 0
    ): Record<string, string>[] => {
      if (index >= attrs.length) {
        return [{ ...current }];
      }

      const attr = attrs[index];
      const combinations: Record<string, string>[] = [];

      for (const value of attr.values) {
        current[attr.slug] = value;
        combinations.push(...generateCombinations(attrs, current, index + 1));
      }

      return combinations;
    };

    const combinations = generateCombinations(variationAttributes);

    // Get existing variations to avoid duplicates
    const existingVariations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    const existingCombinations = new Set(
      existingVariations.map((v) =>
        JSON.stringify(
          Object.entries(v.attributes as Record<string, string>).sort()
        )
      )
    );

    // Create variations for new combinations only
    const now = Date.now();
    let menuOrder = existingVariations.reduce(
      (max, v) => Math.max(max, v.menuOrder),
      0
    );

    const createdIds: Id<"productVariations">[] = [];

    for (const combination of combinations) {
      const combinationKey = JSON.stringify(Object.entries(combination).sort());

      if (existingCombinations.has(combinationKey)) {
        continue; // Skip existing combination
      }

      menuOrder++;
      const displayName = Object.values(combination).join(" / ");

      const variationId = await ctx.db.insert("productVariations", {
        productId,
        vendorId: product.vendorId,
        attributes: combination,
        price: basePrice,
        inventoryQuantity: baseInventory,
        trackInventory,
        allowBackorder: false,
        isEnabled: true,
        status: "ACTIVE",
        menuOrder,
        displayName,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      createdIds.push(variationId);
    }

    // Update product type if variations were created
    if (createdIds.length > 0 && product.productType !== "VARIABLE") {
      await ctx.db.patch(productId, {
        productType: "VARIABLE",
        hasVariants: true,
        updatedAt: now,
      });
    }

    return {
      created: createdIds.length,
      skipped: combinations.length - createdIds.length,
      totalCombinations: combinations.length,
    };
  },
});

/**
 * Bulk update variations
 * Applies same update to multiple variations at once
 */
export const bulkUpdateVariations = mutation({
  args: {
    variationIds: v.array(v.id("productVariations")),
    updates: v.object({
      price: v.optional(v.number()),
      priceAdjustment: v.optional(
        v.object({
          type: v.union(v.literal("increase"), v.literal("decrease")),
          value: v.number(),
          isPercent: v.boolean(),
        })
      ),
      inventoryQuantity: v.optional(v.number()),
      inventoryAdjustment: v.optional(
        v.object({
          type: v.union(v.literal("set"), v.literal("increase"), v.literal("decrease")),
          value: v.number(),
        })
      ),
      trackInventory: v.optional(v.boolean()),
      allowBackorder: v.optional(v.boolean()),
      lowStockThreshold: v.optional(v.number()),
      isEnabled: v.optional(v.boolean()),
      status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"))),
      weight: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { variationIds, updates } = args;
    const now = Date.now();
    let updatedCount = 0;

    for (const variationId of variationIds) {
      const variation = await ctx.db.get(variationId);
      if (!variation) continue;

      const patchData: Partial<typeof variation> = {
        updatedAt: now,
        version: variation.version + 1,
      };

      // Handle price updates
      if (updates.price !== undefined) {
        patchData.price = updates.price;
      } else if (updates.priceAdjustment) {
        const { type, value, isPercent } = updates.priceAdjustment;
        let adjustment = isPercent
          ? Math.round((variation.price * value) / 100)
          : value;

        if (type === "decrease") {
          adjustment = -adjustment;
        }

        patchData.price = Math.max(0, variation.price + adjustment);
      }

      // Handle inventory updates
      if (updates.inventoryQuantity !== undefined) {
        patchData.inventoryQuantity = updates.inventoryQuantity;
      } else if (updates.inventoryAdjustment) {
        const { type, value } = updates.inventoryAdjustment;

        switch (type) {
          case "set":
            patchData.inventoryQuantity = value;
            break;
          case "increase":
            patchData.inventoryQuantity = variation.inventoryQuantity + value;
            break;
          case "decrease":
            patchData.inventoryQuantity = Math.max(
              0,
              variation.inventoryQuantity - value
            );
            break;
        }
      }

      // Handle other updates
      if (updates.trackInventory !== undefined) {
        patchData.trackInventory = updates.trackInventory;
      }
      if (updates.allowBackorder !== undefined) {
        patchData.allowBackorder = updates.allowBackorder;
      }
      if (updates.lowStockThreshold !== undefined) {
        patchData.lowStockThreshold = updates.lowStockThreshold;
      }
      if (updates.isEnabled !== undefined) {
        patchData.isEnabled = updates.isEnabled;
      }
      if (updates.status !== undefined) {
        patchData.status = updates.status;
      }
      if (updates.weight !== undefined) {
        patchData.weight = updates.weight;
      }

      await ctx.db.patch(variationId, patchData);
      updatedCount++;
    }

    return { updated: updatedCount };
  },
});

/**
 * Delete all variations for a product
 */
export const deleteAllVariations = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    for (const variation of variations) {
      await ctx.db.delete(variation._id);
    }

    // Revert product to SIMPLE type
    await ctx.db.patch(args.productId, {
      productType: "SIMPLE",
      hasVariants: false,
      updatedAt: Date.now(),
    });

    return { deleted: variations.length };
  },
});

/**
 * Reorder variations (drag-drop support)
 */
export const reorderVariations = mutation({
  args: {
    variationIds: v.array(v.id("productVariations")),
  },
  handler: async (ctx, args) => {
    const { variationIds } = args;
    const now = Date.now();

    for (let i = 0; i < variationIds.length; i++) {
      const variation = await ctx.db.get(variationIds[i]);
      if (variation) {
        await ctx.db.patch(variationIds[i], {
          menuOrder: i + 1,
          updatedAt: now,
        });
      }
    }

    return { reordered: variationIds.length };
  },
});

/**
 * Duplicate a variation
 */
export const duplicateVariation = mutation({
  args: {
    variationId: v.id("productVariations"),
    newAttributes: v.optional(v.any()), // Override attributes for the copy
  },
  handler: async (ctx, args) => {
    const { variationId, newAttributes } = args;

    const original = await ctx.db.get(variationId);
    if (!original) {
      throw new Error("Variation not found");
    }

    // Get next menu order
    const variations = await ctx.db
      .query("productVariations")
      .withIndex("by_product", (q) => q.eq("productId", original.productId))
      .collect();

    const maxOrder = variations.reduce((max, v) => Math.max(max, v.menuOrder), 0);

    const attributes = newAttributes || original.attributes;
    const displayName = Object.values(
      attributes as Record<string, string>
    ).join(" / ");

    // Check for duplicate combination
    const reqAttrs = attributes as Record<string, string>;
    const duplicate = variations.find((v) => {
      const varAttrs = v.attributes as Record<string, string>;
      const reqKeys = Object.keys(reqAttrs);
      const varKeys = Object.keys(varAttrs);

      if (reqKeys.length !== varKeys.length) return false;
      return reqKeys.every((key) => varAttrs[key] === reqAttrs[key]);
    });

    if (duplicate) {
      throw new Error("A variation with this attribute combination already exists");
    }

    const now = Date.now();
    const newId = await ctx.db.insert("productVariations", {
      productId: original.productId,
      vendorId: original.vendorId,
      attributes,
      sku: undefined, // Clear SKU - must be unique
      price: original.price,
      compareAtPrice: original.compareAtPrice,
      inventoryQuantity: original.inventoryQuantity,
      trackInventory: original.trackInventory,
      allowBackorder: original.allowBackorder,
      lowStockThreshold: original.lowStockThreshold,
      imageUrl: original.imageUrl,
      imageId: original.imageId,
      isEnabled: true,
      status: "DRAFT", // Start as draft
      weight: original.weight,
      dimensions: original.dimensions,
      isVirtual: original.isVirtual,
      isDownloadable: original.isDownloadable,
      downloadFiles: original.downloadFiles,
      downloadLimit: original.downloadLimit,
      downloadExpiry: original.downloadExpiry,
      menuOrder: maxOrder + 1,
      displayName,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    return newId;
  },
});

/**
 * Update variation inventory (for checkout)
 * Uses optimistic locking to prevent overselling
 */
export const decrementVariationInventory = mutation({
  args: {
    variationId: v.id("productVariations"),
    quantity: v.number(),
    expectedVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const { variationId, quantity, expectedVersion } = args;

    const variation = await ctx.db.get(variationId);
    if (!variation) {
      throw new Error("Variation not found");
    }

    // Optimistic locking
    if (variation.version !== expectedVersion) {
      throw new Error("Inventory was modified. Please refresh and try again.");
    }

    // Check stock
    if (variation.trackInventory && !variation.allowBackorder) {
      if (variation.inventoryQuantity < quantity) {
        throw new Error(
          `Insufficient stock. Only ${variation.inventoryQuantity} available.`
        );
      }
    }

    const newQuantity = Math.max(0, variation.inventoryQuantity - quantity);

    await ctx.db.patch(variationId, {
      inventoryQuantity: newQuantity,
      version: variation.version + 1,
      updatedAt: Date.now(),
    });

    return {
      previousQuantity: variation.inventoryQuantity,
      newQuantity,
      version: variation.version + 1,
    };
  },
});

/**
 * Restore variation inventory (for refunds/cancellations)
 */
export const incrementVariationInventory = mutation({
  args: {
    variationId: v.id("productVariations"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const { variationId, quantity } = args;

    const variation = await ctx.db.get(variationId);
    if (!variation) {
      throw new Error("Variation not found");
    }

    const newQuantity = variation.inventoryQuantity + quantity;

    await ctx.db.patch(variationId, {
      inventoryQuantity: newQuantity,
      version: variation.version + 1,
      updatedAt: Date.now(),
    });

    return {
      previousQuantity: variation.inventoryQuantity,
      newQuantity,
    };
  },
});

/**
 * Update product attributes and sync with variations
 */
export const updateProductAttributes = mutation({
  args: {
    productId: v.id("products"),
    attributes: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        slug: v.string(),
        values: v.array(v.string()),
        isVariation: v.boolean(),
        isVisible: v.boolean(),
        sortOrder: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { productId, attributes } = args;

    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Update product attributes
    await ctx.db.patch(productId, {
      attributes,
      updatedAt: Date.now(),
    });

    // Mark product as VARIABLE if it has variation attributes
    const hasVariationAttrs = attributes.some((attr) => attr.isVariation);
    if (hasVariationAttrs && product.productType !== "VARIABLE") {
      await ctx.db.patch(productId, {
        productType: "VARIABLE",
        hasVariants: true,
      });
    }

    return { success: true };
  },
});
