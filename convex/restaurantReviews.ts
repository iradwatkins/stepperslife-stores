import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { requireRestaurantRole } from "./lib/restaurantAuth";
import { validateRating, validateRequiredString, validateArray, sanitizeText } from "./lib/validation";

// Get reviews for a restaurant (public)
export const getByRestaurant = query({
  args: {
    restaurantId: v.id("restaurants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const reviews = await ctx.db
      .query("restaurantReviews")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("status"), "published"))
      .order("desc")
      .take(limit);

    // Get customer info for each review
    const reviewsWithCustomers = await Promise.all(
      reviews.map(async (review) => {
        const customer = await ctx.db.get(review.customerId);
        return {
          ...review,
          customerName: customer?.name || "Anonymous",
          customerImage: customer?.image,
        };
      })
    );

    return reviewsWithCustomers;
  },
});

// Get aggregate rating stats for a restaurant
export const getRestaurantStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("restaurantReviews")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        ratingBreakdown[rating]++;
      }
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
      ratingBreakdown,
    };
  },
});

// Check if user can review a restaurant (has completed order, hasn't reviewed yet)
export const canReview = query({
  args: {
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user already reviewed this restaurant
    const existingReview = await ctx.db
      .query("restaurantReviews")
      .withIndex("by_customer", (q) => q.eq("customerId", args.userId))
      .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
      .first();

    if (existingReview) {
      return {
        canReview: false,
        reason: "already_reviewed",
        existingReviewId: existingReview._id,
      };
    }

    // Check if user has any completed orders from this restaurant
    const completedOrder = await ctx.db
      .query("foodOrders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), args.restaurantId),
          q.eq(q.field("status"), "COMPLETED")
        )
      )
      .first();

    return {
      canReview: true,
      hasCompletedOrder: !!completedOrder,
      completedOrderId: completedOrder?._id,
    };
  },
});

// Get user's review for a restaurant
export const getUserReview = query({
  args: {
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurantReviews")
      .withIndex("by_customer", (q) => q.eq("customerId", args.userId))
      .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
      .first();
  },
});

