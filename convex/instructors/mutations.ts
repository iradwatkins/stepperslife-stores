import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin } from "../lib/auth";

/**
 * Create a new instructor profile
 * Called when a user sets up their instructor profile
 * NOTE: userId is derived from auth context, not from args (security)
 */
export const create = mutation({
  args: {
    // REMOVED: userId - now derived from auth context for security
    name: v.string(),
    slug: v.string(),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    specialties: v.array(v.string()),
    experienceYears: v.optional(v.number()),
    location: v.optional(v.string()),
    socialLinks: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        youtube: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from context
    const user = await getCurrentUser(ctx);

    // ADMIN RESTRICTION: Admins cannot create instructor profiles for themselves
    // Admin role is for management only - admins cannot BE instructors
    // Use createInstructorOnBehalfOf to create instructor for a specific user
    if (user.role === "admin") {
      throw new Error(
        "Admins cannot create instructor profiles for themselves. " +
        "Use the admin create flow (createInstructorOnBehalfOf) to create an instructor for a specific user."
      );
    }

    // Check if slug is already taken
    const existingSlug = await ctx.db
      .query("instructors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingSlug) {
      throw new Error("An instructor with this URL already exists");
    }

    // Check if user already has an instructor profile
    const existingProfile = await ctx.db
      .query("instructors")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (existingProfile) {
      throw new Error("You already have an instructor profile");
    }

    const now = Date.now();
    const instructorId = await ctx.db.insert("instructors", {
      userId: user._id,
      name: args.name,
      slug: args.slug,
      title: args.title,
      bio: args.bio,
      photoUrl: args.photoUrl,
      bannerUrl: args.bannerUrl,
      specialties: args.specialties,
      experienceYears: args.experienceYears,
      location: args.location,
      socialLinks: args.socialLinks,
      verified: false, // Requires admin approval
      featured: false,
      isActive: true,
      classCount: 0,
      studentCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Update user role to "instructor" so they can access instructor dashboard
    await ctx.db.patch(user._id, { role: "instructor" });

    return instructorId;
  },
});

/**
 * Create an instructor profile on behalf of another user (admin only)
 * This allows admins to create instructor profiles for users without becoming the owner
 */
export const createInstructorOnBehalfOf = mutation({
  args: {
    userId: v.id("users"), // REQUIRED - the actual user (NOT the admin)
    name: v.string(),
    slug: v.string(),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    specialties: v.array(v.string()),
    experienceYears: v.optional(v.number()),
    location: v.optional(v.string()),
    socialLinks: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        youtube: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Only admins can create instructor profiles on behalf of others
    await requireAdmin(ctx);

    // Verify the user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Specified user not found");
    }

    // Verify the user is not an admin (admins cannot be instructors)
    if (targetUser.role === "admin") {
      throw new Error("Cannot create instructor profile for an admin user. Admin accounts cannot be instructors.");
    }

    // Check if slug is already taken
    const existingSlug = await ctx.db
      .query("instructors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingSlug) {
      throw new Error("An instructor with this URL already exists");
    }

    // Check if user already has an instructor profile
    const existingProfile = await ctx.db
      .query("instructors")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingProfile) {
      throw new Error("This user already has an instructor profile");
    }

    const now = Date.now();
    const instructorId = await ctx.db.insert("instructors", {
      userId: args.userId, // Use the specified user, NOT the admin
      name: args.name,
      slug: args.slug,
      title: args.title,
      bio: args.bio,
      photoUrl: args.photoUrl,
      bannerUrl: args.bannerUrl,
      specialties: args.specialties,
      experienceYears: args.experienceYears,
      location: args.location,
      socialLinks: args.socialLinks,
      verified: true, // Auto-verify when admin creates
      featured: false,
      isActive: true,
      classCount: 0,
      studentCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Update target user role to "instructor" so they can access instructor dashboard
    await ctx.db.patch(args.userId, { role: "instructor" });

    return instructorId;
  },
});

/**
 * Update an instructor profile
 * Called by the instructor themselves
 */
export const update = mutation({
  args: {
    instructorId: v.id("instructors"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    experienceYears: v.optional(v.number()),
    location: v.optional(v.string()),
    socialLinks: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        youtube: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { instructorId, ...updates } = args;

    const instructor = await ctx.db.get(instructorId);
    if (!instructor) {
      throw new Error("Instructor not found");
    }

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    return await ctx.db.patch(instructorId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Toggle instructor verified status
 * Admin only
 */
export const toggleVerified = mutation({
  args: {
    instructorId: v.id("instructors"),
  },
  handler: async (ctx, args) => {
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) {
      throw new Error("Instructor not found");
    }

    return await ctx.db.patch(args.instructorId, {
      verified: !instructor.verified,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Toggle instructor featured status
 * Admin only
 */
export const toggleFeatured = mutation({
  args: {
    instructorId: v.id("instructors"),
  },
  handler: async (ctx, args) => {
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) {
      throw new Error("Instructor not found");
    }

    return await ctx.db.patch(args.instructorId, {
      featured: !instructor.featured,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Deactivate instructor profile
 * Called by instructor or admin
 */
export const deactivate = mutation({
  args: {
    instructorId: v.id("instructors"),
  },
  handler: async (ctx, args) => {
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) {
      throw new Error("Instructor not found");
    }

    return await ctx.db.patch(args.instructorId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Reactivate instructor profile
 */
export const reactivate = mutation({
  args: {
    instructorId: v.id("instructors"),
  },
  handler: async (ctx, args) => {
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) {
      throw new Error("Instructor not found");
    }

    return await ctx.db.patch(args.instructorId, {
      isActive: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Seed mock instructor data
 * For development and demo purposes
 */
export const seedMockData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if we already have instructors
    const existing = await ctx.db.query("instructors").first();
    if (existing) {
      return { message: "Mock data already exists", count: 0 };
    }

    const now = Date.now();
    const mockInstructors = [
      {
        name: "Marcus Thompson",
        slug: "marcus-thompson",
        title: "Master Instructor",
        bio: "Marcus has been teaching Chicago Steppin' for over 20 years. A legend in the community, he's trained hundreds of students and performed at major events across the country. Known for his smooth style and patient teaching approach.",
        specialties: ["Steppin"],
        experienceYears: 20,
        location: "Chicago, IL",
        verified: true,
        featured: true,
        isActive: true,
        socialLinks: {
          instagram: "marcus_steps",
          facebook: "MarcusThompsonSteppin",
        },
      },
      {
        name: "Angela Davis",
        slug: "angela-davis",
        title: "Senior Instructor",
        bio: "Angela specializes in beginner-friendly instruction, making steppin' accessible to everyone. She believes that anyone can learn to step with the right guidance and encouragement.",
        specialties: ["Steppin", "Line Dance"],
        experienceYears: 15,
        location: "Atlanta, GA",
        verified: true,
        featured: true,
        isActive: true,
        socialLinks: {
          instagram: "angela_steps_atl",
        },
      },
      {
        name: "DeShawn Williams",
        slug: "deshawn-williams",
        title: "Competition Coach",
        bio: "Former national steppin' champion, DeShawn now coaches competitive dancers. His students have won numerous awards at regional and national competitions.",
        specialties: ["Steppin"],
        experienceYears: 18,
        location: "Detroit, MI",
        verified: true,
        featured: false,
        isActive: true,
        socialLinks: {
          youtube: "DeshawnStepsTV",
          website: "https://deshawnwilliams.com",
        },
      },
      {
        name: "Keisha Johnson",
        slug: "keisha-johnson",
        title: "Line Dance Specialist",
        bio: "Keisha is a nationally recognized line dance instructor and choreographer. She's created several popular line dances that are performed at events nationwide.",
        specialties: ["Line Dance"],
        experienceYears: 12,
        location: "Los Angeles, CA",
        verified: true,
        featured: true,
        isActive: true,
        socialLinks: {
          instagram: "keisha_linedance",
          youtube: "KeishaLineDance",
        },
      },
      {
        name: "Robert Jackson",
        slug: "robert-jackson",
        title: "Instructor",
        bio: "Robert brings energy and enthusiasm to every class. He specializes in teaching intermediate dancers looking to refine their technique and develop their own style.",
        specialties: ["Steppin", "Walking"],
        experienceYears: 8,
        location: "Houston, TX",
        verified: false,
        featured: false,
        isActive: true,
        socialLinks: {
          instagram: "rj_steps_houston",
        },
      },
      {
        name: "Patricia Brown",
        slug: "patricia-brown",
        title: "Wellness Dance Instructor",
        bio: "Patricia combines dance with fitness principles. Her walking and low-impact dance classes are perfect for those looking for a fun, active lifestyle.",
        specialties: ["Walking", "Line Dance"],
        experienceYears: 10,
        location: "Chicago, IL",
        verified: true,
        featured: false,
        isActive: true,
        socialLinks: {
          facebook: "PatriciaBrownDance",
        },
      },
    ];

    // We need a dummy user ID - in real app, this would be linked to actual users
    // For mock data, we'll skip the userId field by using a placeholder approach
    // Actually, userId is required, so we need to create or find a user first

    // For now, let's skip seeding if no users exist
    const anyUser = await ctx.db.query("users").first();
    if (!anyUser) {
      return { message: "No users found to link instructors to", count: 0 };
    }

    let count = 0;
    for (const instructor of mockInstructors) {
      await ctx.db.insert("instructors", {
        userId: anyUser._id, // Link to first user for demo
        ...instructor,
        classCount: Math.floor(Math.random() * 50) + 5,
        studentCount: Math.floor(Math.random() * 500) + 50,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { message: "Mock instructors created", count };
  },
});
