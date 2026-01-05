import { internalMutation } from "../_generated/server";

/**
 * Update test user roles
 * Run with: npx convex run scripts/updateTestUserRoles
 */
export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const updates = [];

    // Update admin-test@stepperslife.com to admin role
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin-test@stepperslife.com"))
      .first();

    if (adminUser) {
      await ctx.db.patch(adminUser._id, {
        role: "admin",
        canCreateTicketedEvents: true,
        updatedAt: Date.now(),
      });
      updates.push(`Updated admin-test@stepperslife.com to admin role`);
    } else {
      updates.push(`admin-test@stepperslife.com not found`);
    }

    // Update user-test@stepperslife.com to user role
    const regularUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "user-test@stepperslife.com"))
      .first();

    if (regularUser) {
      await ctx.db.patch(regularUser._id, {
        role: "user",
        updatedAt: Date.now(),
      });
      updates.push(`Updated user-test@stepperslife.com to user role`);
    } else {
      updates.push(`user-test@stepperslife.com not found`);
    }

    return {
      success: true,
      updates,
    };
  },
});
