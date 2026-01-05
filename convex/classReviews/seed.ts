import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Sample review texts for variety
const SAMPLE_REVIEWS = [
  { rating: 5, text: "Amazing class! The instructor was incredibly knowledgeable and patient. Learned so much in just one session." },
  { rating: 5, text: "Best stepping class I've ever taken. The energy was electric and the moves were on point." },
  { rating: 4, text: "Really enjoyed this class. Great music selection and the instructor broke down each move perfectly." },
  { rating: 4, text: "Good class overall. Would have liked more advanced techniques but great for beginners." },
  { rating: 5, text: "Exceeded my expectations! Made new friends and improved my stepping game significantly." },
  { rating: 3, text: "Decent class. The venue was a bit crowded but the teaching was solid." },
  { rating: 5, text: "Absolutely loved it! Can't wait for the next session. Highly recommend to anyone interested in stepping." },
  { rating: 4, text: "Great workout and fun experience. The instructor has a great teaching style." },
  { rating: 5, text: "This class changed my life! I've never felt more confident on the dance floor." },
  { rating: 4, text: "Very informative and well-paced. Perfect for intermediate steppers looking to level up." },
  { rating: 3, text: "Good introduction to stepping. Could use more practice time during class." },
  { rating: 5, text: "Top-notch instruction! The attention to detail and personal feedback was exceptional." },
];

// Sample instructor responses
const INSTRUCTOR_RESPONSES = [
  "Thank you so much for the kind words! It was a pleasure having you in class.",
  "We're thrilled you enjoyed the class! Hope to see you at our next session.",
  "Thanks for the feedback! We're always looking to improve.",
  "So glad you had a great experience! Looking forward to seeing your progress.",
];

// Seed reviews for testing (admin only)
export const seedTestReviews = mutation({
  args: {
    classId: v.id("events"),
    count: v.optional(v.number()),
    includeInstructorResponses: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    // Find admin user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can seed test data");
    }

    // Verify the class exists
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Get some users to use as reviewers (exclude the class organizer)
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("_id"), classEvent.organizerId))
      .take(20);

    if (users.length === 0) {
      throw new Error("No users available to create reviews");
    }

    const count = args.count ?? 5;
    const reviewIds: Id<"classReviews">[] = [];
    const now = Date.now();

    for (let i = 0; i < Math.min(count, users.length, SAMPLE_REVIEWS.length); i++) {
      const reviewer = users[i];
      const sample = SAMPLE_REVIEWS[i];

      // Check if this user already reviewed
      const existingReview = await ctx.db
        .query("classReviews")
        .withIndex("by_class_user", (q) =>
          q.eq("classId", args.classId).eq("userId", reviewer._id)
        )
        .first();

      if (existingReview) {
        continue; // Skip if already reviewed
      }

      // Create a fake ticket for this user (to satisfy enrollment check)
      let ticket = await ctx.db
        .query("tickets")
        .withIndex("by_attendee", (q) => q.eq("attendeeId", reviewer._id))
        .filter((q) => q.eq(q.field("eventId"), args.classId))
        .first();

      if (!ticket) {
        // Create a mock ticket for enrollment verification
        const ticketId = await ctx.db.insert("tickets", {
          eventId: args.classId,
          attendeeId: reviewer._id,
          attendeeEmail: reviewer.email,
          attendeeName: reviewer.name,
          ticketCode: `TEST-${Date.now()}-${i}`,
          status: "VALID",
          createdAt: now - (30 - i) * 24 * 60 * 60 * 1000,
        });
        ticket = await ctx.db.get(ticketId);
      }

      // Create the review
      const reviewId = await ctx.db.insert("classReviews", {
        classId: args.classId,
        userId: reviewer._id,
        ticketId: ticket!._id,
        rating: sample.rating,
        reviewText: sample.text,
        status: "approved",
        createdAt: now - (i * 2 * 24 * 60 * 60 * 1000), // Stagger review dates
        updatedAt: now - (i * 2 * 24 * 60 * 60 * 1000),
        // Add instructor response to some reviews
        ...(args.includeInstructorResponses && i < INSTRUCTOR_RESPONSES.length && i % 2 === 0
          ? { instructorResponse: INSTRUCTOR_RESPONSES[i / 2] }
          : {}),
      });

      reviewIds.push(reviewId);
    }

    return {
      success: true,
      reviewsCreated: reviewIds.length,
      reviewIds,
    };
  },
});

// Clear test reviews for a class (admin only)
export const clearTestReviews = mutation({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can clear test data");
    }

    // Get all reviews for this class
    const reviews = await ctx.db
      .query("classReviews")
      .withIndex("by_class", (q) => q.eq("classId", args.classId).eq("status", "approved"))
      .collect();

    // Also get pending reviews
    const pendingReviews = await ctx.db
      .query("classReviews")
      .filter((q) =>
        q.and(
          q.eq(q.field("classId"), args.classId),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    const allReviews = [...reviews, ...pendingReviews];

    // Delete all reviews
    for (const review of allReviews) {
      await ctx.db.delete(review._id);
    }

    return {
      success: true,
      reviewsDeleted: allReviews.length,
    };
  },
});
