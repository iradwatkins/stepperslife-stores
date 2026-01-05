import { internalMutation } from "../_generated/server";

// Seed test restaurants
export const seedRestaurants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get the restaurant owner user
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "restaurant@thestepperslife.com"))
      .unique();

    if (!owner) {
      throw new Error("Restaurant owner not found. Run seedUsers first.");
    }

    const restaurantsData = [
      // 1. Soul Food Spot - Chicago
      {
        restaurant: {
          name: "Soul Food Spot",
          slug: "soul-food-spot",
          description: "Authentic Southern soul food in the heart of Chicago. Known for our slow-cooked meats, signature mac & cheese, and warm hospitality. A favorite gathering spot for steppers before and after events.",
          ownerId: owner._id,
          address: "123 State Street",
          city: "Chicago",
          state: "IL",
          zipCode: "60601",
          phone: "(312) 555-0101",
          cuisine: ["Soul Food", "Southern", "American"],
          operatingHours: {
            monday: { open: "11:00", close: "22:00" },
            tuesday: { open: "11:00", close: "22:00" },
            wednesday: { open: "11:00", close: "22:00" },
            thursday: { open: "11:00", close: "23:00" },
            friday: { open: "11:00", close: "02:00" },
            saturday: { open: "12:00", close: "02:00" },
            sunday: { open: "12:00", close: "21:00" },
          },
          isOpenLateNight: true,
          lateNightDays: ["friday", "saturday"],
          dressCode: "smart-casual" as const,
          vibeTags: ["soulful", "family-friendly", "stepper-hangout", "late-night"],
          priceRange: "$$" as const,
          groupInfo: {
            maxPartySize: 20,
            groupDiscounts: true,
            privateRoomAvailable: true,
            minimumForGroup: 100,
          },
          entertainment: {
            hasLiveMusic: true,
            hasDJ: true,
            musicGenres: ["r&b", "soul", "steppin"],
            entertainmentNights: ["friday", "saturday"],
          },
          acceptingOrders: true,
          estimatedPickupTime: 25,
          isActive: true,
          applicationStatus: "APPROVED" as const,
          subscriptionTier: "PROFESSIONAL" as const,
          subscriptionStatus: "ACTIVE" as const,
          createdAt: now,
          updatedAt: now,
        },
        categories: [
          { name: "Appetizers", description: "Start your meal right", sortOrder: 1 },
          { name: "Entrees", description: "Our signature main dishes", sortOrder: 2 },
          { name: "Sides", description: "Perfect complements", sortOrder: 3 },
          { name: "Desserts", description: "Sweet endings", sortOrder: 4 },
          { name: "Drinks", description: "Beverages", sortOrder: 5 },
        ],
        menuItems: [
          // Appetizers
          { category: "Appetizers", name: "Fried Green Tomatoes", description: "Crispy cornmeal-crusted green tomatoes with remoulade", price: 1299, sortOrder: 1 },
          { category: "Appetizers", name: "Loaded Potato Skins", description: "Bacon, cheddar, sour cream, chives", price: 1099, sortOrder: 2 },
          { category: "Appetizers", name: "Wings (10 pc)", description: "Choose: Buffalo, BBQ, Lemon Pepper, or Honey Garlic", price: 1499, sortOrder: 3 },
          // Entrees
          { category: "Entrees", name: "Smothered Pork Chops", description: "Two bone-in chops smothered in gravy with onions", price: 2199, sortOrder: 1 },
          { category: "Entrees", name: "Fried Catfish Plate", description: "Hand-breaded catfish fillets, served with two sides", price: 1899, sortOrder: 2 },
          { category: "Entrees", name: "Southern Fried Chicken", description: "Half chicken, buttermilk brined and fried crispy", price: 1799, sortOrder: 3 },
          { category: "Entrees", name: "BBQ Beef Ribs", description: "Fall-off-the-bone ribs with house BBQ sauce", price: 2499, sortOrder: 4 },
          { category: "Entrees", name: "Oxtails", description: "Slow-braised oxtails over rice with gravy", price: 2899, sortOrder: 5 },
          // Sides
          { category: "Sides", name: "Mac & Cheese", description: "Creamy five-cheese blend", price: 599, sortOrder: 1 },
          { category: "Sides", name: "Collard Greens", description: "Slow-cooked with smoked turkey", price: 549, sortOrder: 2 },
          { category: "Sides", name: "Candied Yams", description: "Sweet and buttery", price: 549, sortOrder: 3 },
          { category: "Sides", name: "Cornbread", description: "House-made with honey butter", price: 399, sortOrder: 4 },
          // Desserts
          { category: "Desserts", name: "Peach Cobbler", description: "Warm peach cobbler with vanilla ice cream", price: 899, sortOrder: 1 },
          { category: "Desserts", name: "Sweet Potato Pie", description: "Grandma's recipe", price: 799, sortOrder: 2 },
          // Drinks
          { category: "Drinks", name: "Fresh Lemonade", description: "House-made sweet or unsweetened", price: 399, sortOrder: 1 },
          { category: "Drinks", name: "Sweet Tea", description: "Southern style", price: 299, sortOrder: 2 },
        ],
      },

      // 2. Harold's Chicken Shack - Chicago
      {
        restaurant: {
          name: "Harold's Chicken Shack",
          slug: "harolds-chicken-shack",
          description: "Chicago's iconic fried chicken. Serving the community since 1950. Our famous mild sauce and perfectly seasoned chicken have made us a legend. Late night eats for steppers on the move.",
          ownerId: owner._id,
          address: "456 King Drive",
          city: "Chicago",
          state: "IL",
          zipCode: "60615",
          phone: "(773) 555-0202",
          cuisine: ["American", "Fast Casual", "Chicken"],
          operatingHours: {
            monday: { open: "10:00", close: "23:00" },
            tuesday: { open: "10:00", close: "23:00" },
            wednesday: { open: "10:00", close: "23:00" },
            thursday: { open: "10:00", close: "01:00" },
            friday: { open: "10:00", close: "03:00" },
            saturday: { open: "10:00", close: "03:00" },
            sunday: { open: "11:00", close: "22:00" },
          },
          isOpenLateNight: true,
          lateNightDays: ["thursday", "friday", "saturday"],
          dressCode: "casual" as const,
          vibeTags: ["quick-service", "iconic", "late-night", "stepper-approved"],
          priceRange: "$" as const,
          acceptingOrders: true,
          estimatedPickupTime: 15,
          isActive: true,
          applicationStatus: "APPROVED" as const,
          subscriptionTier: "GROWTH" as const,
          subscriptionStatus: "ACTIVE" as const,
          createdAt: now,
          updatedAt: now,
        },
        categories: [
          { name: "Chicken Dinners", description: "Our famous fried chicken", sortOrder: 1 },
          { name: "Fish Dinners", description: "Fresh fried fish", sortOrder: 2 },
          { name: "Sides", description: "All the fixings", sortOrder: 3 },
          { name: "Drinks", description: "Beverages", sortOrder: 4 },
        ],
        menuItems: [
          // Chicken Dinners
          { category: "Chicken Dinners", name: "2 Piece Dinner", description: "Wing & thigh with fries and bread", price: 899, sortOrder: 1 },
          { category: "Chicken Dinners", name: "3 Piece Dinner", description: "Wing, thigh, leg with fries and bread", price: 1199, sortOrder: 2 },
          { category: "Chicken Dinners", name: "4 Piece Dinner", description: "2 wings, thigh, leg with fries and bread", price: 1499, sortOrder: 3 },
          { category: "Chicken Dinners", name: "Half Chicken Dinner", description: "Half chicken with fries and bread", price: 1699, sortOrder: 4 },
          { category: "Chicken Dinners", name: "Whole Chicken", description: "Whole chicken only", price: 2299, sortOrder: 5 },
          { category: "Chicken Dinners", name: "10 Piece Party Pack", description: "10 pieces with large fries and rolls", price: 3499, sortOrder: 6 },
          // Fish Dinners
          { category: "Fish Dinners", name: "Perch Dinner", description: "4 pieces with fries and bread", price: 1399, sortOrder: 1 },
          { category: "Fish Dinners", name: "Catfish Dinner", description: "2 fillets with fries and bread", price: 1599, sortOrder: 2 },
          // Sides
          { category: "Sides", name: "French Fries", description: "Large order of crispy fries", price: 399, sortOrder: 1 },
          { category: "Sides", name: "Coleslaw", description: "Creamy coleslaw", price: 299, sortOrder: 2 },
          { category: "Sides", name: "Mild Sauce (Extra)", description: "Harold's famous mild sauce", price: 99, sortOrder: 3 },
          { category: "Sides", name: "Hot Sauce (Extra)", description: "For those who like it hot", price: 99, sortOrder: 4 },
          // Drinks
          { category: "Drinks", name: "Can Soda", description: "Coke, Sprite, Fanta", price: 199, sortOrder: 1 },
          { category: "Drinks", name: "Bottled Water", description: "16 oz", price: 149, sortOrder: 2 },
        ],
      },

      // 3. Steppers Lounge - Detroit
      {
        restaurant: {
          name: "Steppers Lounge",
          slug: "steppers-lounge",
          description: "Detroit's premier stepping destination. Full service bar & grill with live music and dance floor. The perfect spot to grab dinner before heading to a set, or wind down after a night of dancing.",
          ownerId: owner._id,
          address: "789 Woodward Ave",
          city: "Detroit",
          state: "MI",
          zipCode: "48226",
          phone: "(313) 555-0303",
          cuisine: ["American", "Bar & Grill", "Comfort Food"],
          operatingHours: {
            monday: { open: "16:00", close: "23:00" },
            tuesday: { open: "16:00", close: "23:00" },
            wednesday: { open: "16:00", close: "23:00" },
            thursday: { open: "16:00", close: "01:00" },
            friday: { open: "16:00", close: "03:00" },
            saturday: { open: "14:00", close: "03:00" },
            sunday: { open: "14:00", close: "22:00" },
          },
          isOpenLateNight: true,
          lateNightDays: ["friday", "saturday"],
          dressCode: "stepping-attire" as const,
          vibeTags: ["dance-floor", "live-music", "romantic", "upscale-casual"],
          priceRange: "$$" as const,
          groupInfo: {
            maxPartySize: 30,
            groupDiscounts: true,
            privateRoomAvailable: true,
            minimumForGroup: 150,
          },
          entertainment: {
            hasLiveMusic: true,
            hasDJ: true,
            musicGenres: ["r&b", "steppin", "neo-soul", "jazz"],
            entertainmentNights: ["thursday", "friday", "saturday"],
          },
          acceptingOrders: true,
          estimatedPickupTime: 30,
          isActive: true,
          applicationStatus: "APPROVED" as const,
          subscriptionTier: "PROFESSIONAL" as const,
          subscriptionStatus: "ACTIVE" as const,
          createdAt: now,
          updatedAt: now,
        },
        categories: [
          { name: "Starters", description: "Shareable apps", sortOrder: 1 },
          { name: "Burgers & Sandwiches", description: "Handhelds", sortOrder: 2 },
          { name: "Entrees", description: "Main plates", sortOrder: 3 },
          { name: "Sides", description: "A la carte", sortOrder: 4 },
          { name: "Cocktails", description: "Signature drinks", sortOrder: 5 },
        ],
        menuItems: [
          // Starters
          { category: "Starters", name: "Bourbon Bacon Bites", description: "Bacon-wrapped dates with bourbon glaze", price: 1299, sortOrder: 1 },
          { category: "Starters", name: "Crispy Calamari", description: "With spicy aioli", price: 1499, sortOrder: 2 },
          { category: "Starters", name: "Lounge Sampler", description: "Wings, sliders, and loaded fries", price: 2199, sortOrder: 3 },
          // Burgers & Sandwiches
          { category: "Burgers & Sandwiches", name: "Steppers Smash Burger", description: "Double patty, special sauce, pickles, onion", price: 1599, sortOrder: 1 },
          { category: "Burgers & Sandwiches", name: "BBQ Pulled Pork", description: "Slow-smoked pork, slaw, brioche bun", price: 1499, sortOrder: 2 },
          { category: "Burgers & Sandwiches", name: "Philly Cheesesteak", description: "Ribeye, peppers, onions, provolone", price: 1699, sortOrder: 3 },
          // Entrees
          { category: "Entrees", name: "Grilled Salmon", description: "Atlantic salmon with lemon herb butter", price: 2499, sortOrder: 1 },
          { category: "Entrees", name: "NY Strip Steak", description: "12 oz USDA Choice with garlic butter", price: 3299, sortOrder: 2 },
          { category: "Entrees", name: "Shrimp & Grits", description: "Cajun shrimp over creamy stone-ground grits", price: 2199, sortOrder: 3 },
          // Sides
          { category: "Sides", name: "Truffle Fries", description: "With parmesan and herbs", price: 799, sortOrder: 1 },
          { category: "Sides", name: "Loaded Baked Potato", description: "All the toppings", price: 699, sortOrder: 2 },
          { category: "Sides", name: "Grilled Asparagus", description: "With balsamic glaze", price: 649, sortOrder: 3 },
          // Cocktails
          { category: "Cocktails", name: "The Stepper", description: "Hennessy, honey, lemon, ginger", price: 1499, sortOrder: 1 },
          { category: "Cocktails", name: "Detroit Sunset", description: "Vodka, cranberry, orange, lime", price: 1299, sortOrder: 2 },
          { category: "Cocktails", name: "Smooth Operator", description: "Whiskey, maple, bitters, orange peel", price: 1499, sortOrder: 3 },
        ],
      },
    ];

    const results: { name: string; created: boolean; restaurantId?: string }[] = [];

    for (const data of restaurantsData) {
      // Check if restaurant already exists
      const existing = await ctx.db
        .query("restaurants")
        .withIndex("by_slug", (q) => q.eq("slug", data.restaurant.slug))
        .unique();

      if (existing) {
        results.push({ name: data.restaurant.name, created: false, restaurantId: existing._id });
        continue;
      }

      // Create the restaurant
      const restaurantId = await ctx.db.insert("restaurants", data.restaurant);

      // Create categories and track their IDs
      const categoryIds: Record<string, string> = {};
      for (const cat of data.categories) {
        const categoryId = await ctx.db.insert("menuCategories", {
          restaurantId,
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        categoryIds[cat.name] = categoryId;
      }

      // Create menu items
      for (const item of data.menuItems) {
        await ctx.db.insert("menuItems", {
          restaurantId,
          categoryId: categoryIds[item.category] as any,
          name: item.name,
          description: item.description,
          price: item.price,
          sortOrder: item.sortOrder,
          isAvailable: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      results.push({ name: data.restaurant.name, created: true, restaurantId });
    }

    const created = results.filter((r) => r.created).length;
    return {
      created,
      total: restaurantsData.length,
      restaurants: results,
    };
  },
});
