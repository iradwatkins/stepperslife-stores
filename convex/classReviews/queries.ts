import { v } from "convex/values";
import { query } from "../_generated/server";

// Get approved reviews for a class (paginated)
export const getClassReviews = query({
  args: {
    classId: v.id("events"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("recent"),
      v.literal("helpful"),
      v.literal("highest"),
      v.literal("lowest")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const sortBy = args.sortBy ?? "recent";

    // Get all approved reviews for this class
    let reviews = await ctx.db
      .query("classReviews")
      .withIndex("by_class", (q) =>
        q.eq("classId", args.classId).eq("status", "approved")
      )
      .collect();

    // Filter out hidden reviews
    reviews = reviews.filter((r) => !r.isHidden);

    // Sort based on sortBy parameter
    switch (sortBy) {
      case "helpful":
        reviews.sort((a, b) => (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0));
        break;
      case "highest":
        reviews.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        reviews.sort((a, b) => a.rating - b.rating);
        break;
      case "recent":
      default:
        reviews.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    // Paginate
    const hasMore = reviews.length > limit;
    const paginatedReviews = reviews.slice(0, limit);

    // Get current user's ID and their votes
    const identity = await ctx.auth.getUserIdentity();
    let currentUserId: string | null = null;
    let userVotes: Map<string, "helpful" | "unhelpful"> = new Map();

    if (identity) {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
        .first();
      currentUserId = currentUser?._id ?? null;

      // Get user's votes on these reviews
      if (currentUser) {
        for (const review of paginatedReviews) {
          const vote = await ctx.db
            .query("reviewVotes")
            .withIndex("by_review_user", (q) =>
              q.eq("reviewId", review._id).eq("userId", currentUser._id)
            )
            .first();
          if (vote) {
            userVotes.set(review._id, vote.voteType);
          }
        }
      }
    }

    // Get user info and verification status for each review
    const reviewsWithUsers = await Promise.all(
      paginatedReviews.map(async (review) => {
        const user = await ctx.db.get(review.userId);

        // Check if reviewer has a valid ticket (verified attendee)
        let isVerifiedAttendee = false;
        if (review.ticketId) {
          const ticket = await ctx.db.get(review.ticketId);
          isVerifiedAttendee = ticket?.status === "VALID";
        }

        // Handle deleted users gracefully
        const userName = user ? (user.name || "Anonymous") : "Deleted User";
        const userAvatar = user?.image || null;

        return {
          ...review,
          userName,
          userAvatar,
          isVerifiedAttendee,
          userVote: userVotes.get(review._id) ?? null,
          isOwner: currentUserId !== null && review.userId === currentUserId,
          isDeletedUser: !user, // Flag for UI to style differently if needed
        };
      })
    );

    return {
      reviews: reviewsWithUsers,
      hasMore,
      nextCursor: hasMore ? paginatedReviews[paginatedReviews.length - 1]._id : null,
    };
  },
});

// Get average rating and count for a class
export const getClassRating = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("classReviews")
      .withIndex("by_class", (q) =>
        q.eq("classId", args.classId).eq("status", "approved")
      )
      .collect();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
      ratingDistribution,
    };
  },
});

// Check if user already reviewed this class
export const getUserReviewForClass = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return null;
    }

    // Check if user has reviewed this class
    const review = await ctx.db
      .query("classReviews")
      .withIndex("by_class_user", (q) =>
        q.eq("classId", args.classId).eq("userId", user._id)
      )
      .first();

    return review;
  },
});

// Check if user can review this class (has enrollment)
export const canUserReview = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { canReview: false, reason: "not_authenticated" };
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return { canReview: false, reason: "user_not_found" };
    }

    // Check if user already reviewed
    const existingReview = await ctx.db
      .query("classReviews")
      .withIndex("by_class_user", (q) =>
        q.eq("classId", args.classId).eq("userId", user._id)
      )
      .first();

    if (existingReview) {
      return {
        canReview: false,
        reason: "already_reviewed",
        existingReviewId: existingReview._id,
      };
    }

    // Check if user has a ticket for this class
    // Note: tickets table uses attendeeId not userId
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_attendee", (q) => q.eq("attendeeId", user._id))
      .filter((q) => q.eq(q.field("eventId"), args.classId))
      .first();

    if (!ticket) {
      return { canReview: false, reason: "no_enrollment" };
    }

    // Check if the class has ended (optional - could allow reviews before)
    const classEvent = await ctx.db.get(args.classId);
    if (classEvent) {
      const now = Date.now();
      // If endDate exists and is in the future, cannot review yet
      if (classEvent.endDate && classEvent.endDate > now) {
        return { canReview: false, reason: "class_not_ended" };
      }
    }

    return { canReview: true, ticketId: ticket._id };
  },
});

// Get reviews pending moderation (for instructors/admins)
export const getPendingReviews = query({
  args: {
    classId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return [];
    }

    // Check if user is organizer or admin
    if (user.role !== "organizer" && user.role !== "admin") {
      return [];
    }

    let reviewsQuery = ctx.db.query("classReviews");

    if (args.classId) {
      // Get pending reviews for specific class
      const classIdValue = args.classId;
      const reviews = await reviewsQuery
        .withIndex("by_class", (q) =>
          q.eq("classId", classIdValue).eq("status", "pending")
        )
        .collect();

      return reviews;
    } else {
      // Get all pending reviews (for admin)
      const allPending = await ctx.db
        .query("classReviews")
        .filter((q) => q.eq(q.field("status"), "pending"))
        .order("desc")
        .take(50);

      return allPending;
    }
  },
});

