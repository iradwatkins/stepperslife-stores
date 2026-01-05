import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Self-hosted Convex backend URL.
 * IMPORTANT: This is hardcoded because Convex functions run in an isolated runtime
 * where Next.js environment variables are NOT available.
 */
const CONVEX_BACKEND_URL = "https://convex.toolboxhosting.com";

/**
 * Helper to resolve storage URLs to full absolute URLs.
 * Self-hosted Convex returns relative paths like /api/storage/...
 * This ensures we always return a full URL that browsers can access.
 */
function resolveStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // If it's already an absolute URL (http:// or https://), return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // If it's a relative storage path, prepend the Convex backend URL
  if (url.startsWith("/api/storage/")) {
    return `${CONVEX_BACKEND_URL}${url}`;
  }

  // For other relative paths, prepend anyway
  if (url.startsWith("/")) {
    return `${CONVEX_BACKEND_URL}${url}`;
  }

  // For any other format, return as-is
  return url;
}

/**
 * Helper to resolve all image URLs in a product
 */
function resolveProductImages<T extends { primaryImage?: string | null; images?: string[] | null }>(
  product: T
): T {
  return {
    ...product,
    primaryImage: resolveStorageUrl(product.primaryImage),
    images: product.images?.map((url) => resolveStorageUrl(url) || url) || [],
  };
}

// Get all products (for admin)
export const getAllProducts = query({
  args: {
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
      return products;
    }

    const products = await ctx.db.query("products").order("desc").collect();
    return products;
  },
});

// Get active products only (for customers)
export const getActiveProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .order("desc")
      .collect();

    // Enrich products with vendor info and resolve image URLs
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // Resolve image URLs to full absolute URLs
        const productWithImages = resolveProductImages(product);

        if (product.vendorId) {
          const vendor = await ctx.db.get(product.vendorId);
          return {
            ...productWithImages,
            vendor: vendor ? {
              _id: vendor._id,
              storeName: vendor.name,
              slug: vendor.slug,
              logo: resolveStorageUrl(vendor.logoUrl),
              tier: vendor.tier || "BASIC",
            } : null,
          };
        }
        return { ...productWithImages, vendor: null };
      })
    );

    return enrichedProducts;
  },
});

// Get single product by ID
// Note: Uses v.id() for type safety - caller should validate ID before calling
export const getProductById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    // Resolve image URLs to full absolute URLs
    const productWithImages = resolveProductImages(product);

    // Enrich with vendor info
    if (product.vendorId) {
      const vendor = await ctx.db.get(product.vendorId);
      return {
        ...productWithImages,
        vendor: vendor ? {
          _id: vendor._id,
          storeName: vendor.name,
          slug: vendor.slug,
          logo: resolveStorageUrl(vendor.logoUrl),
          description: vendor.description,
          tier: vendor.tier || "BASIC",
        } : null,
      };
    }
    return { ...productWithImages, vendor: null };
  },
});

// Get single product by ID (string version - for graceful error handling)
// Note: Uses v.string() to allow graceful handling of invalid IDs
// This prevents server errors when invalid product IDs are passed from URLs
export const getProductByIdSafe = query({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    // Validate the ID looks like a Convex ID (alphanumeric, 20+ chars)
    const idPattern = /^[a-z0-9]{20,}$/i;
    if (!idPattern.test(args.productId)) {
      return null; // Invalid ID format
    }

    try {
      // Try to get the product - cast to products table ID type
      const product = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("_id"), args.productId as any))
        .first();

      if (!product) return null;

      // Resolve image URLs to full absolute URLs
      const productWithImages = resolveProductImages(product);

      // Enrich with vendor info
      if (product.vendorId) {
        const vendor = await ctx.db.get(product.vendorId);
        return {
          ...productWithImages,
          vendor: vendor ? {
            _id: vendor._id,
            storeName: vendor.name,
            slug: vendor.slug,
            logo: resolveStorageUrl(vendor.logoUrl),
            description: vendor.description,
            tier: vendor.tier || "BASIC",
          } : null,
        };
      }
      return { ...productWithImages, vendor: null };
    } catch {
      // If anything goes wrong (invalid ID, etc.), return null
      return null;
    }
  },
});

