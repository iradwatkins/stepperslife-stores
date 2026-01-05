import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull, requireAdmin } from "./lib/auth";
import { requireRestaurantOwner, requireRestaurantRole } from "./lib/restaurantAuth";
import { USER_ROLES } from "./lib/roles";
import { validateRequiredString, validatePhoneNumber, validateEmail } from "./lib/validation";
import { getDefaultPlanTier, RESTAURANT_PLANS } from "./lib/restaurantPlans";

// Get all active restaurants with optional filters
export const getAll = query({
  args: {
    lateNightOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Use filter instead of index to avoid potential index issues
      const allRestaurants = await ctx.db.query("restaurants").collect();
      let restaurants = allRestaurants.filter((r) => r.isActive === true);

      // Filter for late-night restaurants (open after 2am) if requested
      if (args.lateNightOnly) {
        restaurants = restaurants.filter((r) => r.isOpenLateNight === true);
      }

      return restaurants;
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      // Return empty array if there's an error
      return [];
    }
  },
});

// Get restaurant by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("restaurants")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();
    } catch (error) {
      console.error("Error fetching restaurant by slug:", error);
      return null;
    }
  },
});

// Get restaurants by owner
export const getByOwner = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

// Get restaurant by ID (internal - for use by other Convex functions)
export const getByIdInternal = internalQuery({
  args: { id: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get restaurant by ID (public - for admin support)
export const getById = query({
  args: { id: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.id);
    return restaurant;
  },
});

// Create restaurant (admin only - regular users should use apply)
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.string(),
    cuisine: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Only admins can directly create restaurants
    await requireAdmin(ctx);

    // Validate inputs
    validateRequiredString(args.name, "Restaurant name", { maxLength: 200 });
    validatePhoneNumber(args.phone, "Phone number");
    validateRequiredString(args.address, "Address", { maxLength: 500 });
    validateRequiredString(args.city, "City", { maxLength: 100 });
    validateRequiredString(args.state, "State", { maxLength: 50 });
    validateRequiredString(args.zipCode, "ZIP code", { maxLength: 20 });

    const now = Date.now();
    const restaurantId = await ctx.db.insert("restaurants", {
      ...args,
      name: args.name.trim(),
      address: args.address.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      zipCode: args.zipCode.trim(),
      logoUrl: undefined,
      coverImageUrl: undefined,
      operatingHours: undefined,
      acceptingOrders: false,
      estimatedPickupTime: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Update target user role to "restaurateur" so they can access restaurateur dashboard
    await ctx.db.patch(args.ownerId, { role: "restaurateur" });

    return restaurantId;
  },
});

// Update restaurant (requires ownership or manager role)
export const update = mutation({
  args: {
    id: v.id("restaurants"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    cuisine: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    operatingHours: v.optional(v.any()),
    acceptingOrders: v.optional(v.boolean()),
    estimatedPickupTime: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, args.id, "RESTAURANT_MANAGER");

    const { id, ...updates } = args;

    // Only owners can change isActive status
    if (updates.isActive !== undefined) {
      await requireRestaurantOwner(ctx, id);
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Toggle accepting orders (requires manager role or higher)
export const toggleAcceptingOrders = mutation({
  args: { id: v.id("restaurants") },
  handler: async (ctx, args) => {
    // Verify user has at least MANAGER role for this restaurant
    const { restaurant } = await requireRestaurantRole(ctx, args.id, "RESTAURANT_MANAGER");

    return await ctx.db.patch(args.id, {
      acceptingOrders: !restaurant.acceptingOrders,
      updatedAt: Date.now(),
    });
  },
});

// Get featured restaurants for homepage (limit 5)
export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Use filter instead of index to avoid potential index issues
      const allRestaurants = await ctx.db.query("restaurants").collect();
      const activeRestaurants = allRestaurants.filter((r) => r.isActive === true);
      return activeRestaurants.slice(0, 5);
    } catch (error) {
      console.error("Error fetching featured restaurants:", error);
      return [];
    }
  },
});

// Seed restaurants with mock data (admin only)
export const seedRestaurants = mutation({
  args: {},
  handler: async (ctx) => {
    // Require admin authentication
    const adminUser = await requireAdmin(ctx);
    const now = Date.now();

    // Check if restaurants already seeded
    const existing = await ctx.db.query("restaurants").first();
    if (existing) {
      return { message: "Restaurants already seeded", count: 0 };
    }

    const mockRestaurants = [
      {
        name: "Soul Food Spot",
        slug: "soul-food-spot",
        description: "Authentic soul food in the heart of Chicago. Famous for our fried chicken and mac & cheese.",
        cuisine: ["Soul Food", "American", "Southern"],
        logoUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80",
        coverImageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
        acceptingOrders: true,
        estimatedPickupTime: 30,
        address: "123 Soul Street",
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
        phone: "(312) 555-0001",
      },
      {
        name: "Chicago Deep Dish Kitchen",
        slug: "chicago-deep-dish-kitchen",
        description: "The best deep dish pizza in Chicago! Made fresh daily with family recipes.",
        cuisine: ["Pizza", "Italian", "American"],
        logoUrl: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=200&q=80",
        coverImageUrl: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80",
        acceptingOrders: true,
        estimatedPickupTime: 45,
        address: "456 Pizza Ave",
        city: "Chicago",
        state: "IL",
        zipCode: "60602",
        phone: "(312) 555-0002",
      },
      {
        name: "Harold's Chicken Shack",
        slug: "harolds-chicken-shack",
        description: "Chicago's legendary chicken spot. Crispy, juicy, and perfectly seasoned every time.",
        cuisine: ["Chicken", "American", "Fast Food"],
        logoUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&q=80",
        coverImageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80",
        acceptingOrders: true,
        estimatedPickupTime: 20,
        address: "789 Chicken Blvd",
        city: "Chicago",
        state: "IL",
        zipCode: "60603",
        phone: "(312) 555-0003",
      },
      {
        name: "Taste of Home Café",
        slug: "taste-of-home-cafe",
        description: "Homestyle cooking that reminds you of Sunday dinner at grandma's house.",
        cuisine: ["American", "Comfort Food", "Soul Food"],
        logoUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80",
        coverImageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
        acceptingOrders: true,
        estimatedPickupTime: 35,
        address: "321 Home Lane",
        city: "Chicago",
        state: "IL",
        zipCode: "60604",
        phone: "(312) 555-0004",
      },
      {
        name: "Wing Stop Express",
        slug: "wing-stop-express",
        description: "Fresh wings tossed in your choice of 12 signature sauces. Perfect game day food!",
        cuisine: ["Wings", "American", "Fast Food"],
        logoUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=200&q=80",
        coverImageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&q=80",
        acceptingOrders: false,
        estimatedPickupTime: 25,
        address: "654 Wing Way",
        city: "Chicago",
        state: "IL",
        zipCode: "60605",
        phone: "(312) 555-0005",
      },
    ];

    let count = 0;
    for (const restaurant of mockRestaurants) {
      await ctx.db.insert("restaurants", {
        ...restaurant,
        ownerId: adminUser._id,
        operatingHours: {
          monday: { open: "11:00 AM", close: "9:00 PM" },
          tuesday: { open: "11:00 AM", close: "9:00 PM" },
          wednesday: { open: "11:00 AM", close: "9:00 PM" },
          thursday: { open: "11:00 AM", close: "9:00 PM" },
          friday: { open: "11:00 AM", close: "10:00 PM" },
          saturday: { open: "12:00 PM", close: "10:00 PM" },
          sunday: { open: "12:00 PM", close: "8:00 PM" },
        },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { message: "Restaurants seeded successfully", count };
  },
});

// Apply to become a restaurant partner (creates pending restaurant)
export const apply = mutation({
  args: {
    // NOTE: ownerId is NOT accepted from client - obtained from auth context
    name: v.string(),
    description: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.string(),
    cuisine: v.array(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    website: v.optional(v.string()),
    hoursOfOperation: v.optional(v.string()),
    estimatedPickupTime: v.optional(v.number()),
    additionalNotes: v.optional(v.string()),
    // Subscription plan selection (defaults to STARTER if not provided)
    selectedPlan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("professional"))),
  },
  handler: async (ctx, args) => {
    try {
      // SECURITY: Get user first to check if they already have a restaurant
      const user = await getCurrentUser(ctx);

      // ADMIN RESTRICTION: Admins cannot apply for restaurants as themselves
      // Admins must use the create() mutation with a specified ownerId
      if (user.role === "admin") {
        throw new Error(
          "Admins cannot apply for restaurant accounts. " +
          "Use the admin create flow to create a restaurant for a specific user."
        );
      }

      // CHECK: User can only have ONE restaurant (franchise model)
      const existingRestaurants = await ctx.db
        .query("restaurants")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();

      if (existingRestaurants.length > 0) {
        const existingName = existingRestaurants[0].name;
        throw new Error(
          `You already own a restaurant: "${existingName}". To expand, add locations from your dashboard instead of creating a new restaurant.`
        );
      }

      // Validate inputs
      validateRequiredString(args.name, "Restaurant name", { maxLength: 200 });
      validatePhoneNumber(args.phone, "Phone number");
      validateRequiredString(args.address, "Address", { maxLength: 500 });
      validateRequiredString(args.city, "City", { maxLength: 100 });
      validateRequiredString(args.state, "State", { maxLength: 50 });
      validateRequiredString(args.zipCode, "ZIP code", { maxLength: 20 });
      validateRequiredString(args.contactName, "Contact name", { maxLength: 100 });
      validateEmail(args.contactEmail, "Contact email");

      if (args.cuisine.length === 0) {
        throw new Error("Please select at least one cuisine type");
      }
      if (args.cuisine.length > 10) {
        throw new Error("Maximum 10 cuisine types allowed");
      }

      const now = Date.now();

      // Generate slug from name
      const baseSlug = args.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check for existing slug and make unique if needed
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await ctx.db
          .query("restaurants")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Map selected plan to tier (or use default STARTER)
      const planMap: Record<string, "STARTER" | "GROWTH" | "PROFESSIONAL"> = {
        starter: "STARTER",
        growth: "GROWTH",
        professional: "PROFESSIONAL",
      };
      const subscriptionTier = args.selectedPlan ? planMap[args.selectedPlan] : getDefaultPlanTier();

      const restaurantId = await ctx.db.insert("restaurants", {
        name: args.name.trim(),
        slug,
        description: args.description?.trim(),
        ownerId: user._id, // SECURE: From auth context, not client
        address: args.address.trim(),
        city: args.city.trim(),
        state: args.state.trim(),
        zipCode: args.zipCode.trim(),
        phone: args.phone.trim(),
        cuisine: args.cuisine,
        logoUrl: undefined,
        coverImageUrl: undefined,
        operatingHours: args.hoursOfOperation,
        acceptingOrders: false,
        estimatedPickupTime: args.estimatedPickupTime || 30,
        isActive: true, // Auto-approved - listing is free
        applicationStatus: "APPROVED", // Auto-approved for now
        // Subscription: Selected plan is auto-activated
        subscriptionTier: subscriptionTier,
        subscriptionStatus: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });

      // Update user role to "restaurateur" so they can access restaurateur dashboard
      await ctx.db.patch(user._id, { role: "restaurateur" });

      return restaurantId;
    } catch (error: any) {
      console.error("[restaurants:apply] Error:", error.message || error);
      throw error;
    }
  },
});

// Get pending restaurant applications (admin only)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    // Require admin authentication
    await requireAdmin(ctx);

    const allRestaurants = await ctx.db.query("restaurants").collect();
    return allRestaurants.filter((r) => r.isActive === false);
  },
});

