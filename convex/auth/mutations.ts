import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Create a new user with email and password
 * Password should be pre-hashed on the server (not client)
 */
export const createUserWithPassword = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("organizer"), v.literal("instructor"), v.literal("restaurateur"), v.literal("user"))),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const now = Date.now();

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
      role: args.role || "user",
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    // Initialize credit balance for organizers - 1000 FREE tickets!
    if (args.role === "organizer" || args.role === "admin") {
      await ctx.db.insert("organizerCredits", {
        organizerId: userId,
        creditsTotal: 1000,
        creditsUsed: 0,
        creditsRemaining: 1000,
        firstEventFreeUsed: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return userId;
  },
});

/**
 * Update user password (for password reset)
 */
export const updateUserPassword = mutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Update user password
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Store password reset token
 */
export const storePasswordResetToken = mutation({
  args: {
    userId: v.id("users"),
    tokenHash: v.string(),
    expiry: v.number(),
  },
  handler: async (ctx, args) => {
    // Store reset token in user record
    await ctx.db.patch(args.userId, {
      passwordResetToken: args.tokenHash,
      passwordResetExpiry: args.expiry,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Reset password using token
 */
export const resetPassword = mutation({
  args: {
    tokenHash: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user with matching reset token
    const user = await ctx.db
      .query("users")
      .withIndex("by_passwordResetToken", (q) => q.eq("passwordResetToken", args.tokenHash))
      .first();

    if (!user) {
      return {
        success: false,
        error: "Invalid reset token",
      };
    }

    // Check if token is expired
    if (user.passwordResetExpiry && Date.now() > user.passwordResetExpiry) {
      // Clear expired token
      await ctx.db.patch(user._id, {
        passwordResetToken: undefined,
        passwordResetExpiry: undefined,
        updatedAt: Date.now(),
      });

      return {
        success: false,
        error: "Reset token has expired",
      };
    }

    // Update password and clear reset token
    await ctx.db.patch(user._id, {
      passwordHash: args.passwordHash,
      passwordResetToken: undefined,
      passwordResetExpiry: undefined,
      emailVerified: true, // Mark as verified since they proved email ownership
      updatedAt: Date.now(),
    });

    return {
      success: true,
      email: user.email,
    };
  },
});