// Get single product by slug (for SEO-friendly URLs)
export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Query by slug using the index
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!product) return null;

    // Resolve image URLs to full absolute URLs
    const productWithImages = resolveProductImages(product);

    // Enrich with vendor info
    if (product.vendorId) {
      const vendor = await ctx.db.get(product.vendorId);
      return {
        ...productWithImages,
        vendor: vendor ? {
          _id: vendor._id,
          storeName: vendor.name,
          slug: vendor.slug,
          logo: resolveStorageUrl(vendor.logoUrl),
          description: vendor.description,
          tier: vendor.tier || "BASIC",
        } : null,
      };
    }
    return { ...productWithImages, vendor: null };
  },
});

// Get products by category
export const getProductsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .order("desc")
      .collect();

    // Resolve image URLs for all products
    return products.map((product) => resolveProductImages(product));
  },
});

// Get products by vendor (for vendor dashboard)
export const getProductsByVendor = query({
  args: {
    vendorId: v.id("vendors"),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED"))),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("products")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();

    if (args.status) {
      products = products.filter((p) => p.status === args.status);
    }

    // Resolve image URLs for all products
    return products.map((product) => resolveProductImages(product));
  },
});

// Get active products by vendor (for storefront)
export const getActiveProductsByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .order("desc")
      .collect();

    // Resolve image URLs for all products
    return products.map((product) => resolveProductImages(product));
  },
});

// Validate cart items before checkout
export const validateCartItems = query({
  args: {
    items: v.array(
      v.object({
        productId: v.string(),
        quantity: v.number(),
        variantId: v.optional(v.string()),
        variationId: v.optional(v.string()), // New variation system
      })
    ),
  },
  handler: async (ctx, args) => {
    const validationResults = [];
    let allValid = true;

    for (const item of args.items) {
      try {
        // Try to get the product
        const product = await ctx.db
          .query("products")
          .filter((q) => q.eq(q.field("_id"), item.productId as any))
          .first();

        if (!product) {
          validationResults.push({
            productId: item.productId,
            valid: false,
            error: "Product no longer exists",
          });
          allValid = false;
          continue;
        }

        if (product.status !== "ACTIVE") {
          validationResults.push({
            productId: item.productId,
            productName: product.name,
            valid: false,
            error: "Product is no longer available",
          });
          allValid = false;
          continue;
        }

        // Handle new variation system (productType: "VARIABLE")
        if (item.variationId) {
          const variation = await ctx.db
            .query("productVariations")
            .filter((q) => q.eq(q.field("_id"), item.variationId as any))
            .first();

          if (!variation) {
            validationResults.push({
              productId: item.productId,
              productName: product.name,
              valid: false,
              error: "Selected variation no longer exists",
            });
            allValid = false;
            continue;
          }

          if (variation.status !== "ACTIVE" || !variation.isEnabled) {
            validationResults.push({
              productId: item.productId,
              productName: product.name,
              valid: false,
              error: "Selected variation is no longer available",
            });
            allValid = false;
            continue;
          }

          if (variation.trackInventory && variation.inventoryQuantity < item.quantity) {
            validationResults.push({
              productId: item.productId,
              productName: product.name,
              valid: false,
              error: `Only ${variation.inventoryQuantity} in stock for this option`,
              availableQuantity: variation.inventoryQuantity,
            });
            allValid = false;
            continue;
          }

          validationResults.push({
            productId: item.productId,
            productName: product.name,
            valid: true,
          });
          continue;
        }

        // Legacy: Check inventory if tracking is enabled
        if (product.trackInventory) {
          if (item.variantId && product.variants) {
            const variant = (product.variants as any[]).find((v: any) => v.id === item.variantId);
            if (!variant) {
              validationResults.push({
                productId: item.productId,
                productName: product.name,
                valid: false,
                error: "Selected variant no longer exists",
              });
              allValid = false;
              continue;
            }
            if (variant.inventoryQuantity < item.quantity) {
              validationResults.push({
                productId: item.productId,
                productName: product.name,
                valid: false,
                error: `Only ${variant.inventoryQuantity} in stock`,
                availableQuantity: variant.inventoryQuantity,
              });
              allValid = false;
              continue;
            }
          } else {
            if (product.inventoryQuantity < item.quantity) {
              validationResults.push({
                productId: item.productId,
                productName: product.name,
                valid: false,
                error: `Only ${product.inventoryQuantity} in stock`,
                availableQuantity: product.inventoryQuantity,
              });
              allValid = false;
              continue;
            }
          }
        }

        validationResults.push({
          productId: item.productId,
          productName: product.name,
          valid: true,
        });
      } catch (err) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          error: "Invalid product ID",
        });
        allValid = false;
      }
    }

    return {
      allValid,
      results: validationResults,
    };
  },
});
