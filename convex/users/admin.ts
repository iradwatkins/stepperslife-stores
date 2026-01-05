import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ADMIN_EMAILS, isAdminEmail } from "../lib/roles";

/**
 * Internal mutation to bulk delete users
 * This bypasses authentication and can only be called from scripts/crons
 */
export const bulkDeleteUsers = internalMutation({
  args: {
    emailsToKeep: v.array(v.string()),
  },
  handler: async (ctx, args) => {

    // Get all users
    const allUsers = await ctx.db.query("users").collect();

    const emailsToKeepLower = args.emailsToKeep.map((e) => e.toLowerCase());

    // Filter users to delete
    const usersToDelete = allUsers.filter(
      (user) => !emailsToKeepLower.includes(user.email.toLowerCase())
    );


    let deletedCount = 0;

    // Delete each user
    for (const user of usersToDelete) {
      try {
        await ctx.db.delete(user._id);
        deletedCount++;
      } catch (error) {
        console.error(`✗ Failed to delete ${user.email}:`, error);
      }
    }

    // Ensure remaining users are admins
    const remainingUsers = await ctx.db.query("users").collect();
    for (const user of remainingUsers) {
      if (user.role !== "admin") {
        await ctx.db.patch(user._id, {
          role: "admin",
          updatedAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      totalUsers: allUsers.length,
      deletedCount,
      remainingCount: remainingUsers.length,
    };
  },
});

/**
 * Ensure admin emails have admin role
 * This can be called from scripts or run manually
 */
export const ensureAdminAccess = internalMutation({
  args: {},
  handler: async (ctx) => {
    const updates = [];

    for (const email of ADMIN_EMAILS) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (user) {
        if (user.role !== "admin") {
          await ctx.db.patch(user._id, {
            role: "admin",
            canCreateTicketedEvents: true,
            updatedAt: Date.now(),
          });
          updates.push(`Updated ${email} to admin`);
        } else {
          updates.push(`${email} already admin`);
        }
      } else {
        // Create admin user if doesn't exist
        await ctx.db.insert("users", {
          email,
          name: email.split("@")[0],
          role: "admin",
          authProvider: "google",
          canCreateTicketedEvents: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        updates.push(`Created admin user for ${email}`);
      }
    }

    return {
      success: true,
      adminEmails: ADMIN_EMAILS,
      updates,
    };
  },
});