// Approve a restaurant application (admin only)
export const approve = mutation({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    // Require admin authentication
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    if (restaurant.isActive) {
      throw new Error("Restaurant is already approved");
    }

    const now = Date.now();

    // Get default subscription plan if not already set
    const defaultPlan = getDefaultPlanTier();

    // Approve the restaurant and ensure subscription is active
    await ctx.db.patch(args.restaurantId, {
      isActive: true,
      // Ensure subscription is set (for backwards compatibility)
      subscriptionTier: restaurant.subscriptionTier || defaultPlan,
      subscriptionStatus: restaurant.subscriptionStatus || "ACTIVE",
      updatedAt: now,
    });

    // Upgrade owner's role to restaurateur (if not already admin/restaurateur)
    const owner = await ctx.db.get(restaurant.ownerId);
    if (owner && owner.role === "user") {
      await ctx.db.patch(restaurant.ownerId, {
        role: USER_ROLES.RESTAURATEUR,
        updatedAt: now,
      });
    }

    return { success: true, restaurantId: args.restaurantId };
  },
});

// Reject a restaurant application (admin only)
export const reject = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authentication
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Delete the restaurant application
    await ctx.db.delete(args.restaurantId);

    // Check if user has any other approved restaurants
    // If not, and they're a restaurateur, consider downgrading
    const otherRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", restaurant.ownerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (otherRestaurants.length === 0) {
      const owner = await ctx.db.get(restaurant.ownerId);
      if (owner && owner.role === "restaurateur") {
        await ctx.db.patch(restaurant.ownerId, {
          role: USER_ROLES.USER,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

// Suspend an approved restaurant (admin only)
export const suspend = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authentication
    await requireAdmin(ctx);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    await ctx.db.patch(args.restaurantId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get user's own restaurant applications (for dashboard)
export const getMyRestaurants = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);

    // Return empty array if not authenticated
    if (!user) {
      return [];
    }

    // Admin sees all restaurants
    if (user.role === "admin") {
      return await ctx.db.query("restaurants").collect();
    }

    // Regular users see only their own restaurants
    return await ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

// Get user's restaurant application status (for status page)
export const getMyRestaurantStatus = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);

      // Get user's restaurant(s)
      const restaurants = await ctx.db
        .query("restaurants")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();

      if (restaurants.length === 0) {
        return {
          hasRestaurant: false,
          status: null,
          restaurant: null,
          message: "No restaurant application found",
        };
      }

      // Return the first (primary) restaurant
      const restaurant = restaurants[0];
      const status = restaurant.applicationStatus || (restaurant.isActive ? "APPROVED" : "PENDING");

      return {
        hasRestaurant: true,
        status,
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
          city: restaurant.city,
          state: restaurant.state,
          isActive: restaurant.isActive,
          applicationStatus: status,
          applicationNotes: restaurant.applicationNotes,
          applicationReviewedAt: restaurant.applicationReviewedAt,
          createdAt: restaurant.createdAt,
          subscriptionTier: restaurant.subscriptionTier,
          subscriptionStatus: restaurant.subscriptionStatus,
        },
        message:
          status === "APPROVED"
            ? "Your restaurant is approved and live!"
            : status === "PENDING"
              ? "Your application is under review. We'll notify you soon."
              : status === "REJECTED"
                ? restaurant.applicationNotes || "Your application was not approved."
                : status === "SUSPENDED"
                  ? "Your restaurant has been temporarily suspended."
                  : "Unknown status",
      };
    } catch (error) {
      // User not authenticated
      return {
        hasRestaurant: false,
        status: null,
        restaurant: null,
        message: "Please sign in to view your application status",
      };
    }
  },
});