// Create a new review
export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    customerId: v.id("users"),
    orderId: v.optional(v.id("foodOrders")),
    rating: v.number(),
    title: v.optional(v.string()),
    reviewText: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Validate rating (checks for NaN, ensures 1-5 integer)
    validateRating(args.rating, "Rating");

    // Validate optional text fields
    if (args.title) {
      validateRequiredString(args.title, "Review title", { minLength: 0, maxLength: 200 });
    }
    if (args.reviewText) {
      validateRequiredString(args.reviewText, "Review text", { minLength: 0, maxLength: 5000 });
    }

    // Validate photos array (max 10 photos)
    if (args.photos) {
      validateArray(args.photos, "Photos", { maxItems: 10 });
    }

    // Check if user already reviewed
    const existingReview = await ctx.db
      .query("restaurantReviews")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
      .first();

    if (existingReview) {
      throw new Error("You have already reviewed this restaurant");
    }

    // Determine if verified purchase
    let isVerifiedPurchase = false;
    if (args.orderId) {
      const order = await ctx.db.get(args.orderId);
      if (order && order.customerId === args.customerId && order.status === "COMPLETED") {
        isVerifiedPurchase = true;
      }
    } else {
      // Check if user has any completed order
      const completedOrder = await ctx.db
        .query("foodOrders")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
        .filter((q) =>
          q.and(
            q.eq(q.field("restaurantId"), args.restaurantId),
            q.eq(q.field("status"), "COMPLETED")
          )
        )
        .first();
      isVerifiedPurchase = !!completedOrder;
    }

    const now = Date.now();

    return await ctx.db.insert("restaurantReviews", {
      restaurantId: args.restaurantId,
      customerId: args.customerId,
      orderId: args.orderId,
      rating: args.rating,
      title: sanitizeText(args.title || "", 200),
      reviewText: sanitizeText(args.reviewText || "", 5000),
      photos: args.photos || [],
      isVerifiedPurchase,
      helpfulCount: 0,
      reportCount: 0,
      status: "published", // Auto-publish for now
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a review (only the reviewer can update their own review)
export const update = mutation({
  args: {
    id: v.id("restaurantReviews"),
    rating: v.optional(v.number()),
    title: v.optional(v.string()),
    reviewText: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Validate inputs if provided
    if (args.rating !== undefined) {
      validateRating(args.rating, "Rating");
    }
    if (args.title !== undefined) {
      validateRequiredString(args.title, "Review title", { minLength: 0, maxLength: 200 });
    }
    if (args.reviewText !== undefined) {
      validateRequiredString(args.reviewText, "Review text", { minLength: 0, maxLength: 5000 });
    }
    if (args.photos !== undefined) {
      validateArray(args.photos, "Photos", { maxItems: 10 });
    }

    // Get the review and verify ownership
    const review = await ctx.db.get(args.id);
    if (!review) {
      throw new Error("Review not found");
    }

    // Only the reviewer can update their review (or admin)
    if (review.customerId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized: You can only update your own reviews");
    }

    const { id, ...updates } = args;

    return await ctx.db.patch(id, {
      ...updates,
      title: args.title !== undefined ? sanitizeText(args.title, 200) : undefined,
      reviewText: args.reviewText !== undefined ? sanitizeText(args.reviewText, 5000) : undefined,
      updatedAt: Date.now(),
    });
  },
});

// Delete a review (only the reviewer can delete their own review)
export const remove = mutation({
  args: { id: v.id("restaurantReviews") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Get the review and verify ownership
    const review = await ctx.db.get(args.id);
    if (!review) {
      throw new Error("Review not found");
    }

    // Only the reviewer can delete their review (or admin)
    if (review.customerId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized: You can only delete your own reviews");
    }

    // Also delete associated votes
    const votes = await ctx.db
      .query("restaurantReviewVotes")
      .withIndex("by_review", (q) => q.eq("reviewId", args.id))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    return await ctx.db.delete(args.id);
  },
});

// Vote review as helpful (userId from auth, not client)
export const voteHelpful = mutation({
  args: {
    reviewId: v.id("restaurantReviews"),
    // NOTE: userId is NOT accepted from client - obtained from auth context
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    // Check if user already voted
    const existingVote = await ctx.db
      .query("restaurantReviewVotes")
      .withIndex("by_review_user", (q) =>
        q.eq("reviewId", args.reviewId).eq("userId", user._id)
      )
      .first();

    if (existingVote) {
      // Remove vote if already voted
      await ctx.db.delete(existingVote._id);
      const review = await ctx.db.get(args.reviewId);
      if (review) {
        await ctx.db.patch(args.reviewId, {
          helpfulCount: Math.max(0, review.helpfulCount - 1),
        });
      }
      return { action: "removed" };
    }

    // Add vote
    await ctx.db.insert("restaurantReviewVotes", {
      reviewId: args.reviewId,
      userId: user._id,
      voteType: "helpful",
      createdAt: Date.now(),
    });

    const review = await ctx.db.get(args.reviewId);
    if (review) {
      await ctx.db.patch(args.reviewId, {
        helpfulCount: review.helpfulCount + 1,
      });
    }

    return { action: "added" };
  },
});

// Report a review (userId from auth, not client)
export const reportReview = mutation({
  args: {
    reviewId: v.id("restaurantReviews"),
    // NOTE: userId is NOT accepted from client - obtained from auth context
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    // Check if user already reported
    const existingReport = await ctx.db
      .query("restaurantReviewVotes")
      .withIndex("by_review_user", (q) =>
        q.eq("reviewId", args.reviewId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("voteType"), "reported"))
      .first();

    if (existingReport) {
      return { action: "already_reported" };
    }

    // Add report
    await ctx.db.insert("restaurantReviewVotes", {
      reviewId: args.reviewId,
      userId: user._id,
      voteType: "reported",
      createdAt: Date.now(),
    });

    const review = await ctx.db.get(args.reviewId);
    if (review) {
      const newReportCount = review.reportCount + 1;
      await ctx.db.patch(args.reviewId, {
        reportCount: newReportCount,
        // Auto-hide if too many reports
        status: newReportCount >= 5 ? "hidden" : review.status,
      });
    }

    return { action: "reported" };
  },
});

// Restaurant owner responds to a review (requires MANAGER role or higher)
export const respondToReview = mutation({
  args: {
    reviewId: v.id("restaurantReviews"),
    // NOTE: ownerId is NOT accepted from client - verified via auth context
    response: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate response
    validateRequiredString(args.response, "Response", { minLength: 1, maxLength: 2000 });

    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found");

    // Verify user has at least MANAGER role for this restaurant
    await requireRestaurantRole(ctx, review.restaurantId, "RESTAURANT_MANAGER");

    return await ctx.db.patch(args.reviewId, {
      restaurantResponse: sanitizeText(args.response, 2000),
      restaurantResponseAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Check if user voted on a review
export const getUserVote = query({
  args: {
    reviewId: v.id("restaurantReviews"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("restaurantReviewVotes")
      .withIndex("by_review_user", (q) =>
        q.eq("reviewId", args.reviewId).eq("userId", args.userId)
      )
      .first();

    return vote?.voteType || null;
  },
});
