import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Rate limiting: 1 review per minute per user
const RATE_LIMIT_MS = 60 * 1000; // 1 minute

// Submit a new review for a class
export const submitReview = mutation({
  args: {
    classId: v.id("events"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to submit a review");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Validate review text length
    if (args.reviewText && args.reviewText.length > 500) {
      throw new Error("Review text must be 500 characters or less");
    }

    const now = Date.now();

    // Rate limiting: Check for recent reviews from this user
    const recentReview = await ctx.db
      .query("classReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (recentReview && now - recentReview.createdAt < RATE_LIMIT_MS) {
      const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - recentReview.createdAt)) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before submitting another review`);
    }

    // Check if user already reviewed this class
    const existingReview = await ctx.db
      .query("classReviews")
      .withIndex("by_class_user", (q) =>
        q.eq("classId", args.classId).eq("userId", user._id)
      )
      .first();

    if (existingReview) {
      throw new Error("You have already reviewed this class");
    }

    // Check if user has a ticket for this class
    // Note: tickets table uses attendeeId not userId
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_attendee", (q) => q.eq("attendeeId", user._id))
      .filter((q) => q.eq(q.field("eventId"), args.classId))
      .first();

    if (!ticket) {
      throw new Error("You must be enrolled in this class to leave a review");
    }

    // Create the review (auto-approved by default per story requirements)
    const reviewId = await ctx.db.insert("classReviews", {
      classId: args.classId,
      userId: user._id,
      ticketId: ticket._id,
      rating: args.rating,
      reviewText: args.reviewText,
      status: "approved", // Auto-approve as per Story 6.3 requirements
      createdAt: now,
      updatedAt: now,
    });

    return reviewId;
  },
});

// Update an existing review (only by the reviewer)
export const updateReview = mutation({
  args: {
    reviewId: v.id("classReviews"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to update a review");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the review
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Check ownership
    if (review.userId !== user._id) {
      throw new Error("You can only edit your own reviews");
    }

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Validate review text length
    if (args.reviewText && args.reviewText.length > 500) {
      throw new Error("Review text must be 500 characters or less");
    }

    // Update the review
    await ctx.db.patch(args.reviewId, {
      rating: args.rating,
      reviewText: args.reviewText,
      updatedAt: Date.now(),
    });

    return args.reviewId;
  },
});

// Delete a review (only by the reviewer)
export const deleteReview = mutation({
  args: {
    reviewId: v.id("classReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to delete a review");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the review
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Check ownership (or admin)
    if (review.userId !== user._id && user.role !== "admin") {
      throw new Error("You can only delete your own reviews");
    }

    // Delete the review
    await ctx.db.delete(args.reviewId);

    return { success: true };
  },
});

// Add instructor response to a review
export const addInstructorResponse = mutation({
  args: {
    reviewId: v.id("classReviews"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to respond to a review");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the review
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Get the class to verify instructor ownership
    const classEvent = await ctx.db.get(review.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Check if user is the organizer (instructor) of this class
    if (classEvent.organizerId !== user._id && user.role !== "admin") {
      throw new Error("Only the instructor can respond to reviews");
    }

    // Validate response length
    if (args.response.length > 500) {
      throw new Error("Response must be 500 characters or less");
    }

    // Update the review with instructor response
    await ctx.db.patch(args.reviewId, {
      instructorResponse: args.response,
      updatedAt: Date.now(),
    });

    return args.reviewId;
  },
});

// Moderate a review (approve/reject) - for admins/instructors
export const moderateReview = mutation({
  args: {
    reviewId: v.id("classReviews"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to moderate reviews");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the review
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Get the class to verify instructor ownership
    const classEvent = await ctx.db.get(review.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Check if user is the organizer (instructor) or admin
    if (classEvent.organizerId !== user._id && user.role !== "admin") {
      throw new Error("Only the instructor or admin can moderate reviews");
    }

    // Update the review status
    await ctx.db.patch(args.reviewId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.reviewId;
  },
});

// Story 6.3.1: Vote on a review (helpful/unhelpful)
export const voteOnReview = mutation({
  args: {
    reviewId: v.id("classReviews"),
    voteType: v.union(v.literal("helpful"), v.literal("unhelpful")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to vote on reviews");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the review
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Prevent self-voting
    if (review.userId === user._id) {
      throw new Error("You cannot vote on your own review");
    }

    // Check for existing vote
    const existingVote = await ctx.db
      .query("reviewVotes")
      .withIndex("by_review_user", (q) =>
        q.eq("reviewId", args.reviewId).eq("userId", user._id)
      )
      .first();

    const now = Date.now();
    let oldVoteType: "helpful" | "unhelpful" | null = null;

    if (existingVote) {
      // If clicking same vote type, remove the vote (toggle off)
      if (existingVote.voteType === args.voteType) {
        await ctx.db.delete(existingVote._id);

        // Decrement the count
        const currentCount = args.voteType === "helpful"
          ? (review.helpfulCount ?? 0)
          : (review.unhelpfulCount ?? 0);

        await ctx.db.patch(args.reviewId, {
          [args.voteType === "helpful" ? "helpfulCount" : "unhelpfulCount"]: Math.max(0, currentCount - 1),
        });

        return { action: "removed", voteType: null };
      }

      // Changing vote type
      oldVoteType = existingVote.voteType;
      await ctx.db.patch(existingVote._id, {
        voteType: args.voteType,
        createdAt: now,
      });
    } else {
      // Create new vote
      await ctx.db.insert("reviewVotes", {
        reviewId: args.reviewId,
        userId: user._id,
        voteType: args.voteType,
        createdAt: now,
      });
    }

    // Update counts on the review
    let helpfulCount = review.helpfulCount ?? 0;
    let unhelpfulCount = review.unhelpfulCount ?? 0;

    if (oldVoteType) {
      // Decrement old vote type
      if (oldVoteType === "helpful") {
        helpfulCount = Math.max(0, helpfulCount - 1);
      } else {
        unhelpfulCount = Math.max(0, unhelpfulCount - 1);
      }
    }

    // Increment new vote type
    if (args.voteType === "helpful") {
      helpfulCount++;
    } else {
      unhelpfulCount++;
    }

    await ctx.db.patch(args.reviewId, {
      helpfulCount,
      unhelpfulCount,
    });

    return {
      action: oldVoteType ? "changed" : "added",
      voteType: args.voteType,
      helpfulCount,
      unhelpfulCount,
    };
  },
});

// Story 6.3.3: Flag/report a review
export const flagReview = mutation({
  args: {
    reviewId: v.id("classReviews"),
    reason: v.union(
      v.literal("spam"),
      v.literal("inappropriate"),
      v.literal("fake"),
      v.literal("harassment"),
      v.literal("other")
    ),
    customReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to report reviews");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the review
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Prevent self-flagging
    if (review.userId === user._id) {
      throw new Error("You cannot report your own review");
    }

    // Check for existing flag from this user
    const existingFlag = await ctx.db
      .query("reviewFlags")
      .withIndex("by_review_user", (q) =>
        q.eq("reviewId", args.reviewId).eq("userId", user._id)
      )
      .first();

    if (existingFlag) {
      throw new Error("You have already reported this review");
    }

    // Validate custom reason if "other" is selected
    if (args.reason === "other" && (!args.customReason || args.customReason.trim().length === 0)) {
      throw new Error("Please provide a reason for reporting");
    }

    // Create the flag
    await ctx.db.insert("reviewFlags", {
      reviewId: args.reviewId,
      userId: user._id,
      reason: args.reason,
      customReason: args.customReason,
      createdAt: Date.now(),
    });

    // Increment flag count
    const newFlagCount = (review.flagCount ?? 0) + 1;

    // Auto-hide if 3+ flags
    const updates: { flagCount: number; isHidden?: boolean; status?: "pending" } = {
      flagCount: newFlagCount,
    };

    if (newFlagCount >= 3 && !review.isHidden) {
      updates.isHidden = true;
      updates.status = "pending"; // Move to pending for moderation
    }

    await ctx.db.patch(args.reviewId, updates);

    return {
      success: true,
      flagCount: newFlagCount,
      isHidden: newFlagCount >= 3,
    };
  },
});

// Story 6.3.4: Dismiss flags on a review (for moderators)
export const dismissFlags = mutation({
  args: {
    reviewId: v.id("classReviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to dismiss flags");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the review
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Get the class to verify instructor ownership
    const classEvent = await ctx.db.get(review.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Check if user is the organizer (instructor) or admin
    if (classEvent.organizerId !== user._id && user.role !== "admin") {
      throw new Error("Only the instructor or admin can dismiss flags");
    }

    // Delete all flags for this review
    const flags = await ctx.db
      .query("reviewFlags")
      .withIndex("by_review", (q) => q.eq("reviewId", args.reviewId))
      .collect();

    for (const flag of flags) {
      await ctx.db.delete(flag._id);
    }

    // Reset flag count and unhide
    await ctx.db.patch(args.reviewId, {
      flagCount: 0,
      isHidden: false,
      status: "approved",
    });

    return { success: true, flagsRemoved: flags.length };
  },
});
