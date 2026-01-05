import { internalMutation } from "../_generated/server";

// Seed test vendor and products
export const seedVendor = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get the vendor owner user
    const vendorOwner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "vendor@thestepperslife.com"))
      .unique();

    if (!vendorOwner) {
      throw new Error("Vendor owner not found. Run seedUsers first.");
    }

    // Check if vendor already exists
    let vendor = await ctx.db
      .query("vendors")
      .withIndex("by_owner", (q) => q.eq("ownerId", vendorOwner._id))
      .unique();

    if (!vendor) {
      // Create vendor
      const vendorId = await ctx.db.insert("vendors", {
        ownerId: vendorOwner._id,
        name: "Steppin' Apparel Co.",
        slug: "steppin-apparel-co",
        description: "Your one-stop shop for stepping fashion. We design clothing and accessories that make you look and feel your best on the dance floor. From classic tees to premium dance shoes, we've got you covered.",
        contactName: "Vendor Owner",
        contactEmail: "vendor@thestepperslife.com",
        contactPhone: "(312) 555-0404",
        businessType: "LLC",
        address: "555 W Madison St",
        city: "Chicago",
        state: "IL",
        zipCode: "60661",
        categories: ["apparel", "accessories", "footwear", "bundles"],
        commissionPercent: 10, // 10% platform fee
        tier: "VERIFIED" as const,
        status: "APPROVED" as const,
        isActive: true,
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
        createdAt: now,
        updatedAt: now,
      });
      vendor = await ctx.db.get(vendorId);
    }

    if (!vendor) {
      throw new Error("Failed to create vendor");
    }

    const products = [
      // 1. Classic Stepper Tee - $35 (Variable - sizes)
      {
        name: "Classic Stepper Tee",
        description: "Premium cotton tee featuring our iconic 'Steppers Life' logo. Soft, breathable fabric perfect for dancing or everyday wear. Unisex fit with comfortable stretch for movement.",
        productType: "VARIABLE" as const,
        price: 3500, // $35 in cents
        compareAtPrice: 4500, // Was $45
        sku: "SAC-TEE-001",
        inventoryQuantity: 100,
        trackInventory: true,
        allowBackorder: false,
        category: "Apparel",
        tags: ["tshirt", "cotton", "unisex", "logo", "bestseller"],
        primaryImage: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
        images: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
          "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800",
        ],
        attributes: [
          {
            id: "attr_size_001",
            name: "Size",
            slug: "size",
            values: ["S", "M", "L", "XL", "2XL", "3XL"],
            isVariation: true,
            isVisible: true,
            sortOrder: 1,
          },
          {
            id: "attr_color_001",
            name: "Color",
            slug: "color",
            values: ["Black", "White", "Red"],
            isVariation: true,
            isVisible: true,
            sortOrder: 2,
          },
        ],
        hasVariants: true,
        variants: [
          { id: "var-001-bk-s", name: "Black / S", options: { size: "S", color: "Black" }, inventoryQuantity: 10 },
          { id: "var-001-bk-m", name: "Black / M", options: { size: "M", color: "Black" }, inventoryQuantity: 15 },
          { id: "var-001-bk-l", name: "Black / L", options: { size: "L", color: "Black" }, inventoryQuantity: 15 },
          { id: "var-001-bk-xl", name: "Black / XL", options: { size: "XL", color: "Black" }, inventoryQuantity: 10 },
          { id: "var-001-wh-m", name: "White / M", options: { size: "M", color: "White" }, inventoryQuantity: 10 },
          { id: "var-001-wh-l", name: "White / L", options: { size: "L", color: "White" }, inventoryQuantity: 10 },
          { id: "var-001-rd-l", name: "Red / L", options: { size: "L", color: "Red" }, inventoryQuantity: 10 },
        ],
        requiresShipping: true,
        weight: 200, // grams
        shippingPrice: 599, // $5.99
        status: "ACTIVE" as const,
        seoTitle: "Classic Stepper Tee | Steppin' Apparel Co.",
        seoDescription: "Premium cotton t-shirt with Steppers Life logo. Comfortable, breathable, perfect for dancing.",
      },

      // 2. Premium Dance Shoes - $120 (Variable - sizes)
      {
        name: "Premium Dance Shoes",
        description: "Professional-grade dance shoes designed specifically for stepping. Leather upper with suede sole for perfect glide. Cushioned insole for all-night comfort. Break them in once and they'll feel like slippers.",
        productType: "VARIABLE" as const,
        price: 12000, // $120 in cents
        sku: "SAC-SHO-001",
        inventoryQuantity: 50,
        trackInventory: true,
        allowBackorder: false,
        category: "Footwear",
        tags: ["shoes", "leather", "dance", "professional", "stepping"],
        primaryImage: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
        images: [
          "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
          "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800",
        ],
        attributes: [
          {
            id: "attr_shoesize_001",
            name: "Size",
            slug: "size",
            values: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"],
            isVariation: true,
            isVisible: true,
            sortOrder: 1,
          },
          {
            id: "attr_width_001",
            name: "Width",
            slug: "width",
            values: ["Regular", "Wide"],
            isVariation: true,
            isVisible: true,
            sortOrder: 2,
          },
        ],
        hasVariants: true,
        variants: [
          { id: "var-sho-9r", name: "9 / Regular", options: { size: "9" }, inventoryQuantity: 5 },
          { id: "var-sho-95r", name: "9.5 / Regular", options: { size: "9.5" }, inventoryQuantity: 5 },
          { id: "var-sho-10r", name: "10 / Regular", options: { size: "10" }, inventoryQuantity: 8 },
          { id: "var-sho-105r", name: "10.5 / Regular", options: { size: "10.5" }, inventoryQuantity: 6 },
          { id: "var-sho-11r", name: "11 / Regular", options: { size: "11" }, inventoryQuantity: 8 },
          { id: "var-sho-12r", name: "12 / Regular", options: { size: "12" }, inventoryQuantity: 5 },
          { id: "var-sho-10w", name: "10 / Wide", options: { size: "10" }, inventoryQuantity: 4 },
          { id: "var-sho-11w", name: "11 / Wide", options: { size: "11" }, inventoryQuantity: 4 },
        ],
        requiresShipping: true,
        weight: 800, // grams
        shippingPrice: 999, // $9.99
        status: "ACTIVE" as const,
        seoTitle: "Premium Dance Shoes | Steppin' Apparel Co.",
        seoDescription: "Professional stepping shoes with leather upper and suede sole. Built for comfort and performance.",
      },

      // 3. Steppers Life Hat - $25 (Simple product)
      {
        name: "Steppers Life Hat",
        description: "Classic snapback hat with embroidered 'Steppers Life' logo. Adjustable strap fits all sizes. Perfect for completing your look at any stepping event.",
        productType: "SIMPLE" as const,
        price: 2500, // $25 in cents
        sku: "SAC-HAT-001",
        inventoryQuantity: 75,
        trackInventory: true,
        allowBackorder: true,
        category: "Accessories",
        tags: ["hat", "snapback", "logo", "adjustable", "unisex"],
        primaryImage: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800",
        images: [
          "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800",
        ],
        hasVariants: false,
        requiresShipping: true,
        weight: 100, // grams
        shippingPrice: 499, // $4.99
        status: "ACTIVE" as const,
        seoTitle: "Steppers Life Hat | Steppin' Apparel Co.",
        seoDescription: "Embroidered snapback hat with Steppers Life logo. Adjustable fit, classic style.",
      },

      // 4. Weekend Warrior Bundle - $150 (Simple - bundle)
      {
        name: "Weekend Warrior Bundle",
        description: "Everything you need for a stepping weekender! Includes: 2 Classic Stepper Tees (your choice of colors), 1 Steppers Life Hat, 1 pair of stepping socks, and a branded garment bag. Save over $30 compared to buying separately!",
        productType: "SIMPLE" as const,
        price: 15000, // $150 in cents
        compareAtPrice: 18500, // Was $185
        sku: "SAC-BUN-001",
        inventoryQuantity: 25,
        trackInventory: true,
        allowBackorder: false,
        category: "Bundles",
        tags: ["bundle", "weekender", "value", "gift", "bestseller"],
        primaryImage: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800",
        images: [
          "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800",
          "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800",
        ],
        hasVariants: false,
        requiresShipping: true,
        weight: 600, // grams
        shippingPrice: 0, // Free shipping on bundles
        status: "ACTIVE" as const,
        seoTitle: "Weekend Warrior Bundle | Steppin' Apparel Co.",
        seoDescription: "Complete stepping weekender kit: 2 tees, hat, socks, and garment bag. Save over $30!",
      },
    ];

    const results: { name: string; created: boolean; productId?: string }[] = [];

    for (const productData of products) {
      // Check if product already exists
      const existing = await ctx.db
        .query("products")
        .withIndex("by_sku", (q) => q.eq("sku", productData.sku))
        .unique();

      if (existing) {
        results.push({ name: productData.name, created: false, productId: existing._id });
        continue;
      }

      // Create the product
      const productId = await ctx.db.insert("products", {
        ...productData,
        createdBy: vendorOwner._id,
        vendorId: vendor._id,
        vendorName: vendor.name,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ name: productData.name, created: true, productId });
    }

    // Update vendor's product count
    const createdCount = results.filter((r) => r.created).length;
    if (createdCount > 0) {
      await ctx.db.patch(vendor._id, {
        totalProducts: (vendor.totalProducts || 0) + createdCount,
        updatedAt: now,
      });
    }

    return {
      vendorCreated: true,
      productsCreated: createdCount,
      totalProducts: products.length,
      products: results,
    };
  },
});
