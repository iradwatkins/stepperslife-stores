import { mutation } from "../_generated/server";

// Comprehensive marketplace seed with realistic vendors, products, and sample orders
export const seedMarketplace = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if we already have vendors
    const existingVendors = await ctx.db.query("vendors").collect();
    if (existingVendors.length > 0) {
      return {
        message: "Marketplace already has data. Use clearMarketplace first to reset.",
        vendorCount: existingVendors.length
      };
    }

    // Get an admin user to be the creator
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (!adminUser) {
      throw new Error("No admin user found. Please create an admin user first.");
    }

    // ==========================================
    // VENDORS - Realistic stepping culture businesses
    // ==========================================
    const vendors = [
      {
        ownerId: adminUser._id,
        name: "Chi-Town Steppers Apparel",
        slug: "chi-town-steppers-apparel",
        description: "Premium stepping attire designed by steppers, for steppers. Based in Chicago, we've been outfitting the stepping community since 2015 with quality dancewear that moves with you on the floor.",
        contactName: "Marcus Thompson",
        contactEmail: "marcus@chitownsteppers.com",
        contactPhone: "(312) 555-0142",
        businessType: "llc",
        address: "4521 S. King Drive",
        city: "Chicago",
        state: "IL",
        zipCode: "60653",
        categories: ["Apparel & Fashion", "Dance Supplies"],
        commissionPercent: 12,
        website: "https://chitownsteppers.example.com",
        logoUrl: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200&h=200&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
        status: "APPROVED" as const,
        isActive: true,
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
        createdAt: now - 90 * 24 * 60 * 60 * 1000, // 90 days ago
        updatedAt: now,
      },
      {
        ownerId: adminUser._id,
        name: "Soul & Rhythm Jewelry",
        slug: "soul-rhythm-jewelry",
        description: "Handcrafted jewelry celebrating African-American culture and the art of stepping. Each piece tells a story of rhythm, soul, and community. Custom orders welcome.",
        contactName: "Angela Robinson",
        contactEmail: "angela@soulrhythm.com",
        contactPhone: "(404) 555-0288",
        businessType: "individual",
        address: "890 Peachtree St NE",
        city: "Atlanta",
        state: "GA",
        zipCode: "30309",
        categories: ["Accessories & Jewelry", "Handmade & Crafts"],
        commissionPercent: 15,
        website: "https://soulrhythmjewelry.example.com",
        logoUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1200&h=400&fit=crop",
        status: "APPROVED" as const,
        isActive: true,
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
        createdAt: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        updatedAt: now,
      },
      {
        ownerId: adminUser._id,
        name: "Smooth Moves Dance Supply",
        slug: "smooth-moves-dance",
        description: "Your one-stop shop for professional dance shoes and accessories. We specialize in shoes perfect for stepping, ballroom, and social dancing. Free shipping on orders over $100!",
        contactName: "Robert Williams",
        contactEmail: "robert@smoothmoves.com",
        contactPhone: "(214) 555-0377",
        businessType: "llc",
        address: "2100 Commerce St",
        city: "Dallas",
        state: "TX",
        zipCode: "75201",
        categories: ["Dance Supplies", "Accessories & Jewelry"],
        commissionPercent: 10,
        website: "https://smoothmovesdance.example.com",
        logoUrl: "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=200&h=200&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=1200&h=400&fit=crop",
        status: "APPROVED" as const,
        isActive: true,
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
        createdAt: now - 45 * 24 * 60 * 60 * 1000, // 45 days ago
        updatedAt: now,
      },
      {
        ownerId: adminUser._id,
        name: "Heritage Arts & Prints",
        slug: "heritage-arts-prints",
        description: "Fine art prints and canvas art celebrating Black culture, dance, and community. Our artists capture the beauty and energy of stepping in every piece. Perfect for home or studio.",
        contactName: "Denise Carter",
        contactEmail: "denise@heritagearts.com",
        contactPhone: "(313) 555-0455",
        businessType: "llc",
        address: "1500 Woodward Ave",
        city: "Detroit",
        state: "MI",
        zipCode: "48226",
        categories: ["Art & Prints", "Home & Decor"],
        commissionPercent: 15,
        logoUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&h=400&fit=crop",
        status: "APPROVED" as const,
        isActive: true,
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
        createdAt: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        updatedAt: now,
      },
      {
        ownerId: adminUser._id,
        name: "Groove Essentials",
        slug: "groove-essentials",
        description: "Event supplies, DJ equipment rentals, and party essentials for stepping events. We help organizers create unforgettable experiences. Serving the Midwest region.",
        contactName: "Kevin Jackson",
        contactEmail: "kevin@grooveessentials.com",
        contactPhone: "(314) 555-0599",
        businessType: "llc",
        address: "3400 Market St",
        city: "St. Louis",
        state: "MO",
        zipCode: "63103",
        categories: ["Event Supplies", "Digital Products"],
        commissionPercent: 12,
        logoUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=400&fit=crop",
        status: "APPROVED" as const,
        isActive: true,
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        totalPaidOut: 0,
        createdAt: now - 15 * 24 * 60 * 60 * 1000, // 15 days ago
        updatedAt: now,
      },
    ];

    // Insert vendors and store IDs
    const vendorIds: Record<string, any> = {};
    for (const vendor of vendors) {
      const vendorId = await ctx.db.insert("vendors", vendor);
      vendorIds[vendor.slug] = vendorId;
    }

    // ==========================================
    // PRODUCTS - Comprehensive catalog
    // ==========================================
    const products = [
      // --------- CHI-TOWN STEPPERS APPAREL ---------
      {
        name: "Classic Stepping Polo - Premium",
        description: "Our signature moisture-wicking polo designed for stepping. Features breathable mesh panels, tailored fit that moves with you, and reinforced seams for durability. The perfect blend of style and function for any stepping event.",
        price: 5999, // $59.99
        compareAtPrice: 7999,
        sku: "CTS-POLO-001",
        inventoryQuantity: 120,
        trackInventory: true,
        category: "Apparel & Fashion",
        tags: ["polo", "stepping", "dancewear", "mens", "premium", "moisture-wicking"],
        primaryImage: "https://images.unsplash.com/photo-1625910513413-5fc28a3b04e3?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&h=600&fit=crop",
          "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop",
        ],
        hasVariants: true,
        variants: [
          { id: "polo-s-black", name: "Small / Black", sku: "CTS-POLO-001-S-BLK", options: { size: "S", color: "Black" }, inventoryQuantity: 15 },
          { id: "polo-m-black", name: "Medium / Black", sku: "CTS-POLO-001-M-BLK", options: { size: "M", color: "Black" }, inventoryQuantity: 25 },
          { id: "polo-l-black", name: "Large / Black", sku: "CTS-POLO-001-L-BLK", options: { size: "L", color: "Black" }, inventoryQuantity: 25 },
          { id: "polo-xl-black", name: "XL / Black", sku: "CTS-POLO-001-XL-BLK", options: { size: "XL", color: "Black" }, inventoryQuantity: 15 },
          { id: "polo-2xl-black", name: "2XL / Black", sku: "CTS-POLO-001-2XL-BLK", options: { size: "2XL", color: "Black" }, inventoryQuantity: 10 },
          { id: "polo-s-white", name: "Small / White", sku: "CTS-POLO-001-S-WHT", options: { size: "S", color: "White" }, inventoryQuantity: 8 },
          { id: "polo-m-white", name: "Medium / White", sku: "CTS-POLO-001-M-WHT", options: { size: "M", color: "White" }, inventoryQuantity: 12 },
          { id: "polo-l-white", name: "Large / White", sku: "CTS-POLO-001-L-WHT", options: { size: "L", color: "White" }, inventoryQuantity: 10 },
        ],
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["chi-town-steppers-apparel"],
        vendorName: "Chi-Town Steppers Apparel",
        createdAt: now - 85 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Stepping Queen Fitted Tee",
        description: "Celebrate your love of stepping with this comfortable fitted t-shirt. Made from soft ringspun cotton with a modern fit. Features our exclusive 'Stepping Queen' crown design. Perfect for practice or casual events.",
        price: 3499, // $34.99
        sku: "CTS-TSHIRT-002",
        inventoryQuantity: 85,
        trackInventory: true,
        category: "Apparel & Fashion",
        tags: ["t-shirt", "womens", "casual", "stepping", "fitted", "queen"],
        primaryImage: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop",
        ],
        hasVariants: true,
        variants: [
          { id: "tshirt-xs-purple", name: "XS / Purple", options: { size: "XS", color: "Purple" }, inventoryQuantity: 10 },
          { id: "tshirt-s-purple", name: "Small / Purple", options: { size: "S", color: "Purple" }, inventoryQuantity: 20 },
          { id: "tshirt-m-purple", name: "Medium / Purple", options: { size: "M", color: "Purple" }, inventoryQuantity: 25 },
          { id: "tshirt-l-purple", name: "Large / Purple", options: { size: "L", color: "Purple" }, inventoryQuantity: 20 },
          { id: "tshirt-xl-purple", name: "XL / Purple", options: { size: "XL", color: "Purple" }, inventoryQuantity: 10 },
        ],
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["chi-town-steppers-apparel"],
        vendorName: "Chi-Town Steppers Apparel",
        createdAt: now - 80 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Premium Stepping Slacks",
        description: "Professional dress pants designed for movement. Features stretch fabric, reinforced knees, and a comfortable waistband. These slacks look sharp and let you move freely on the dance floor.",
        price: 8999, // $89.99
        compareAtPrice: 11999,
        sku: "CTS-SLACKS-001",
        inventoryQuantity: 45,
        trackInventory: true,
        category: "Apparel & Fashion",
        tags: ["pants", "slacks", "dress", "mens", "professional", "stretch"],
        primaryImage: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=600&fit=crop",
        hasVariants: true,
        variants: [
          { id: "slacks-30-black", name: "30x30 / Black", options: { size: "30x30", color: "Black" }, inventoryQuantity: 8 },
          { id: "slacks-32-black", name: "32x32 / Black", options: { size: "32x32", color: "Black" }, inventoryQuantity: 12 },
          { id: "slacks-34-black", name: "34x32 / Black", options: { size: "34x32", color: "Black" }, inventoryQuantity: 15 },
          { id: "slacks-36-black", name: "36x32 / Black", options: { size: "36x32", color: "Black" }, inventoryQuantity: 10 },
        ],
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["chi-town-steppers-apparel"],
        vendorName: "Chi-Town Steppers Apparel",
        createdAt: now - 70 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },

      // --------- SOUL & RHYTHM JEWELRY ---------
      {
        name: "Stepping Silhouette Gold Earrings",
        description: "Elegant 18K gold-plated earrings featuring a beautifully crafted stepping couple silhouette. Lightweight drop design perfect for dancing. Hypoallergenic and nickel-free. Comes in a velvet gift box.",
        price: 4499, // $44.99
        compareAtPrice: 5999,
        sku: "SRJ-EAR-001",
        inventoryQuantity: 35,
        trackInventory: true,
        category: "Accessories & Jewelry",
        tags: ["earrings", "jewelry", "handmade", "gold", "stepping", "gift"],
        primaryImage: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600&h=600&fit=crop",
        ],
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["soul-rhythm-jewelry"],
        vendorName: "Soul & Rhythm Jewelry",
        createdAt: now - 55 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Rhythm & Soul Beaded Bracelet Set",
        description: "Set of 3 handcrafted beaded bracelets in complementary earth tones. Made with natural stones and African trade beads. Adjustable elastic band fits most wrists. Each set is unique.",
        price: 2999, // $29.99
        sku: "SRJ-BRAC-001",
        inventoryQuantity: 50,
        trackInventory: true,
        category: "Accessories & Jewelry",
        tags: ["bracelet", "beaded", "handmade", "set", "african", "natural stones"],
        primaryImage: "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["soul-rhythm-jewelry"],
        vendorName: "Soul & Rhythm Jewelry",
        createdAt: now - 50 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Custom Name Necklace - Script",
        description: "Personalized nameplate necklace in elegant script font. Available in gold or silver finish. 18-inch chain with 2-inch extender. Perfect gift for the stepper in your life. Please specify name (up to 10 characters) at checkout.",
        price: 5999, // $59.99
        sku: "SRJ-NECK-001",
        inventoryQuantity: 999,
        trackInventory: false,
        category: "Accessories & Jewelry",
        tags: ["necklace", "custom", "personalized", "nameplate", "gift", "script"],
        primaryImage: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=600&fit=crop",
        hasVariants: true,
        variants: [
          { id: "neck-gold", name: "Gold Finish", options: { size: "One Size", color: "Gold" }, inventoryQuantity: 999 },
          { id: "neck-silver", name: "Silver Finish", options: { size: "One Size", color: "Silver" }, inventoryQuantity: 999 },
        ],
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["soul-rhythm-jewelry"],
        vendorName: "Soul & Rhythm Jewelry",
        createdAt: now - 45 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Anklet with Charms - Sterling Silver",
        description: "Delicate sterling silver anklet with three dancing figure charms. Adjustable 9-11 inch length. Perfect for showing off on the dance floor. Tarnish-resistant finish.",
        price: 3999, // $39.99
        sku: "SRJ-ANK-001",
        inventoryQuantity: 28,
        trackInventory: true,
        category: "Accessories & Jewelry",
        tags: ["anklet", "silver", "charms", "dancing", "sterling"],
        primaryImage: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["soul-rhythm-jewelry"],
        vendorName: "Soul & Rhythm Jewelry",
        createdAt: now - 40 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },

      // --------- SMOOTH MOVES DANCE SUPPLY ---------
      {
        name: "Professional Dance Shoes - Men's Oxford",
        description: "Premium leather Oxford dance shoes designed for stepping and ballroom. Features suede sole for perfect pivots, cushioned insole for all-night comfort, and reinforced heel counter. Break-in time: minimal. These are the shoes serious steppers choose.",
        price: 14999, // $149.99
        compareAtPrice: 19999,
        sku: "SMD-SHOE-M001",
        inventoryQuantity: 32,
        trackInventory: true,
        category: "Dance Supplies",
        tags: ["shoes", "dance", "mens", "leather", "oxford", "professional"],
        primaryImage: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=600&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&h=600&fit=crop",
        ],
        hasVariants: true,
        variants: [
          { id: "shoe-m-8", name: "Size 8", options: { size: "8", color: "Black" }, inventoryQuantity: 4 },
          { id: "shoe-m-8.5", name: "Size 8.5", options: { size: "8.5", color: "Black" }, inventoryQuantity: 5 },
          { id: "shoe-m-9", name: "Size 9", options: { size: "9", color: "Black" }, inventoryQuantity: 6 },
          { id: "shoe-m-9.5", name: "Size 9.5", options: { size: "9.5", color: "Black" }, inventoryQuantity: 5 },
          { id: "shoe-m-10", name: "Size 10", options: { size: "10", color: "Black" }, inventoryQuantity: 6 },
          { id: "shoe-m-10.5", name: "Size 10.5", options: { size: "10.5", color: "Black" }, inventoryQuantity: 3 },
          { id: "shoe-m-11", name: "Size 11", options: { size: "11", color: "Black" }, inventoryQuantity: 2 },
          { id: "shoe-m-12", name: "Size 12", options: { size: "12", color: "Black" }, inventoryQuantity: 1 },
        ],
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["smooth-moves-dance"],
        vendorName: "Smooth Moves Dance Supply",
        createdAt: now - 40 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Women's Character Dance Heel",
        description: "Elegant 2.5 inch heel perfect for stepping and ballroom. Padded insole, adjustable ankle strap, and suede sole. Available in classic black or nude. These heels are made for dancing!",
        price: 12999, // $129.99
        sku: "SMD-SHOE-W001",
        inventoryQuantity: 40,
        trackInventory: true,
        category: "Dance Supplies",
        tags: ["shoes", "dance", "womens", "heels", "character", "ballroom"],
        primaryImage: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=600&fit=crop",
        hasVariants: true,
        variants: [
          { id: "shoe-w-6-black", name: "Size 6 / Black", options: { size: "6", color: "Black" }, inventoryQuantity: 5 },
          { id: "shoe-w-6.5-black", name: "Size 6.5 / Black", options: { size: "6.5", color: "Black" }, inventoryQuantity: 6 },
          { id: "shoe-w-7-black", name: "Size 7 / Black", options: { size: "7", color: "Black" }, inventoryQuantity: 8 },
          { id: "shoe-w-7.5-black", name: "Size 7.5 / Black", options: { size: "7.5", color: "Black" }, inventoryQuantity: 7 },
          { id: "shoe-w-8-black", name: "Size 8 / Black", options: { size: "8", color: "Black" }, inventoryQuantity: 6 },
          { id: "shoe-w-8.5-black", name: "Size 8.5 / Black", options: { size: "8.5", color: "Black" }, inventoryQuantity: 4 },
          { id: "shoe-w-9-black", name: "Size 9 / Black", options: { size: "9", color: "Black" }, inventoryQuantity: 4 },
        ],
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["smooth-moves-dance"],
        vendorName: "Smooth Moves Dance Supply",
        createdAt: now - 35 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Premium Dance Bag - Large",
        description: "Spacious dance bag with separate ventilated shoe compartment, water bottle holder, and multiple interior pockets. Durable nylon construction with reinforced bottom. Fits everything you need for a night of stepping.",
        price: 6999, // $69.99
        sku: "SMD-BAG-001",
        inventoryQuantity: 45,
        trackInventory: true,
        category: "Dance Supplies",
        tags: ["bag", "dance", "accessories", "large", "storage"],
        primaryImage: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop",
        hasVariants: true,
        variants: [
          { id: "bag-black", name: "Black", options: { size: "Large", color: "Black" }, inventoryQuantity: 25 },
          { id: "bag-purple", name: "Purple", options: { size: "Large", color: "Purple" }, inventoryQuantity: 12 },
          { id: "bag-red", name: "Red", options: { size: "Large", color: "Red" }, inventoryQuantity: 8 },
        ],
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["smooth-moves-dance"],
        vendorName: "Smooth Moves Dance Supply",
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Suede Sole Brush Kit",
        description: "Keep your dance shoes in perfect condition with this professional brush kit. Includes wire brush for cleaning, soft brush for buffing, and carrying pouch. Essential for maintaining your suede soles.",
        price: 1999, // $19.99
        sku: "SMD-BRUSH-001",
        inventoryQuantity: 75,
        trackInventory: true,
        category: "Dance Supplies",
        tags: ["brush", "shoe care", "suede", "maintenance", "kit"],
        primaryImage: "https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["smooth-moves-dance"],
        vendorName: "Smooth Moves Dance Supply",
        createdAt: now - 25 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },

      // --------- HERITAGE ARTS & PRINTS ---------
      {
        name: "Chicago Stepping - Canvas Art Print 24x36",
        description: "Stunning gallery-quality canvas print celebrating Chicago stepping culture. Vibrant colors on museum-grade canvas, stretched on wooden frame. Ready to hang. This piece captures the elegance and joy of stepping.",
        price: 12999, // $129.99
        compareAtPrice: 16999,
        sku: "HAP-CANVAS-001",
        inventoryQuantity: 15,
        trackInventory: true,
        category: "Art & Prints",
        tags: ["art", "canvas", "chicago", "stepping", "wall art", "gallery"],
        primaryImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["heritage-arts-prints"],
        vendorName: "Heritage Arts & Prints",
        createdAt: now - 25 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Dancing Couple Silhouette - Framed Print",
        description: "Elegant black and white silhouette art in a beautiful wooden frame. 16x20 inches, ready to hang. Perfect for home, studio, or as a gift. Printed on archival paper that won't fade.",
        price: 7999, // $79.99
        sku: "HAP-FRAME-001",
        inventoryQuantity: 22,
        trackInventory: true,
        category: "Art & Prints",
        tags: ["art", "framed", "silhouette", "black white", "couple", "dancing"],
        primaryImage: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["heritage-arts-prints"],
        vendorName: "Heritage Arts & Prints",
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Stepping Legacy Photo Book",
        description: "Beautiful hardcover coffee table book featuring 150+ pages of stepping photography and history. Chronicles the evolution of Chicago stepping from the 1970s to today. Perfect gift for any stepping enthusiast.",
        price: 4999, // $49.99
        sku: "HAP-BOOK-001",
        inventoryQuantity: 30,
        trackInventory: true,
        category: "Art & Prints",
        tags: ["book", "photography", "history", "chicago", "hardcover", "gift"],
        primaryImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["heritage-arts-prints"],
        vendorName: "Heritage Arts & Prints",
        createdAt: now - 15 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },

      // --------- GROOVE ESSENTIALS ---------
      {
        name: "SteppersLife Annual Membership",
        description: "Get exclusive access to member-only events, early ticket access, 10% discount at all participating vendors, and access to our online stepping tutorial library. Digital membership card delivered instantly via email.",
        price: 4999, // $49.99
        sku: "GE-MEMBER-001",
        inventoryQuantity: 999,
        trackInventory: false,
        category: "Digital Products",
        tags: ["membership", "digital", "exclusive", "discount", "annual"],
        primaryImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: false,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["groove-essentials"],
        vendorName: "Groove Essentials",
        createdAt: now - 12 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Chicago Stepping Basics - Video Course",
        description: "Learn the fundamentals of Chicago stepping from master instructors. 8-hour video course with 25 lessons covering basic steps, timing, turns, and partner work. Lifetime access. Stream on any device.",
        price: 7999, // $79.99
        compareAtPrice: 9999,
        sku: "GE-COURSE-001",
        inventoryQuantity: 999,
        trackInventory: false,
        category: "Digital Products",
        tags: ["course", "video", "lessons", "basics", "tutorial", "online"],
        primaryImage: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: false,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["groove-essentials"],
        vendorName: "Groove Essentials",
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
      {
        name: "Stepping Music Playlist - USB Drive",
        description: "Curated collection of 100+ classic stepping songs on a branded USB drive. Includes R&B, soul, and contemporary tracks perfect for stepping. Works with any DJ equipment or computer.",
        price: 2999, // $29.99
        sku: "GE-USB-001",
        inventoryQuantity: 50,
        trackInventory: true,
        category: "Digital Products",
        tags: ["music", "usb", "playlist", "r&b", "soul", "dj"],
        primaryImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
        hasVariants: false,
        requiresShipping: true,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        vendorId: vendorIds["groove-essentials"],
        vendorName: "Groove Essentials",
        createdAt: now - 8 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },

      // --------- PLATFORM PRODUCTS (No Vendor) ---------
      {
        name: "SteppersLife Gift Card",
        description: "Give the gift of choice! SteppersLife gift cards can be used for any product in our marketplace or for event tickets. Digital delivery via email. Never expires.",
        price: 5000, // $50.00
        sku: "SL-GIFT-50",
        inventoryQuantity: 999,
        trackInventory: false,
        category: "Gift Cards",
        tags: ["gift card", "digital", "gift", "voucher"],
        primaryImage: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&h=600&fit=crop",
        hasVariants: true,
        variants: [
          { id: "gc-25", name: "$25 Gift Card", price: 2500, options: { size: "$25", color: "Digital" }, inventoryQuantity: 999 },
          { id: "gc-50", name: "$50 Gift Card", price: 5000, options: { size: "$50", color: "Digital" }, inventoryQuantity: 999 },
          { id: "gc-100", name: "$100 Gift Card", price: 10000, options: { size: "$100", color: "Digital" }, inventoryQuantity: 999 },
          { id: "gc-200", name: "$200 Gift Card", price: 20000, options: { size: "$200", color: "Digital" }, inventoryQuantity: 999 },
        ],
        requiresShipping: false,
        status: "ACTIVE" as const,
        createdBy: adminUser._id,
        createdAt: now - 5 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      },
    ];

    // Insert products and update vendor counts
    let productCount = 0;
    for (const product of products) {
      await ctx.db.insert("products", product);
      productCount++;

      // Update vendor product count if it's a vendor product
      if (product.vendorId) {
        const vendor = await ctx.db
          .query("vendors")
          .filter((q) => q.eq(q.field("_id"), product.vendorId))
          .first();
        if (vendor) {
          await ctx.db.patch(product.vendorId, {
            totalProducts: (vendor.totalProducts || 0) + 1,
            updatedAt: now,
          });
        }
      }
    }

    // Note: Sample orders removed - they require valid product IDs
    // Orders should be created through the normal checkout flow

    return {
      message: "Marketplace seeded successfully!",
      vendorCount: vendors.length,
      productCount: productCount,
    };
  },
});

// Clear all marketplace data (for testing/reset)
export const clearMarketplace = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all products
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    // Delete all vendors
    const vendors = await ctx.db.query("vendors").collect();
    for (const vendor of vendors) {
      await ctx.db.delete(vendor._id);
    }

    // Delete all product orders
    const orders = await ctx.db.query("productOrders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
    }

    // Delete vendor earnings
    const earnings = await ctx.db.query("vendorEarnings").collect();
    for (const earning of earnings) {
      await ctx.db.delete(earning._id);
    }

    return {
      message: "Marketplace cleared completely",
      productsDeleted: products.length,
      vendorsDeleted: vendors.length,
      ordersDeleted: orders.length,
      earningsDeleted: earnings.length,
    };
  },
});
