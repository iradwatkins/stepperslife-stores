import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Get all providers (with optional filters)
export const getAllProviders = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("APPROVED"),
        v.literal("REJECTED"),
        v.literal("SUSPENDED")
      )
    ),
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user to check role
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Query providers
    let providers;
    if (args.status) {
      providers = await ctx.db
        .query("serviceProviders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      providers = await ctx.db.query("serviceProviders").collect();
    }

    // Apply additional filters in memory
    let filtered = providers;

    if (args.category) {
      filtered = filtered.filter((p) => p.category === args.category);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.email.toLowerCase().includes(searchLower) ||
          (p.businessName?.toLowerCase().includes(searchLower) ?? false) ||
          p.slug.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt descending (most recent first)
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    return filtered;
  },
});

// Get pending providers only
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const providers = await ctx.db
      .query("serviceProviders")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();

    // Sort by createdAt ascending (oldest first - FIFO queue)
    providers.sort((a, b) => a.createdAt - b.createdAt);

    return providers;
  },
});

// Approve a provider
export const approve = mutation({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Update provider status
    await ctx.db.patch(args.providerId, {
      status: "APPROVED",
      isActive: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Reject a provider
export const reject = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    await ctx.db.patch(args.providerId, {
      status: "REJECTED",
      isActive: false,
      updatedAt: Date.now(),
    });

    // Note: rejection reason could be stored in a separate admin log table if needed

    return { success: true };
  },
});

// Suspend a provider
export const suspend = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    await ctx.db.patch(args.providerId, {
      status: "SUSPENDED",
      isActive: false,
      updatedAt: Date.now(),
    });

    // Note: suspension reason could be stored in a separate admin log table if needed

    return { success: true };
  },
});

// Reactivate a suspended/rejected provider
export const reactivate = mutation({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    await ctx.db.patch(args.providerId, {
      status: "APPROVED",
      isActive: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update provider tier
export const updateTier = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    tier: v.union(v.literal("BASIC"), v.literal("VERIFIED"), v.literal("PREMIUM")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    await ctx.db.patch(args.providerId, {
      tier: args.tier,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get provider details for admin view
export const getProviderDetails = query({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Get associated user
    const providerUser = await ctx.db.get(provider.ownerId);

    // Get reviews stats
    const reviews = await ctx.db
      .query("serviceReviews")
      .withIndex("by_provider", (q) => q.eq("serviceProviderId", args.providerId))
      .collect();

    const totalReviews = reviews.length;
    const approvedReviews = reviews.filter((r) => r.status === "APPROVED").length;
    const pendingReviews = reviews.filter((r) => r.status === "PENDING").length;
    const flaggedReviews = reviews.filter((r) => r.status === "FLAGGED").length;

    return {
      ...provider,
      user: providerUser
        ? {
            name: providerUser.name,
            email: providerUser.email,
            role: providerUser.role,
            createdAt: providerUser.createdAt,
          }
        : null,
      reviewStats: {
        total: totalReviews,
        approved: approvedReviews,
        pending: pendingReviews,
        flagged: flaggedReviews,
      },
    };
  },
});

// Get service categories for filter dropdown
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const categories = await ctx.db.query("serviceCategories").collect();
    return categories;
  },
});

// ==================== REVIEW MODERATION ====================

// Get all reviews (with optional filters)
export const getAllReviews = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("APPROVED"),
        v.literal("FLAGGED"),
        v.literal("REMOVED")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get all reviews
    const reviews = await ctx.db.query("serviceReviews").collect();

    // Filter by status if provided
    let filtered = reviews;
    if (args.status) {
      filtered = filtered.filter((r) => r.status === args.status);
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    // Limit if specified
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    // Enrich with user and provider info
    const enriched = await Promise.all(
      filtered.map(async (review) => {
        const reviewer = await ctx.db.get(review.userId);
        const provider = await ctx.db.get(review.serviceProviderId);

        return {
          ...review,
          userName: reviewer?.name || "Anonymous",
          userEmail: reviewer?.email || "",
          userAvatar: reviewer?.image || null,
          providerName: provider?.businessName || provider?.name || "Unknown",
          providerSlug: provider?.slug || "",
        };
      })
    );

    return enriched;
  },
});

// Get flagged reviews (priority queue)
export const getFlaggedReviews = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get flagged reviews
    const reviews = await ctx.db.query("serviceReviews").collect();
    const flagged = reviews.filter((r) => r.status === "FLAGGED");

    // Sort by createdAt ascending (oldest first - FIFO)
    flagged.sort((a, b) => a.createdAt - b.createdAt);

    // Enrich with info
    const enriched = await Promise.all(
      flagged.map(async (review) => {
        const reviewer = await ctx.db.get(review.userId);
        const provider = await ctx.db.get(review.serviceProviderId);

        return {
          ...review,
          userName: reviewer?.name || "Anonymous",
          userEmail: reviewer?.email || "",
          userAvatar: reviewer?.image || null,
          providerName: provider?.businessName || provider?.name || "Unknown",
          providerSlug: provider?.slug || "",
        };
      })
    );

    return enriched;
  },
});

// Approve a review
export const approveReview = mutation({
  args: {
    reviewId: v.id("serviceReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    await ctx.db.patch(args.reviewId, {
      status: "APPROVED",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove/reject a review
export const removeReview = mutation({
  args: {
    reviewId: v.id("serviceReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    await ctx.db.patch(args.reviewId, {
      status: "REMOVED",
      updatedAt: Date.now(),
    });

    // Update the provider's average rating
    const reviews = await ctx.db
      .query("serviceReviews")
      .withIndex("by_provider", (q) =>
        q.eq("serviceProviderId", review.serviceProviderId).eq("status", "APPROVED")
      )
      .collect();

    const activeReviews = reviews.filter(
      (r) => r._id !== args.reviewId && r.status === "APPROVED"
    );
    const totalReviews = activeReviews.length;
    const averageRating =
      totalReviews > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : undefined;

    await ctx.db.patch(review.serviceProviderId, {
      averageRating,
      totalReviews,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Flag a review for moderation
export const flagReview = mutation({
  args: {
    reviewId: v.id("serviceReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    await ctx.db.patch(args.reviewId, {
      status: "FLAGGED",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
