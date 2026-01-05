import { mutation } from "../_generated/server";

// Comprehensive restaurant seed with realistic stepper-friendly establishments
export const seedRestaurants = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if we already have restaurants
    const existingRestaurants = await ctx.db.query("restaurants").collect();
    if (existingRestaurants.length > 0) {
      return {
        message: "Restaurants already exist. Use clearRestaurants first to reset.",
        restaurantCount: existingRestaurants.length
      };
    }

    // Get an admin user to be the owner
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (!adminUser) {
      throw new Error("No admin user found. Please create an admin user first.");
    }

    // ==========================================
    // RESTAURANTS - Stepper-friendly establishments
    // ==========================================
    const restaurants = [
      {
        ownerId: adminUser._id,
        name: "Soul Food Spot",
        slug: "soul-food-spot",
        description: "Authentic Southern soul food with a stepping-friendly atmosphere. Live music on weekends, great for before or after stepping events.",
        address: "4521 S. King Drive",
        city: "Chicago",
        state: "IL",
        zipCode: "60653",
        phone: "(312) 555-0142",
        cuisine: ["Soul Food", "Southern", "American"],
        logoUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop",
        operatingHours: {
          monday: { open: "11:00", close: "22:00" },
          tuesday: { open: "11:00", close: "22:00" },
          wednesday: { open: "11:00", close: "22:00" },
          thursday: { open: "11:00", close: "23:00" },
          friday: { open: "11:00", close: "02:00" },
          saturday: { open: "11:00", close: "02:00" },
          sunday: { open: "12:00", close: "20:00" },
        },
        isOpenLateNight: true,
        lateNightDays: ["friday", "saturday"],
        dressCode: "smart-casual" as const,
        vibeTags: ["energetic", "lounge"],
        priceRange: "$$" as const,
        groupInfo: {
          maxPartySize: 20,
          groupDiscounts: true,
          privateRoomAvailable: true,
          minimumForGroup: 50,
        },
        entertainment: {
          hasLiveMusic: true,
          hasDJ: true,
          musicGenres: ["r&b", "steppin", "jazz"],
          entertainmentNights: ["friday", "saturday"],
        },
        acceptingOrders: true,
        estimatedPickupTime: 25,
        isActive: true,
        applicationStatus: "APPROVED" as const,
      },
      {
        ownerId: adminUser._id,
        name: "Harold's Chicken Shack",
        slug: "harolds-chicken-shack",
        description: "Chicago's famous fried chicken, perfect for late-night cravings after stepping. Quick service, incredible flavor.",
        address: "7310 S. Halsted St",
        city: "Chicago",
        state: "IL",
        zipCode: "60621",
        phone: "(773) 555-0289",
        cuisine: ["Fried Chicken", "Soul Food", "Fast Food"],
        logoUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=200&h=200&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&h=400&fit=crop",
        operatingHours: {
          monday: { open: "10:00", close: "23:00" },
          tuesday: { open: "10:00", close: "23:00" },
          wednesday: { open: "10:00", close: "23:00" },
          thursday: { open: "10:00", close: "00:00" },
          friday: { open: "10:00", close: "03:00" },
          saturday: { open: "10:00", close: "03:00" },
          sunday: { open: "11:00", close: "22:00" },
        },
        isOpenLateNight: true,
        lateNightDays: ["friday", "saturday"],
        dressCode: "casual" as const,
        vibeTags: ["energetic"],
        priceRange: "$" as const,
        groupInfo: {
          maxPartySize: 10,
          groupDiscounts: false,
          privateRoomAvailable: false,
        },
        acceptingOrders: true,
        estimatedPickupTime: 15,
        isActive: true,
        applicationStatus: "APPROVED" as const,
      },
      {
        ownerId: adminUser._id,
        name: "The Velvet Lounge",
        slug: "velvet-lounge",
        description: "Upscale dining with a sophisticated atmosphere. Perfect for pre-stepping dinner dates. Premium cocktails and contemporary American cuisine.",
        address: "234 E. 47th St",
        city: "Chicago",
        state: "IL",
        zipCode: "60615",
        phone: "(312) 555-0456",
        cuisine: ["Contemporary American", "Cocktails", "Fine Dining"],
        logoUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=200&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&h=400&fit=crop",
        operatingHours: {
          monday: { open: "17:00", close: "23:00" },
          tuesday: { open: "17:00", close: "23:00" },
          wednesday: { open: "17:00", close: "23:00" },
          thursday: { open: "17:00", close: "00:00" },
          friday: { open: "17:00", close: "02:00" },
          saturday: { open: "17:00", close: "02:00" },
          sunday: { open: "16:00", close: "22:00" },
        },
        isOpenLateNight: true,
        lateNightDays: ["friday", "saturday"],
        dressCode: "upscale" as const,
        vibeTags: ["intimate", "romantic", "lounge"],
        priceRange: "$$$" as const,
        groupInfo: {
          maxPartySize: 15,
          groupDiscounts: true,
          privateRoomAvailable: true,
          minimumForGroup: 100,
        },
        entertainment: {
          hasLiveMusic: true,
          hasDJ: false,
          musicGenres: ["jazz", "r&b"],
          entertainmentNights: ["friday", "saturday"],
        },
        acceptingOrders: true,
        estimatedPickupTime: 35,
        isActive: true,
        applicationStatus: "APPROVED" as const,
      },
      {
        ownerId: adminUser._id,
        name: "Rhythm & Blues BBQ",
        slug: "rhythm-blues-bbq",
        description: "Slow-smoked BBQ with a blues soundtrack. After-party favorite with generous portions and late-night hours. Best ribs in the city!",
        address: "5600 S. Cottage Grove Ave",
        city: "Chicago",
        state: "IL",
        zipCode: "60637",
        phone: "(773) 555-0734",
        cuisine: ["BBQ", "Soul Food", "American"],
        logoUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=200&h=200&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&h=400&fit=crop",
        operatingHours: {
          monday: { open: "11:00", close: "21:00" },
          tuesday: { open: "11:00", close: "21:00" },
          wednesday: { open: "11:00", close: "22:00" },
          thursday: { open: "11:00", close: "23:00" },
          friday: { open: "11:00", close: "03:00" },
          saturday: { open: "11:00", close: "03:00" },
          sunday: { open: "12:00", close: "20:00" },
        },
        isOpenLateNight: true,
        lateNightDays: ["friday", "saturday"],
        dressCode: "casual" as const,
        vibeTags: ["energetic", "lounge"],
        priceRange: "$$" as const,
        groupInfo: {
          maxPartySize: 25,
          groupDiscounts: true,
          privateRoomAvailable: false,
        },
        entertainment: {
          hasLiveMusic: true,
          hasDJ: false,
          musicGenres: ["blues", "r&b"],
          entertainmentNights: ["friday", "saturday"],
        },
        acceptingOrders: true,
        estimatedPickupTime: 30,
        isActive: true,
        applicationStatus: "APPROVED" as const,
      },
      {
        ownerId: adminUser._id,
        name: "Sweet Georgia's Kitchen",
        slug: "sweet-georgias-kitchen",
        description: "Homestyle Southern cooking just like grandma used to make. Famous for our fried catfish, collard greens, and peach cobbler. Family-owned for 30 years.",
        address: "1200 E. 87th St",
        city: "Chicago",
        state: "IL",
        zipCode: "60619",
        phone: "(773) 555-0923",
        cuisine: ["Southern", "Soul Food", "Breakfast"],
        logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&h=400&fit=crop",
        operatingHours: {
          monday: { open: "07:00", close: "20:00" },
          tuesday: { open: "07:00", close: "20:00" },
          wednesday: { open: "07:00", close: "20:00" },
          thursday: { open: "07:00", close: "21:00" },
          friday: { open: "07:00", close: "22:00" },
          saturday: { open: "08:00", close: "22:00" },
          sunday: { open: "08:00", close: "18:00" },
        },
        isOpenLateNight: false,
        dressCode: "casual" as const,
        vibeTags: ["intimate"],
        priceRange: "$" as const,
        groupInfo: {
          maxPartySize: 12,
          groupDiscounts: false,
          privateRoomAvailable: false,
        },
        acceptingOrders: true,
        estimatedPickupTime: 20,
        isActive: true,
        applicationStatus: "APPROVED" as const,
      },
    ];

    // Insert all restaurants
    const restaurantIds = [];
    for (const restaurant of restaurants) {
      const id = await ctx.db.insert("restaurants", {
        ...restaurant,
        createdAt: now - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000, // Random date within last 90 days
        updatedAt: now,
      });
      restaurantIds.push(id);
    }

    return {
      message: `Successfully seeded ${restaurantIds.length} restaurants`,
      restaurantIds,
    };
  },
});

// Clear all test restaurant data
export const clearRestaurants = mutation({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();

    for (const restaurant of restaurants) {
      await ctx.db.delete(restaurant._id);
    }

    return {
      message: `Cleared ${restaurants.length} restaurants`,
      count: restaurants.length,
    };
  },
});
