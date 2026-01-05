/**
 * Product Reviews - Queries and Mutations
 *
 * Handles product reviews for the marketplace, including:
 * - Creating reviews (verified purchase check)
 * - Fetching reviews for products
 * - Vendor responses
 * - Helpful votes
 * - Review statistics
 */

import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ==========================================
// QUERIES
// ==========================================

/**
 * Get reviews for a product (public - only approved reviews)
 */
export const getByProduct = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("recent"), v.literal("helpful"), v.literal("highest"), v.literal("lowest"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const sortBy = args.sortBy ?? "recent";

    // Get approved reviews only
    let reviews = await ctx.db
      .query("productReviews")
      .withIndex("by_product_and_status", (q) =>
        q.eq("productId", args.productId).eq("status", "APPROVED")
      )
      .collect();

    // Sort based on preference
    switch (sortBy) {
      case "helpful":
        reviews = reviews.sort((a, b) => b.helpfulVotes - a.helpfulVotes);
        break;
      case "highest":
        reviews = reviews.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        reviews = reviews.sort((a, b) => a.rating - b.rating);
        break;
      case "recent":
      default:
        reviews = reviews.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Apply limit
    reviews = reviews.slice(0, limit);

    // Enrich with user info
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        const user = await ctx.db.get(review.userId);
        return {
          ...review,
          userName: user?.name || "Anonymous",
          userImage: user?.image,
        };
      })
    );

    return enrichedReviews;
  },
});

/**
 * Get review statistics for a product
 */
export const getProductStats = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    // Get all approved reviews
    const reviews = await ctx.db
      .query("productReviews")
      .withIndex("by_product_and_status", (q) =>
        q.eq("productId", args.productId).eq("status", "APPROVED")
      )
      .collect();

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedPurchaseCount: 0,
      };
    }

    // Calculate stats
    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = sumRatings / totalReviews;
    const verifiedPurchaseCount = reviews.filter((r) => r.isVerifiedPurchase).length;

    // Rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      ratingDistribution,
      verifiedPurchaseCount,
    };
  },
});

/**
 * Check if current user can review a product
 */
export const canUserReview = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { canReview: false, reason: "not_logged_in", hasPurchased: false };
    }

    // Get user from database
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      return { canReview: false, reason: "user_not_found", hasPurchased: false };
    }

    // Check if user already reviewed this product
    const existingReview = await ctx.db
      .query("productReviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingReview) {
      return { canReview: false, reason: "already_reviewed", hasPurchased: false, existingReview };
    }

    // Check if user has purchased this product (for verified badge)
    const orders = await ctx.db
      .query("productOrders")
      .filter((q) =>
        q.and(
          q.eq(q.field("customerId"), user._id),
          q.eq(q.field("fulfillmentStatus"), "DELIVERED")
        )
      )
      .collect();

    // Check if any order contains this product
    const hasPurchased = orders.some((order) =>
      order.items?.some((item: { productId: Id<"products"> }) => item.productId === args.productId)
    );

    return { canReview: true, reason: null, hasPurchased };
  },
});

/**
 * Get user's review for a product (if exists)
 */
export const getUserReview = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) return null;

    const review = await ctx.db
      .query("productReviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    return review;
  },
});

// ==========================================
// MUTATIONS
// ==========================================

/**
 * Create a new product review
 */
