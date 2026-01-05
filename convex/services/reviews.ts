import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// ========================================
// SERVICE REVIEWS - Queries
// ========================================

/**
 * Get reviews for a specific provider
 */
export const getByProvider = query({
  args: {
    providerId: v.id("serviceProviders"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("serviceReviews")
      .withIndex("by_provider", (q) =>
        q.eq("serviceProviderId", args.providerId).eq("status", "APPROVED")
      )
      .collect();

    // Sort by most recent first
    reviews.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 10;
    const paginated = reviews.slice(offset, offset + limit);

    // Fetch user info for each review
    const reviewsWithUsers = await Promise.all(
      paginated.map(async (review) => {
        const user = await ctx.db.get(review.userId);
        return {
          ...review,
          userName: user?.name || "Anonymous",
          userAvatar: user?.image,
        };
      })
    );

    return {
      reviews: reviewsWithUsers,
      total: reviews.length,
      hasMore: offset + limit < reviews.length,
    };
  },
});

/**
 * Get provider stats (average rating, breakdown)
 */
export const getProviderStats = query({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("serviceReviews")
      .withIndex("by_provider", (q) =>
        q.eq("serviceProviderId", args.providerId).eq("status", "APPROVED")
      )
      .collect();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // Calculate breakdown
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const review of reviews) {
      const rating = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
      breakdown[rating]++;
      sum += review.rating;
    }

    return {
      averageRating: sum / reviews.length,
      totalReviews: reviews.length,
      breakdown,
    };
  },
});

/**
 * Check if user can review a provider (hasn't already reviewed)
 */
export const canReview = query({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { canReview: false, reason: "not_authenticated" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return { canReview: false, reason: "user_not_found" };

    // Check if user is the provider owner
    const provider = await ctx.db.get(args.providerId);
    if (provider?.ownerId === user._id) {
      return { canReview: false, reason: "own_listing" };
    }

    // Check for existing review
    const existingReview = await ctx.db
      .query("serviceReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("serviceProviderId"), args.providerId))
      .first();

    if (existingReview) {
      return { canReview: false, reason: "already_reviewed", existingReviewId: existingReview._id };
    }

    return { canReview: true, reason: null };
  },
});

/**
 * Get a user's review for a provider (if exists)
 */
export const getMyReview = query({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("serviceReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("serviceProviderId"), args.providerId))
      .first();
  },
});

// ========================================
// SERVICE REVIEWS - Mutations
// ========================================

/**
 * Create a new review
 */
export const create = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    rating: v.number(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    serviceDate: v.optional(v.number()),
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

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check provider exists
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Check not reviewing own listing
    if (provider.ownerId === user._id) {
      throw new Error("Cannot review your own listing");
    }

    // Check for existing review
    const existingReview = await ctx.db
      .query("serviceReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("serviceProviderId"), args.providerId))
      .first();

    if (existingReview) {
      throw new Error("You have already reviewed this provider");
    }

    const now = Date.now();

    // Create review
    const reviewId = await ctx.db.insert("serviceReviews", {
      serviceProviderId: args.providerId,
      userId: user._id,
      rating: args.rating,
      title: args.title,
      content: args.content,
      images: args.images,
      serviceDate: args.serviceDate,
      verified: false, // Could be verified if we track bookings in the future
      helpful: 0,
      status: "APPROVED", // Auto-approve for now, can add moderation later
      createdAt: now,
      updatedAt: now,
    });

    // Update provider's average rating
    await updateProviderRating(ctx, args.providerId);

    return reviewId;
  },
});

/**
 * Update a review
 */
export const update = mutation({
  args: {
    reviewId: v.id("serviceReviews"),
    rating: v.optional(v.number()),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
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

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.userId !== user._id) {
      throw new Error("Not authorized to update this review");
    }

    // Validate rating if provided
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const { reviewId, ...updates } = args;
    await ctx.db.patch(reviewId, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Update provider's average rating if rating changed
    if (args.rating !== undefined) {
      await updateProviderRating(ctx, review.serviceProviderId);
    }

    return reviewId;
  },
});

