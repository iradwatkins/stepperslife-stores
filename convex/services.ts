import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ========================================
// SERVICE PROVIDERS - Queries
// ========================================

// Get all approved, active service providers
export const getApprovedProviders = query({
  args: {
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("serviceProviders")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"));

    const providers = await query.collect();

    // Filter by additional criteria
    let filtered = providers.filter((p) => p.isActive);

    if (args.category) {
      filtered = filtered.filter((p) => p.category === args.category);
    }

    if (args.city) {
      filtered = filtered.filter((p) => p.city === args.city);
    }

    if (args.state) {
      filtered = filtered.filter((p) => p.state === args.state);
    }

    // Sort by rating (highest first)
    filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

// Get featured providers (for homepage)
export const getFeaturedProviders = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("serviceProviders")
      .withIndex("by_tier", (q) => q.eq("tier", "PREMIUM"))
      .collect();

    const filtered = providers
      .filter((p) => p.isActive && p.status === "APPROVED")
      .slice(0, args.limit || 6);

    return filtered;
  },
});

// Get provider by slug
export const getProviderBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query("serviceProviders")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!provider || provider.status !== "APPROVED" || !provider.isActive) {
      return null;
    }

    return provider;
  },
});

// Get my service provider profile
export const getMyProvider = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("serviceProviders")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();
  },
});

// ========================================
// SERVICE CATEGORIES - Queries
// ========================================

// Get all active categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_sort")
      .collect();

    return categories.filter((c) => c.isActive);
  },
});

// ========================================
// SERVICE PROVIDERS - Mutations
// ========================================

// Create service provider application
export const applyAsProvider = mutation({
  args: {
    name: v.string(),
    businessName: v.optional(v.string()),
    description: v.optional(v.string()),
    phone: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zipCode: v.optional(v.string()),
    serviceArea: v.array(v.string()),
    category: v.string(),
    subcategories: v.optional(v.array(v.string())),
    yearsInBusiness: v.optional(v.number()),
    isLicensed: v.optional(v.boolean()),
    licenseNumber: v.optional(v.string()),
    isDJ: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a provider profile
    const existing = await ctx.db
      .query("serviceProviders")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();

    if (existing) {
      throw new Error("You already have a service provider profile");
    }

    // Generate slug
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for slug uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await ctx.db
        .query("serviceProviders")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existingSlug) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const now = Date.now();

    const providerId = await ctx.db.insert("serviceProviders", {
      ownerId: user._id,
      name: args.name,
      slug,
      businessName: args.businessName,
      description: args.description,
      phone: args.phone,
      email: args.email,
      website: args.website,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      serviceArea: args.serviceArea,
      category: args.category,
      subcategories: args.subcategories,
      yearsInBusiness: args.yearsInBusiness,
      isLicensed: args.isLicensed,
      licenseNumber: args.licenseNumber,
      isDJ: args.isDJ,
      status: "PENDING",
      tier: "BASIC",
      isActive: false, // Becomes active after approval
      createdAt: now,
      updatedAt: now,
    });

    return providerId;
  },
});

// Update service provider profile
export const updateProvider = mutation({
  args: {
    id: v.id("serviceProviders"),
    name: v.optional(v.string()),
    businessName: v.optional(v.string()),
    description: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    serviceArea: v.optional(v.array(v.string())),
    subcategories: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    portfolioImages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const provider = await ctx.db.get(args.id);
    if (!provider) {
      throw new Error("Provider not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || provider.ownerId !== user._id) {
      throw new Error("Not authorized to update this provider");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});