/**
 * Internal mutation to enable orders for a restaurant
 */
export const enableOrdersInternal = internalMutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restaurantId, {
      acceptingOrders: true,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Internal mutation to create a restaurant for admin setup
 * This bypasses auth for use in scripts/setup actions
 */
export const createInternal = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.string(),
    cuisine: v.array(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    estimatedPickupTime: v.optional(v.number()),
    operatingHours: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate slug from name
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return await ctx.db.insert("restaurants", {
      name: args.name.trim(),
      slug,
      description: args.description?.trim(),
      ownerId: args.ownerId,
      address: args.address.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      zipCode: args.zipCode.trim(),
      phone: args.phone.trim(),
      cuisine: args.cuisine,
      logoUrl: undefined,
      coverImageUrl: undefined,
      operatingHours: args.operatingHours,
      acceptingOrders: false,
      estimatedPickupTime: args.estimatedPickupTime || 30,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal mutation to update restaurant fields (bypasses auth)
 */
export const updateInternal = internalMutation({
  args: {
    id: v.id("restaurants"),
    coverImageUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Admin fix for updating restaurant images (no auth required - for setup/seeding only)
 */
export const fixRestaurantImage = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    logoUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { restaurantId, ...updates } = args;
    await ctx.db.patch(restaurantId, {
      ...updates,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Get subscription info for a restaurant including current usage
 */
export const getSubscriptionInfo = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Get current counts
    const menuItems = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const categories = await ctx.db
      .query("menuCategories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    // Get plan details
    const planTier = (restaurant.subscriptionTier || "STARTER") as keyof typeof RESTAURANT_PLANS;
    const plan = RESTAURANT_PLANS[planTier];

    return {
      tier: planTier,
      status: restaurant.subscriptionStatus || "ACTIVE",
      plan: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        transactionFeePercent: plan.transactionFeePercent,
        features: plan.features,
        featuresList: plan.featuresList,
      },
      usage: {
        menuItems: {
          current: menuItems.length,
          limit: plan.features.menuItemLimit,
          canAdd: plan.features.menuItemLimit === -1 || menuItems.length < plan.features.menuItemLimit,
        },
        categories: {
          current: categories.length,
          limit: plan.features.categoryLimit,
          canAdd: plan.features.categoryLimit === -1 || categories.length < plan.features.categoryLimit,
        },
      },
      expiresAt: restaurant.subscriptionExpiresAt,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
    };
  },
});

/**
 * Update late-night status for a restaurant
 * isOpenLateNight is true if the restaurant closes after 2am on any day
 */
export const updateLateNightStatus = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    isOpenLateNight: v.boolean(),
    lateNightDays: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, args.restaurantId, "RESTAURANT_MANAGER");

    await ctx.db.patch(args.restaurantId, {
      isOpenLateNight: args.isOpenLateNight,
      lateNightDays: args.lateNightDays,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Seed late-night data for existing restaurants (admin only)
 * Sets Soul Food Spot and Harold's as late-night on Fri/Sat
 */
export const seedLateNightData = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const restaurants = await ctx.db.query("restaurants").collect();
    let updated = 0;

    for (const restaurant of restaurants) {
      // Soul Food Spot and Harold's are open late on weekends
      if (restaurant.slug === "soul-food-spot" || restaurant.slug === "harolds-chicken-shack") {
        await ctx.db.patch(restaurant._id, {
          isOpenLateNight: true,
          lateNightDays: ["friday", "saturday"],
          operatingHours: {
            monday: { open: "11:00 AM", close: "9:00 PM" },
            tuesday: { open: "11:00 AM", close: "9:00 PM" },
            wednesday: { open: "11:00 AM", close: "9:00 PM" },
            thursday: { open: "11:00 AM", close: "10:00 PM" },
            friday: { open: "11:00 AM", close: "3:00 AM" },
            saturday: { open: "12:00 PM", close: "3:00 AM" },
            sunday: { open: "12:00 PM", close: "8:00 PM" },
          },
          updatedAt: Date.now(),
        });
        updated++;
      } else {
        // Other restaurants are not late-night
        await ctx.db.patch(restaurant._id, {
          isOpenLateNight: false,
          lateNightDays: [],
          updatedAt: Date.now(),
        });
      }
    }

    return { message: `Updated ${updated} restaurants with late-night status`, total: restaurants.length };
  },
});

/**
 * Seed stepper-specific attributes for existing restaurants (admin only)
 * Adds dress code, vibe tags, price range, group info, and entertainment data
 */
export const seedStepperAttributes = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const restaurants = await ctx.db.query("restaurants").collect();
    let updated = 0;

    // Stepper-specific configurations for each restaurant
    const stepperConfigs: Record<string, {
      dressCode: "casual" | "smart-casual" | "upscale" | "stepping-attire";
      vibeTags: string[];
      priceRange: "$" | "$$" | "$$$" | "$$$$";
      groupInfo: {
        maxPartySize: number;
        groupDiscounts: boolean;
        privateRoomAvailable: boolean;
      };
      entertainment?: {
        hasLiveMusic: boolean;
        hasDJ: boolean;
        musicGenres: string[];
        entertainmentNights: string[];
      };
    }> = {
      "soul-food-spot": {
        dressCode: "smart-casual",
        vibeTags: ["intimate", "romantic", "soulful"],
        priceRange: "$$",
        groupInfo: {
          maxPartySize: 12,
          groupDiscounts: true,
          privateRoomAvailable: true,
        },
        entertainment: {
          hasLiveMusic: true,
          hasDJ: false,
          musicGenres: ["r&b", "jazz", "neo-soul"],
          entertainmentNights: ["friday", "saturday"],
        },
      },
      "chicago-deep-dish-kitchen": {
        dressCode: "casual",
        vibeTags: ["family-friendly", "casual", "sports"],
        priceRange: "$$",
        groupInfo: {
          maxPartySize: 20,
          groupDiscounts: true,
          privateRoomAvailable: false,
        },
      },
      "harolds-chicken-shack": {
        dressCode: "casual",
        vibeTags: ["energetic", "quick-bites", "iconic"],
        priceRange: "$",
        groupInfo: {
          maxPartySize: 8,
          groupDiscounts: false,
          privateRoomAvailable: false,
        },
      },
      "taste-of-home-cafe": {
        dressCode: "smart-casual",
        vibeTags: ["cozy", "homestyle", "brunch-spot"],
        priceRange: "$$",
        groupInfo: {
          maxPartySize: 15,
          groupDiscounts: true,
          privateRoomAvailable: true,
        },
        entertainment: {
          hasLiveMusic: false,
          hasDJ: true,
          musicGenres: ["steppin", "old-school-r&b"],
          entertainmentNights: ["saturday"],
        },
      },
      "wing-stop-express": {
        dressCode: "casual",
        vibeTags: ["game-day", "late-night", "quick-bites"],
        priceRange: "$",
        groupInfo: {
          maxPartySize: 10,
          groupDiscounts: false,
          privateRoomAvailable: false,
        },
      },
    };

    for (const restaurant of restaurants) {
      const config = stepperConfigs[restaurant.slug];
      if (config) {
        await ctx.db.patch(restaurant._id, {
          dressCode: config.dressCode,
          vibeTags: config.vibeTags,
          priceRange: config.priceRange,
          groupInfo: config.groupInfo,
          entertainment: config.entertainment,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { message: `Updated ${updated} restaurants with stepper attributes`, total: restaurants.length };
  },
});

/**
 * Get onboarding progress for a restaurant
 * Returns step completion status and overall percentage
 */
export const getOnboardingProgress = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Step 1: Basic Info (name, cuisine)
    const hasBasicInfo = !!(
      restaurant.name &&
      restaurant.name.trim().length > 0 &&
      restaurant.cuisine &&
      restaurant.cuisine.length > 0
    );

    // Step 2: Location & Address (at least 1 location)
    const locations = await ctx.db
      .query("restaurantLocations")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const hasLocation = locations.length > 0;

    // Step 3: Photos (logo or cover uploaded)
    const hasPhotos = !!(restaurant.logoUrl || restaurant.coverImageUrl);

    // Step 4: Menu Items (at least 3 items)
    const menuItems = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const hasMenu = menuItems.length >= 3;

    // Step 5: Hours Set (operatingHours exists on restaurant or locations)
    const hasHours = !!(
      restaurant.operatingHours ||
      locations.some((loc) => loc.operatingHours)
    );

    // Calculate progress
    const steps = [
      { id: "basic-info", label: "Basic Info", completed: hasBasicInfo, href: "/restaurateur/dashboard/settings" },
      { id: "location", label: "Location & Address", completed: hasLocation, href: "/restaurateur/dashboard/locations" },
      { id: "photos", label: "Upload Photos", completed: hasPhotos, href: "/restaurateur/dashboard/photos" },
      { id: "menu", label: "Add Menu Items", completed: hasMenu, href: "/restaurateur/dashboard/menu" },
      { id: "hours", label: "Set Hours", completed: hasHours, href: "/restaurateur/dashboard/hours" },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const percentComplete = Math.round((completedCount / steps.length) * 100);

    return {
      steps,
      completedCount,
      totalSteps: steps.length,
      percentComplete,
      isComplete: percentComplete === 100,
      menuItemCount: menuItems.length,
      locationCount: locations.length,
    };
  },
});

/**
 * Get restaurants by city (for pre-event dining integration)
 * Returns up to 4 active restaurants in the specified city
 */
export const getByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    try {
      const allRestaurants = await ctx.db.query("restaurants").collect();

      // Filter by city and active status
      const cityRestaurants = allRestaurants
        .filter(
          (r) =>
            r.isActive === true &&
            r.city.toLowerCase() === args.city.toLowerCase()
        )
        .slice(0, 4); // Limit to 4 for visual appeal

      return cityRestaurants;
    } catch (error) {
      console.error("Error fetching restaurants by city:", error);
      return [];
    }
  },
});
