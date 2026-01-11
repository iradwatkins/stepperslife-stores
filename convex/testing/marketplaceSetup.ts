import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Marketplace E2E Test Data Setup
 *
 * These functions create and cleanup test data for E2E testing.
 * All test entities use "e2e-" prefix for easy identification.
 */

// ============================================================================
// Test User Setup
// ============================================================================

/**
 * Create or get the test customer user
 */
export const createTestCustomer = mutation({
  args: {},
  handler: async (ctx) => {
    const email = "e2e-customer@stepperslife.com";

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new test customer
    const userId = await ctx.db.insert("users", {
      email,
      name: "E2E Test Customer",
      role: "user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Create or get the test vendor user
 */
export const createTestVendorUser = mutation({
  args: {},
  handler: async (ctx) => {
    const email = "e2e-vendor@stepperslife.com";

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new test vendor user
    const userId = await ctx.db.insert("users", {
      email,
      name: "E2E Test Vendor",
      role: "user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// ============================================================================
// Test Vendor Setup
// ============================================================================

/**
 * Create or get the test vendor
 */
export const createTestVendor = mutation({
  args: {
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const slug = "e2e-test-store";

    // Check if vendor exists
    const existing = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      return existing._id;
    }

    // Get or create owner
    let ownerId = args.ownerId;
    if (!ownerId) {
      const vendorUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), "e2e-vendor@stepperslife.com"))
        .first();

      if (vendorUser) {
        ownerId = vendorUser._id;
      } else {
        // Create vendor user first
        ownerId = await ctx.db.insert("users", {
          email: "e2e-vendor@stepperslife.com",
          name: "E2E Test Vendor",
          role: "user",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Create test vendor (auto-approved for testing)
    const vendorId = await ctx.db.insert("vendors", {
      ownerId,
      name: "E2E Test Store",
      slug,
      description: "A test store for E2E testing purposes",
      contactName: "E2E Test Vendor",
      contactEmail: "e2e-vendor@stepperslife.com",
      contactPhone: "555-123-4567",
      businessType: "individual",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      categories: ["Clothing", "Accessories"],
      commissionPercent: 15,
      tier: "BASIC",
      status: "APPROVED",
      isActive: true,
      totalProducts: 0,
      totalSales: 0,
      totalEarnings: 0,
      totalPaidOut: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return vendorId;
  },
});

// ============================================================================
// Test Product Setup
// ============================================================================

/**
 * Create a simple test product
 */
export const createTestSimpleProduct = mutation({
  args: {
    vendorId: v.id("vendors"),
    createdBy: v.id("users"),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED"))),
    inventoryQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sku = "E2E-TSHIRT-001";

    // Check if product exists
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .first();

    if (existing) {
      return existing._id;
    }

    // Get vendor name
    const vendor = await ctx.db.get(args.vendorId);

    // Create test product
    const productId = await ctx.db.insert("products", {
      name: "E2E Test T-Shirt",
      description: "A simple test t-shirt for E2E testing",
      slug: "e2e-test-tshirt",
      productType: "SIMPLE",
      price: 2500, // $25.00
      compareAtPrice: 3500, // $35.00
      sku,
      inventoryQuantity: args.inventoryQuantity ?? 100,
      trackInventory: true,
      allowBackorder: false,
      category: "Clothing",
      tags: ["test", "e2e", "t-shirt"],
      hasVariants: false,
      requiresShipping: true,
      weight: 200,
      status: args.status ?? "ACTIVE",
      createdBy: args.createdBy,
      vendorId: args.vendorId,
      vendorName: vendor?.name ?? "E2E Test Store",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update vendor product count
    if (vendor) {
      await ctx.db.patch(args.vendorId, {
        totalProducts: (vendor.totalProducts ?? 0) + 1,
        updatedAt: Date.now(),
      });
    }

    return productId;
  },
});

/**
 * Create a variable test product with variations
 */
export const createTestVariableProduct = mutation({
  args: {
    vendorId: v.id("vendors"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sku = "E2E-HOODIE-001";

    // Check if product exists
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .first();

    if (existing) {
      return { productId: existing._id, variationIds: [] };
    }

    // Get vendor
    const vendor = await ctx.db.get(args.vendorId);

    // Create variable product
    const productId = await ctx.db.insert("products", {
      name: "E2E Test Hoodie",
      description: "A variable test hoodie with size and color options",
      slug: "e2e-test-hoodie",
      productType: "VARIABLE",
      price: 4500, // $45.00 base price
      compareAtPrice: 6000, // $60.00
      sku,
      inventoryQuantity: 0, // Managed at variation level
      trackInventory: true,
      allowBackorder: false,
      category: "Clothing",
      tags: ["test", "e2e", "hoodie", "variable"],
      attributes: [
        {
          id: "attr_size",
          name: "Size",
          slug: "size",
          values: ["S", "M", "L", "XL"],
          isVariation: true,
          isVisible: true,
          sortOrder: 1,
        },
        {
          id: "attr_color",
          name: "Color",
          slug: "color",
          values: ["Black", "White", "Navy"],
          isVariation: true,
          isVisible: true,
          sortOrder: 2,
        },
      ],
      hasVariants: true,
      requiresShipping: true,
      weight: 500,
      status: "ACTIVE",
      createdBy: args.createdBy,
      vendorId: args.vendorId,
      vendorName: vendor?.name ?? "E2E Test Store",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create variations
    const variations = [
      { size: "S", color: "Black", price: 4500, qty: 10, sku: "E2E-HOODIE-S-BLK" },
      { size: "M", color: "Black", price: 4500, qty: 15, sku: "E2E-HOODIE-M-BLK" },
      { size: "L", color: "Black", price: 4500, qty: 12, sku: "E2E-HOODIE-L-BLK" },
      { size: "XL", color: "Black", price: 4800, qty: 8, sku: "E2E-HOODIE-XL-BLK" },
      { size: "S", color: "White", price: 4500, qty: 10, sku: "E2E-HOODIE-S-WHT" },
      { size: "M", color: "White", price: 4500, qty: 15, sku: "E2E-HOODIE-M-WHT" },
    ];

    const variationIds: Id<"productVariations">[] = [];

    for (const v of variations) {
      const variationId = await ctx.db.insert("productVariations", {
        productId,
        vendorId: args.vendorId,
        attributes: { Size: v.size, Color: v.color },
        sku: v.sku,
        price: v.price,
        inventoryQuantity: v.qty,
        trackInventory: true,
        allowBackorder: false,
        isEnabled: true,
        status: "ACTIVE",
        version: 1,
        menuOrder: variationIds.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      variationIds.push(variationId);
    }

    // Update vendor product count
    if (vendor) {
      await ctx.db.patch(args.vendorId, {
        totalProducts: (vendor.totalProducts ?? 0) + 1,
        updatedAt: Date.now(),
      });
    }

    return { productId, variationIds };
  },
});

/**
 * Create an out-of-stock test product
 */
export const createTestOutOfStockProduct = mutation({
  args: {
    vendorId: v.id("vendors"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sku = "E2E-OOS-001";

    // Check if product exists
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .first();

    if (existing) {
      return existing._id;
    }

    // Get vendor
    const vendor = await ctx.db.get(args.vendorId);

    // Create out-of-stock product
    const productId = await ctx.db.insert("products", {
      name: "E2E Out of Stock Item",
      description: "A test product that is out of stock",
      slug: "e2e-out-of-stock",
      productType: "SIMPLE",
      price: 1500, // $15.00
      sku,
      inventoryQuantity: 0,
      trackInventory: true,
      allowBackorder: false,
      category: "Accessories",
      tags: ["test", "e2e", "out-of-stock"],
      hasVariants: false,
      requiresShipping: true,
      weight: 100,
      status: "ACTIVE",
      createdBy: args.createdBy,
      vendorId: args.vendorId,
      vendorName: vendor?.name ?? "E2E Test Store",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// ============================================================================
// Setup All Test Data
// ============================================================================

/**
 * Setup all marketplace test data atomically
 */
export const setupAllMarketplaceTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Create test users
    let customerId: Id<"users">;
    let vendorUserId: Id<"users">;

    // Customer
    const existingCustomer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "e2e-customer@stepperslife.com"))
      .first();

    if (existingCustomer) {
      customerId = existingCustomer._id;
    } else {
      customerId = await ctx.db.insert("users", {
        email: "e2e-customer@stepperslife.com",
        name: "E2E Test Customer",
        role: "user",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Vendor user
    const existingVendorUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "e2e-vendor@stepperslife.com"))
      .first();

    if (existingVendorUser) {
      vendorUserId = existingVendorUser._id;
    } else {
      vendorUserId = await ctx.db.insert("users", {
        email: "e2e-vendor@stepperslife.com",
        name: "E2E Test Vendor",
        role: "user",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create vendor
    let vendorId: Id<"vendors">;
    const existingVendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", "e2e-test-store"))
      .first();

    if (existingVendor) {
      vendorId = existingVendor._id;
    } else {
      vendorId = await ctx.db.insert("vendors", {
        ownerId: vendorUserId,
        name: "E2E Test Store",
        slug: "e2e-test-store",
        description: "A test store for E2E testing purposes",
        contactName: "E2E Test Vendor",
        contactEmail: "e2e-vendor@stepperslife.com",
        contactPhone: "555-123-4567",
        businessType: "individual",
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
        categories: ["Clothing", "Accessories"],
        commissionPercent: 15,
        tier: "BASIC",
        status: "APPROVED",
        isActive: true,
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create simple product
    let simpleProductId: Id<"products"> | null = null;
    const existingSimple = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", "E2E-TSHIRT-001"))
      .first();

    if (!existingSimple) {
      simpleProductId = await ctx.db.insert("products", {
        name: "E2E Test T-Shirt",
        description: "A simple test t-shirt for E2E testing",
        slug: "e2e-test-tshirt",
        productType: "SIMPLE",
        price: 2500,
        compareAtPrice: 3500,
        sku: "E2E-TSHIRT-001",
        inventoryQuantity: 100,
        trackInventory: true,
        allowBackorder: false,
        category: "Clothing",
        tags: ["test", "e2e", "t-shirt"],
        hasVariants: false,
        requiresShipping: true,
        weight: 200,
        status: "ACTIVE",
        createdBy: vendorUserId,
        vendorId,
        vendorName: "E2E Test Store",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      simpleProductId = existingSimple._id;
    }

    // Create variable product
    let variableProductId: Id<"products"> | null = null;
    const existingVariable = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", "E2E-HOODIE-001"))
      .first();

    if (!existingVariable) {
      variableProductId = await ctx.db.insert("products", {
        name: "E2E Test Hoodie",
        description: "A variable test hoodie with size and color options",
        slug: "e2e-test-hoodie",
        productType: "VARIABLE",
        price: 4500,
        compareAtPrice: 6000,
        sku: "E2E-HOODIE-001",
        inventoryQuantity: 0,
        trackInventory: true,
        allowBackorder: false,
        category: "Clothing",
        tags: ["test", "e2e", "hoodie", "variable"],
        attributes: [
          {
            id: "attr_size",
            name: "Size",
            slug: "size",
            values: ["S", "M", "L", "XL"],
            isVariation: true,
            isVisible: true,
            sortOrder: 1,
          },
          {
            id: "attr_color",
            name: "Color",
            slug: "color",
            values: ["Black", "White", "Navy"],
            isVariation: true,
            isVisible: true,
            sortOrder: 2,
          },
        ],
        hasVariants: true,
        requiresShipping: true,
        weight: 500,
        status: "ACTIVE",
        createdBy: vendorUserId,
        vendorId,
        vendorName: "E2E Test Store",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create variations
      const variations = [
        { size: "S", color: "Black", price: 4500, qty: 10, sku: "E2E-HOODIE-S-BLK" },
        { size: "M", color: "Black", price: 4500, qty: 15, sku: "E2E-HOODIE-M-BLK" },
        { size: "L", color: "Black", price: 4500, qty: 12, sku: "E2E-HOODIE-L-BLK" },
        { size: "XL", color: "Black", price: 4800, qty: 8, sku: "E2E-HOODIE-XL-BLK" },
        { size: "S", color: "White", price: 4500, qty: 10, sku: "E2E-HOODIE-S-WHT" },
        { size: "M", color: "White", price: 4500, qty: 15, sku: "E2E-HOODIE-M-WHT" },
      ];

      for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        await ctx.db.insert("productVariations", {
          productId: variableProductId,
          vendorId,
          attributes: { Size: v.size, Color: v.color },
          sku: v.sku,
          price: v.price,
          inventoryQuantity: v.qty,
          trackInventory: true,
          allowBackorder: false,
          isEnabled: true,
          status: "ACTIVE",
          version: 1,
          menuOrder: i,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else {
      variableProductId = existingVariable._id;
    }

    // Update vendor stats
    const vendor = await ctx.db.get(vendorId);
    if (vendor) {
      const productCount = await ctx.db
        .query("products")
        .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
        .collect();

      await ctx.db.patch(vendorId, {
        totalProducts: productCount.length,
        updatedAt: Date.now(),
      });
    }

    return {
      customerId,
      vendorUserId,
      vendorId,
      simpleProductId,
      variableProductId,
    };
  },
});

// ============================================================================
// Query Test Data
// ============================================================================

/**
 * Get test vendor by slug
 */
export const getTestVendor = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", "e2e-test-store"))
      .first();
  },
});

/**
 * Get test products
 */
export const getTestProducts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .filter((q) =>
        q.or(
          q.eq(q.field("sku"), "E2E-TSHIRT-001"),
          q.eq(q.field("sku"), "E2E-HOODIE-001"),
          q.eq(q.field("sku"), "E2E-OOS-001")
        )
      )
      .collect();
  },
});

// ============================================================================
// Cleanup Test Data
// ============================================================================

/**
 * Clean up all marketplace test data
 */
export const cleanupMarketplaceTestData = mutation({
  args: {},
  handler: async (ctx) => {
    let deletedCounts = {
      users: 0,
      vendors: 0,
      products: 0,
      productVariations: 0,
      productOrders: 0,
      vendorEarnings: 0,
    };

    // Delete test product variations
    const testProducts = await ctx.db
      .query("products")
      .filter((q) =>
        q.or(
          q.eq(q.field("sku"), "E2E-TSHIRT-001"),
          q.eq(q.field("sku"), "E2E-HOODIE-001"),
          q.eq(q.field("sku"), "E2E-OOS-001")
        )
      )
      .collect();

    for (const product of testProducts) {
      // Delete variations
      const variations = await ctx.db
        .query("productVariations")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();

      for (const variation of variations) {
        await ctx.db.delete(variation._id);
        deletedCounts.productVariations++;
      }

      // Delete product
      await ctx.db.delete(product._id);
      deletedCounts.products++;
    }

    // Delete test vendor
    const testVendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", "e2e-test-store"))
      .first();

    if (testVendor) {
      // Delete vendor earnings
      const earnings = await ctx.db
        .query("vendorEarnings")
        .withIndex("by_vendor", (q) => q.eq("vendorId", testVendor._id))
        .collect();

      for (const earning of earnings) {
        await ctx.db.delete(earning._id);
        deletedCounts.vendorEarnings++;
      }

      await ctx.db.delete(testVendor._id);
      deletedCounts.vendors++;
    }

    // Delete test users (optional - may want to keep for login)
    const testEmails = [
      "e2e-customer@stepperslife.com",
      "e2e-vendor@stepperslife.com",
    ];

    for (const email of testEmails) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), email))
        .first();

      if (user) {
        // Don't delete users by default - they're needed for login
        // await ctx.db.delete(user._id);
        // deletedCounts.users++;
      }
    }

    return deletedCounts;
  },
});