// Story 6.3.4: Get all reviews for instructor's classes
export const getInstructorReviews = query({
  args: {
    classId: v.optional(v.id("events")),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("flagged")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { reviews: [], classes: [] };
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return { reviews: [], classes: [] };
    }

    // Get all classes organized by this user
    const classes = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("organizerId"), user._id))
      .collect();

    if (classes.length === 0) {
      return { reviews: [], classes: [] };
    }

    const limit = args.limit ?? 50;

    // Get reviews for all instructor's classes
    const firstClassReviews = await ctx.db
      .query("classReviews")
      .withIndex("by_class", (q) => q.eq("classId", classes[0]._id))
      .collect();

    let allReviews = [...firstClassReviews];

    // Get remaining classes' reviews
    for (let i = 1; i < classes.length; i++) {
      const cls = classes[i];
      if (args.classId && args.classId !== cls._id) continue;

      const classReviews = await ctx.db
        .query("classReviews")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect();

      allReviews = allReviews.concat(classReviews);
    }

    // Filter first class if needed
    if (args.classId && args.classId !== classes[0]._id) {
      allReviews = allReviews.filter((r) => r.classId === args.classId);
    }

    // Filter by status if specified
    if (args.status === "flagged") {
      allReviews = allReviews.filter((r) => (r.flagCount ?? 0) > 0);
    } else if (args.status) {
      allReviews = allReviews.filter((r) => r.status === args.status);
    }

    // Sort by newest first, with flagged/pending prioritized
    allReviews.sort((a, b) => {
      // Prioritize flagged
      if ((a.flagCount ?? 0) > 0 && (b.flagCount ?? 0) === 0) return -1;
      if ((b.flagCount ?? 0) > 0 && (a.flagCount ?? 0) === 0) return 1;
      // Then pending
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      // Then by date
      return b.createdAt - a.createdAt;
    });

    // Limit results
    const paginatedReviews = allReviews.slice(0, limit);

    // Enrich with user info and class info
    const enrichedReviews = await Promise.all(
      paginatedReviews.map(async (review) => {
        const reviewer = await ctx.db.get(review.userId);
        const classEvent = classes.find((c) => c._id === review.classId);

        // Get flags if any
        const flags = await ctx.db
          .query("reviewFlags")
          .withIndex("by_review", (q) => q.eq("reviewId", review._id))
          .collect();

        return {
          ...review,
          reviewerName: (reviewer as { name?: string } | null)?.name || "Anonymous",
          reviewerAvatar: (reviewer as { image?: string } | null)?.image || null,
          className: classEvent?.name || "Unknown Class",
          flags: flags.map((f) => ({
            reason: f.reason,
            customReason: f.customReason,
            createdAt: f.createdAt,
          })),
        };
      })
    );

    return {
      reviews: enrichedReviews,
      classes: classes.map((c) => ({ _id: c._id, title: c.name || "Untitled" })),
    };
  },
});

// Story 6.3.8: Get review analytics for instructor
export const getReviewAnalytics = query({
  args: {
    classId: v.optional(v.id("events")),
    days: v.optional(v.number()), // 30, 90, or all time
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return null;
    }

    // Get classes
    let classes = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("organizerId"), user._id))
      .collect();

    if (args.classId) {
      classes = classes.filter((c) => c._id === args.classId);
    }

    if (classes.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        responseRate: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentTrend: [],
        flaggedCount: 0,
        pendingCount: 0,
      };
    }

    const days = args.days ?? 90;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Get all reviews for these classes - start with first class to get proper typing
    const firstClassReviews = await ctx.db
      .query("classReviews")
      .withIndex("by_class", (q) => q.eq("classId", classes[0]._id))
      .collect();

    let allReviews = [...firstClassReviews];

    for (let i = 1; i < classes.length; i++) {
      const classReviews = await ctx.db
        .query("classReviews")
        .withIndex("by_class", (q) => q.eq("classId", classes[i]._id))
        .collect();
      allReviews = allReviews.concat(classReviews);
    }

    // Filter to time period
    const periodReviews = allReviews.filter((r) => r.createdAt >= cutoffDate);
    const approvedReviews = periodReviews.filter((r) => r.status === "approved");

    // Calculate stats
    const totalReviews = approvedReviews.length;
    const avgRating = totalReviews > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    // Response rate
    const withResponse = approvedReviews.filter((r) => r.instructorResponse).length;
    const responseRate = totalReviews > 0 ? (withResponse / totalReviews) * 100 : 0;

    // Rating distribution
    const ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    approvedReviews.forEach((r) => {
      const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    // Recent trend (last 4 weeks)
    const recentTrend: { week: number; avg: number; count: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = Date.now() - ((i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = Date.now() - (i * 7 * 24 * 60 * 60 * 1000);
      const weekReviews = approvedReviews.filter(
        (r) => r.createdAt >= weekStart && r.createdAt < weekEnd
      );
      const avg = weekReviews.length > 0
        ? weekReviews.reduce((sum, r) => sum + r.rating, 0) / weekReviews.length
        : 0;
      recentTrend.unshift({ week: i + 1, avg, count: weekReviews.length });
    }

    // Flagged and pending counts
    const flaggedCount = periodReviews.filter((r) => (r.flagCount ?? 0) > 0).length;
    const pendingCount = periodReviews.filter((r) => r.status === "pending").length;

    return {
      totalReviews,
      averageRating: Math.round(avgRating * 10) / 10,
      responseRate: Math.round(responseRate),
      ratingDistribution,
      recentTrend,
      flaggedCount,
      pendingCount,
    };
  },
});