/**
 * Delete a review
 */
export const remove = mutation({
  args: {
    reviewId: v.id("serviceReviews"),
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

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.userId !== user._id) {
      throw new Error("Not authorized to delete this review");
    }

    const providerId = review.serviceProviderId;
    await ctx.db.delete(args.reviewId);

    // Update provider's average rating
    await updateProviderRating(ctx, providerId);
  },
});

/**
 * Vote a review as helpful
 */
export const voteHelpful = mutation({
  args: {
    reviewId: v.id("serviceReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    await ctx.db.patch(args.reviewId, {
      helpful: (review.helpful || 0) + 1,
    });
  },
});

/**
 * Provider responds to a review
 */
export const respondToReview = mutation({
  args: {
    reviewId: v.id("serviceReviews"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Validate response is not empty
    const trimmedResponse = args.response.trim();
    if (!trimmedResponse) {
      throw new Error("Response cannot be empty");
    }

    // Validate response length (max 500 characters)
    if (trimmedResponse.length > 500) {
      throw new Error("Response cannot exceed 500 characters");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Check if user owns the provider
    const provider = await ctx.db.get(review.serviceProviderId);
    if (!provider || provider.ownerId !== user._id) {
      throw new Error("Not authorized to respond to this review");
    }

    // Check if already responded
    if (review.providerResponse) {
      throw new Error("You have already responded to this review");
    }

    const now = Date.now();

    // Save the provider response
    await ctx.db.patch(args.reviewId, {
      providerResponse: trimmedResponse,
      providerResponseAt: now,
      updatedAt: now,
    });

    return args.reviewId;
  },
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Update provider's average rating based on all approved reviews
 */
async function updateProviderRating(
  ctx: { db: any },
  providerId: any
) {
  const reviews = await ctx.db
    .query("serviceReviews")
    .withIndex("by_provider", (q: any) =>
      q.eq("serviceProviderId", providerId).eq("status", "APPROVED")
    )
    .collect();

  if (reviews.length === 0) {
    await ctx.db.patch(providerId, {
      averageRating: undefined,
      totalReviews: 0,
      updatedAt: Date.now(),
    });
    return;
  }

  const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
  const avg = sum / reviews.length;

  await ctx.db.patch(providerId, {
    averageRating: Math.round(avg * 10) / 10, // Round to 1 decimal
    totalReviews: reviews.length,
    updatedAt: Date.now(),
  });
}

// ========================================
// PROVIDER REVIEWS MANAGEMENT (For Dashboard)
// ========================================

/**
 * Get all reviews for the current provider (for dashboard)
 */
export const getMyProviderReviews = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { reviews: [], total: 0, hasMore: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return { reviews: [], total: 0, hasMore: false };

    // Get provider
    const provider = await ctx.db
      .query("serviceProviders")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();

    if (!provider) return { reviews: [], total: 0, hasMore: false };

    // Get all reviews for this provider
    let reviews = await ctx.db
      .query("serviceReviews")
      .filter((q) => q.eq(q.field("serviceProviderId"), provider._id))
      .collect();

    // Filter by status if provided
    if (args.status) {
      reviews = reviews.filter((r) => r.status === args.status);
    }

    // Sort by most recent
    reviews.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const offset = args.offset || 0;
    const limit = args.limit || 20;
    const paginated = reviews.slice(offset, offset + limit);

    // Fetch user info
    const reviewsWithUsers = await Promise.all(
      paginated.map(async (review) => {
        const reviewUser = await ctx.db.get(review.userId);
        return {
          ...review,
          userName: reviewUser?.name || "Anonymous",
          userAvatar: reviewUser?.image,
        };
      })
    );

    return {
      reviews: reviewsWithUsers,
      total: reviews.length,
      hasMore: offset + limit < reviews.length,
    };
  },
});