export const create = mutation({
  args: {
    productId: v.id("products"),
    rating: v.number(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to review products");
    }

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already reviewed
    const existingReview = await ctx.db
      .query("productReviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingReview) {
      throw new Error("You have already reviewed this product");
    }

    // Check for verified purchase
    const orders = await ctx.db
      .query("productOrders")
      .filter((q) =>
        q.and(
          q.eq(q.field("customerId"), user._id),
          q.eq(q.field("fulfillmentStatus"), "DELIVERED")
        )
      )
      .collect();

    const hasPurchased = orders.some((order) =>
      order.items?.some((item: { productId: Id<"products"> }) => item.productId === args.productId)
    );

    // Find the order for linking
    let orderId: Id<"productOrders"> | undefined;
    if (hasPurchased) {
      const purchaseOrder = orders.find((order) =>
        order.items?.some((item: { productId: Id<"products"> }) => item.productId === args.productId)
      );
      orderId = purchaseOrder?._id;
    }

    const now = Date.now();

    // Create the review (auto-approve for verified purchases, pending for others)
    const reviewId = await ctx.db.insert("productReviews", {
      productId: args.productId,
      userId: user._id,
      orderId,
      rating: args.rating,
      title: args.title,
      content: args.content,
      images: args.images,
      isVerifiedPurchase: hasPurchased,
      helpfulVotes: 0,
      status: hasPurchased ? "APPROVED" : "PENDING", // Auto-approve verified purchases
      createdAt: now,
      updatedAt: now,
    });

    return reviewId;
  },
});

/**
 * Update an existing review (only the author can update)
 */
export const update = mutation({
  args: {
    reviewId: v.id("productReviews"),
    rating: v.optional(v.number()),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.userId !== user._id) {
      throw new Error("You can only edit your own reviews");
    }

    // Validate rating if provided
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    await ctx.db.patch(args.reviewId, {
      ...(args.rating !== undefined && { rating: args.rating }),
      ...(args.title !== undefined && { title: args.title }),
      ...(args.content !== undefined && { content: args.content }),
      ...(args.images !== undefined && { images: args.images }),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a review (only the author can delete)
 */
export const remove = mutation({
  args: {
    reviewId: v.id("productReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.userId !== user._id) {
      throw new Error("You can only delete your own reviews");
    }

    await ctx.db.delete(args.reviewId);
  },
});

/**
 * Vote a review as helpful
 */
export const voteHelpful = mutation({
  args: {
    reviewId: v.id("productReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to vote");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Check if already voted
    const voters = review.helpfulVoters || [];
    if (voters.includes(user._id)) {
      // Remove vote
      await ctx.db.patch(args.reviewId, {
        helpfulVotes: Math.max(0, review.helpfulVotes - 1),
        helpfulVoters: voters.filter((id) => id !== user._id),
      });
      return { voted: false };
    } else {
      // Add vote
      await ctx.db.patch(args.reviewId, {
        helpfulVotes: review.helpfulVotes + 1,
        helpfulVoters: [...voters, user._id],
      });
      return { voted: true };
    }
  },
});

/**
 * Add vendor response to a review
 */
export const addVendorResponse = mutation({
  args: {
    reviewId: v.id("productReviews"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Get the product to check vendor ownership
    const product = await ctx.db.get(review.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check if user is the vendor
    if (product.vendorId) {
      const vendor = await ctx.db.get(product.vendorId);
      if (!vendor || vendor.ownerId !== user._id) {
        throw new Error("Only the product vendor can respond to reviews");
      }
    } else {
      // Platform product - check admin role
      if (user.role !== "admin") {
        throw new Error("Only admins can respond to platform product reviews");
      }
    }

    await ctx.db.patch(args.reviewId, {
      vendorResponse: args.response,
      vendorRespondedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ==========================================
// ADMIN MUTATIONS
// ==========================================

/**
 * Moderate a review (admin only)
 */
export const moderate = mutation({
  args: {
    reviewId: v.id("productReviews"),
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED"), v.literal("FLAGGED")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    await ctx.db.patch(args.reviewId, {
      status: args.status,
      moderatedBy: user._id,
      moderatedAt: Date.now(),
      moderationNotes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get pending reviews for moderation (admin only)
 */
export const getPendingReviews = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user || user.role !== "admin") {
      return [];
    }

    const limit = args.limit ?? 50;

    const reviews = await ctx.db
      .query("productReviews")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .take(limit);

    // Enrich with product and user info
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        const product = await ctx.db.get(review.productId);
        const reviewUser = await ctx.db.get(review.userId);
        return {
          ...review,
          productName: product?.name || "Unknown Product",
          productImage: product?.primaryImage,
          userName: reviewUser?.name || "Unknown User",
          userEmail: reviewUser?.email,
        };
      })
    );

    return enrichedReviews;
  },
});
