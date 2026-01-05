import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Create a new product (admin only - platform products)
export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    compareAtPrice: v.optional(v.number()),
    sku: v.optional(v.string()),
    inventoryQuantity: v.number(),
    trackInventory: v.boolean(),
    allowBackorder: v.optional(v.boolean()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    primaryImage: v.optional(v.string()),
    hasVariants: v.boolean(),
    requiresShipping: v.boolean(),
    weight: v.optional(v.number()),
    shippingPrice: v.optional(v.number()),
    status: v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED")),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication for creating products
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to create products.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    // Only admins can create products
    if (user.role !== "admin") {
      throw new Error("Admin access required. Only administrators can create products.");
    }

    // Create product
    const productId = await ctx.db.insert("products", {
      ...args,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Create a vendor product
export const createVendorProduct = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    compareAtPrice: v.optional(v.number()),
    sku: v.optional(v.string()),
    inventoryQuantity: v.number(),
    trackInventory: v.boolean(),
    allowBackorder: v.optional(v.boolean()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    primaryImage: v.optional(v.string()),
    hasVariants: v.boolean(),
    requiresShipping: v.boolean(),
    weight: v.optional(v.number()),
    shippingPrice: v.optional(v.number()),
    status: v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED")),
  },
  handler: async (ctx, args) => {
    const { vendorId, ...productArgs } = args;

    // Get vendor
    const vendor = await ctx.db.get(vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Check vendor is approved and active
    if (vendor.status !== "APPROVED" || !vendor.isActive) {
      throw new Error("Vendor account is not active");
    }

    // Create product with vendor info
    const productId = await ctx.db.insert("products", {
      ...productArgs,
      vendorId: vendor._id,
      vendorName: vendor.name,
      createdBy: vendor.ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update vendor product count
    await ctx.db.patch(vendorId, {
      totalProducts: (vendor.totalProducts || 0) + 1,
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Update a vendor product (vendor can only edit their own products)
export const updateVendorProduct = mutation({
  args: {
    productId: v.id("products"),
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()),
    sku: v.optional(v.string()),
    inventoryQuantity: v.optional(v.number()),
    trackInventory: v.optional(v.boolean()),
    allowBackorder: v.optional(v.boolean()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    primaryImage: v.optional(v.string()),
    hasVariants: v.optional(v.boolean()),
    requiresShipping: v.optional(v.boolean()),
    weight: v.optional(v.number()),
    shippingPrice: v.optional(v.number()),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED"))),
  },
  handler: async (ctx, args) => {
    const { productId, vendorId, ...updates } = args;

    // Get product
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verify product belongs to this vendor
    if (product.vendorId?.toString() !== vendorId.toString()) {
      throw new Error("You can only edit your own products");
    }

    // Update product
    await ctx.db.patch(productId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Delete a vendor product
export const deleteVendorProduct = mutation({
  args: {
    productId: v.id("products"),
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    // Get product
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verify product belongs to this vendor
    if (product.vendorId?.toString() !== args.vendorId.toString()) {
      throw new Error("You can only delete your own products");
    }

    // Get vendor to update count
    const vendor = await ctx.db.get(args.vendorId);

    await ctx.db.delete(args.productId);

    // Update vendor product count
    if (vendor) {
      await ctx.db.patch(args.vendorId, {
        totalProducts: Math.max(0, (vendor.totalProducts || 0) - 1),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Update a product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()),
    sku: v.optional(v.string()),
    inventoryQuantity: v.optional(v.number()),
    trackInventory: v.optional(v.boolean()),
    allowBackorder: v.optional(v.boolean()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    primaryImage: v.optional(v.string()),
    hasVariants: v.optional(v.boolean()),
    requiresShipping: v.optional(v.boolean()),
    weight: v.optional(v.number()),
    shippingPrice: v.optional(v.number()),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED"))),
  },
  handler: async (ctx, args) => {
    const { productId, ...updates } = args;

    // Get product
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Update product
    await ctx.db.patch(productId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Duplicate a product
export const duplicateProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Get the original product
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // PRODUCTION: Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to duplicate products.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Create a duplicate with modified name and SKU
    // Preserve vendorId and vendorName if this is a vendor product
    const duplicatedProductId = await ctx.db.insert("products", {
      name: `${product.name} (Copy)`,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      sku: product.sku ? `${product.sku}-COPY-${Date.now()}` : undefined,
      inventoryQuantity: product.inventoryQuantity,
      trackInventory: product.trackInventory,
      allowBackorder: product.allowBackorder,
      category: product.category,
      tags: product.tags,
      images: product.images,
      primaryImage: product.primaryImage,
      hasVariants: product.hasVariants,
      variants: product.variants, // Copy variants too
      requiresShipping: product.requiresShipping,
      weight: product.weight,
      shippingPrice: product.shippingPrice,
      status: "DRAFT", // Always create duplicates as drafts
      // Preserve vendor association if exists
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update vendor product count if this is a vendor product
    if (product.vendorId) {
      const vendor = await ctx.db.get(product.vendorId);
      if (vendor) {
        await ctx.db.patch(product.vendorId, {
          totalProducts: (vendor.totalProducts || 0) + 1,
          updatedAt: Date.now(),
        });
      }
    }

    return duplicatedProductId;
  },
});

// Duplicate a vendor product (with proper ownership verification)
export const duplicateVendorProduct = mutation({
  args: {
    productId: v.id("products"),
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    // Get the original product
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verify product belongs to this vendor
    if (product.vendorId?.toString() !== args.vendorId.toString()) {
      throw new Error("You can only duplicate your own products");
    }

    // Get vendor
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Check vendor is approved and active
    if (vendor.status !== "APPROVED" || !vendor.isActive) {
      throw new Error("Vendor account is not active");
    }

    // Create a duplicate with modified name and SKU
    const duplicatedProductId = await ctx.db.insert("products", {
      name: `${product.name} (Copy)`,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      sku: product.sku ? `${product.sku}-COPY-${Date.now()}` : undefined,
      inventoryQuantity: product.inventoryQuantity,
      trackInventory: product.trackInventory,
      allowBackorder: product.allowBackorder,
      category: product.category,
      tags: product.tags,
      images: product.images,
      primaryImage: product.primaryImage,
      hasVariants: product.hasVariants,
      variants: product.variants,
      requiresShipping: product.requiresShipping,
      weight: product.weight,
      shippingPrice: product.shippingPrice,
      status: "DRAFT", // Always create duplicates as drafts
      vendorId: vendor._id,
      vendorName: vendor.name,
      createdBy: vendor.ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update vendor product count
    await ctx.db.patch(args.vendorId, {
      totalProducts: (vendor.totalProducts || 0) + 1,
      updatedAt: Date.now(),
    });

    return duplicatedProductId;
  },
});

// Delete a product
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.delete(args.productId);
    return { success: true };
  },
});

// Update inventory quantity
export const updateInventory = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.productId, {
      inventoryQuantity: args.quantity,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// VARIANT MUTATIONS
// ============================================

// Generate all variant combinations from colors and sizes
export const generateVariantCombinations = mutation({
  args: {
    productId: v.id("products"),
    colors: v.array(v.string()), // ["Red", "Blue", "Green"]
    sizes: v.array(v.string()), // ["S", "M", "L"]
    basePrice: v.number(), // Price in cents
    baseSku: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const variants: Array<{
      id: string;
      name: string;
      options: {
        size?: string;
        color?: string;
      };
      price?: number;
      sku?: string;
      inventoryQuantity: number;
    }> = [];
    for (const color of args.colors) {
      for (const size of args.sizes) {
        const variantId = `${color.toLowerCase()}-${size.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        variants.push({
          id: variantId,
          name: `${color} / ${size}`,
          options: {
            color,
            size,
          },
          price: args.basePrice, // Each variant gets independent price (can be edited later)
          sku: args.baseSku
            ? `${args.baseSku}-${color.toUpperCase()}-${size.toUpperCase()}`
            : undefined,
          inventoryQuantity: 0, // Default to 0, can be set later
        });
      }
    }

    await ctx.db.patch(args.productId, {
      hasVariants: true,
      variants,
      updatedAt: Date.now(),
    });

    return { success: true, variantsCreated: variants.length, variants };
  },
});

// Add a single variant to a product
export const addProductVariant = mutation({
  args: {
    productId: v.id("products"),
    variant: v.object({
      name: v.string(),
      options: v.object({
        size: v.optional(v.string()),
        color: v.optional(v.string()),
      }),
      price: v.number(),
      sku: v.optional(v.string()),
      inventoryQuantity: v.number(),
      image: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const variantId = `${args.variant.options.color?.toLowerCase()}-${args.variant.options.size?.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newVariant = {
      id: variantId,
      ...args.variant,
    };

    const currentVariants = product.variants || [];
    await ctx.db.patch(args.productId, {
      hasVariants: true,
      variants: [...currentVariants, newVariant],
      updatedAt: Date.now(),
    });

    return { success: true, variantId };
  },
});

// Update an existing variant
export const updateProductVariant = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      price: v.optional(v.number()),
      sku: v.optional(v.string()),
      inventoryQuantity: v.optional(v.number()),
      image: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.variants) {
      throw new Error("Product has no variants");
    }

    const updatedVariants = product.variants.map((variant) => {
      if (variant.id === args.variantId) {
        return {
          ...variant,
          ...args.updates,
        };
      }
      return variant;
    });

    await ctx.db.patch(args.productId, {
      variants: updatedVariants,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete a variant
export const deleteProductVariant = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.variants) {
      throw new Error("Product has no variants");
    }

    const updatedVariants = product.variants.filter((v) => v.id !== args.variantId);

    await ctx.db.patch(args.productId, {
      variants: updatedVariants.length > 0 ? updatedVariants : undefined,
      hasVariants: updatedVariants.length > 0,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update variant inventory
export const updateVariantInventory = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.variants) {
      throw new Error("Product has no variants");
    }

    const updatedVariants = product.variants.map((variant) => {
      if (variant.id === args.variantId) {
        return {
          ...variant,
          inventoryQuantity: args.quantity,
        };
      }
      return variant;
    });

    await ctx.db.patch(args.productId, {
      variants: updatedVariants,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// PRODUCT OPTIONS MUTATIONS
// ============================================

// Add a product option
export const addProductOption = mutation({
  args: {
    productId: v.id("products"),
    option: v.object({
      name: v.string(),
      description: v.optional(v.string()),
      type: v.union(
        v.literal("text"),
        v.literal("textarea"),
        v.literal("number"),
        v.literal("select"),
        v.literal("radio"),
        v.literal("checkbox"),
        v.literal("color"),
        v.literal("date"),
        v.literal("file"),
        v.literal("image_swatch")
      ),
      required: v.boolean(),
      choices: v.optional(
        v.array(
          v.object({
            label: v.string(),
            priceModifier: v.number(),
            image: v.optional(v.string()),
            default: v.optional(v.boolean()),
          })
        )
      ),
      priceModifier: v.optional(v.number()),
      minLength: v.optional(v.number()),
      maxLength: v.optional(v.number()),
      minValue: v.optional(v.number()),
      maxValue: v.optional(v.number()),
      placeholder: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Note: Product options are not currently supported in the schema
    // This functionality would need to be added to the schema first
    throw new Error("Product options feature is not yet implemented in the schema");
  },
});

// Update a product option
export const updateProductOption = mutation({
  args: {
    productId: v.id("products"),
    optionId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      required: v.optional(v.boolean()),
      choices: v.optional(
        v.array(
          v.object({
            id: v.optional(v.string()),
            label: v.string(),
            priceModifier: v.number(),
            image: v.optional(v.string()),
            default: v.optional(v.boolean()),
          })
        )
      ),
      priceModifier: v.optional(v.number()),
      minLength: v.optional(v.number()),
      maxLength: v.optional(v.number()),
      minValue: v.optional(v.number()),
      maxValue: v.optional(v.number()),
      placeholder: v.optional(v.string()),
      displayOrder: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Note: Product options are not currently supported in the schema
    // This functionality would need to be added to the schema first
    throw new Error("Product options feature is not yet implemented in the schema");
  },
});

// Delete a product option
export const deleteProductOption = mutation({
  args: {
    productId: v.id("products"),
    optionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Note: Product options are not currently supported in the schema
    // This functionality would need to be added to the schema first
    throw new Error("Product options feature is not yet implemented in the schema");
  },
});

// Reorder product options
export const reorderProductOptions = mutation({
  args: {
    productId: v.id("products"),
    optionIds: v.array(v.string()), // Array of option IDs in new order
  },
  handler: async (ctx, args) => {
    // Note: Product options are not currently supported in the schema
    // This functionality would need to be added to the schema first
    throw new Error("Product options feature is not yet implemented in the schema");
  },
});

// ADMIN: Clean up test products
export const cleanupTestProducts = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all products
    const products = await ctx.db.query("products").collect();

    let deletedCount = 0;

    for (const product of products) {
      // Check if it's a test product (E2E Test Product or Debug Test Product)
      if (
        product.name.includes("E2E Test Product") ||
        product.name.includes("Debug Test Product") ||
        product.name.includes("Test Product")
      ) {
        await ctx.db.delete(product._id);
        deletedCount++;
      }
    }

    return { deletedCount, message: `Deleted ${deletedCount} test products` };
  },
});
