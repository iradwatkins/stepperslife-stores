import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration Report: Identify organizers who have created classes
 *
 * This query identifies users who:
 * 1. Have role "organizer"
 * 2. Have created events with eventType "CLASS"
 *
 * These users may need to be reassigned to the "instructor" role.
 */
export const getClassCreators = query({
  args: {},
  handler: async (ctx) => {
    // Get all events with eventType CLASS
    const allEvents = await ctx.db.query("events").collect();
    const classes = allEvents.filter((e) => e.eventType === "CLASS");

    if (classes.length === 0) {
      return {
        summary: "No classes found in the database.",
        affectedUsers: [],
        totalClasses: 0,
        totalEvents: allEvents.length,
      };
    }

    // Get unique organizer IDs from classes
    const classOrganizerIds = [...new Set(classes.map((c) => c.organizerId).filter(Boolean))];

    // Get user details for each organizer
    const affectedUsers = await Promise.all(
      classOrganizerIds.map(async (organizerId) => {
        if (!organizerId) return null;

        const user = await ctx.db.get(organizerId);
        if (!user) return null;

        // Count their classes vs events
        const userClasses = classes.filter((c) => c.organizerId === organizerId);
        const userEvents = allEvents.filter(
          (e) => e.organizerId === organizerId && e.eventType !== "CLASS"
        );

        return {
          userId: user._id,
          name: user.name || "Unknown",
          email: user.email,
          currentRole: user.role,
          classCount: userClasses.length,
          eventCount: userEvents.length,
          recommendation:
            userEvents.length === 0
              ? "MAKE_INSTRUCTOR"
              : userClasses.length > userEvents.length
                ? "MAKE_INSTRUCTOR"
                : "KEEP_ORGANIZER",
          classNames: userClasses.map((c) => c.name).slice(0, 5),
        };
      })
    );

    // Filter out nulls and sort by class count
    const validUsers = affectedUsers
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .sort((a, b) => b.classCount - a.classCount);

    return {
      summary: `Found ${validUsers.length} user(s) who have created classes.`,
      affectedUsers: validUsers,
      totalClasses: classes.length,
      totalEvents: allEvents.filter((e) => e.eventType !== "CLASS").length,
      recommendations: {
        makeInstructor: validUsers.filter((u) => u.recommendation === "MAKE_INSTRUCTOR").length,
        keepOrganizer: validUsers.filter((u) => u.recommendation === "KEEP_ORGANIZER").length,
      },
    };
  },
});

/**
 * Get all users with their role breakdown
 * Useful for admin to see current role distribution
 */
export const getRoleDistribution = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const roleCounts: Record<string, number> = {};
    for (const user of users) {
      const role = user.role || "user";
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }

    return {
      totalUsers: users.length,
      roleCounts,
      roles: Object.entries(roleCounts).map(([role, count]) => ({
        role,
        count,
        percentage: ((count / users.length) * 100).toFixed(1) + "%",
      })),
    };
  },
});

/**
 * Migration Mutation: Assign instructor role to a user
 *
 * This is an internal migration mutation that can be run via CLI.
 * It bypasses normal auth checks since it's used for one-time migrations.
 *
 * USAGE: npx convex run migrations/roleSeparation:assignInstructorRole '{"userId": "...", "confirm": true}'
 */
export const assignInstructorRole = mutation({
  args: {
    userId: v.id("users"),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirm) {
      return {
        success: false,
        message: "Set confirm: true to execute this migration.",
      };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        success: false,
        message: `User not found: ${args.userId}`,
      };
    }

    const previousRole = user.role;

    await ctx.db.patch(args.userId, {
      role: "instructor",
    });

    return {
      success: true,
      message: `Updated user ${user.email} from "${previousRole}" to "instructor"`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        previousRole,
        newRole: "instructor",
      },
    };
  },
});

/**
 * Bulk assign instructor role to all class creators
 *
 * USAGE: npx convex run migrations/roleSeparation:bulkAssignInstructorRole '{"confirm": true}'
 */
export const bulkAssignInstructorRole = mutation({
  args: {
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirm) {
      return {
        success: false,
        message: "Set confirm: true to execute this migration.",
        dryRun: true,
      };
    }

    // Get all events with eventType CLASS
    const allEvents = await ctx.db.query("events").collect();
    const classes = allEvents.filter((e) => e.eventType === "CLASS");

    if (classes.length === 0) {
      return {
        success: true,
        message: "No classes found. No users to migrate.",
        updated: [],
      };
    }

    // Get unique organizer IDs from classes
    const classOrganizerIds = [...new Set(classes.map((c) => c.organizerId).filter(Boolean))];

    const results = [];

    for (const organizerId of classOrganizerIds) {
      if (!organizerId) continue;

      const user = await ctx.db.get(organizerId);
      if (!user) continue;

      // Skip if already instructor
      if (user.role === "instructor") {
        results.push({
          userId: user._id,
          email: user.email,
          status: "skipped",
          reason: "Already instructor",
        });
        continue;
      }

      // Skip admins - they don't need role change
      if (user.role === "admin") {
        results.push({
          userId: user._id,
          email: user.email,
          status: "skipped",
          reason: "Admin users are not migrated",
        });
        continue;
      }

      const previousRole = user.role;
      await ctx.db.patch(organizerId, {
        role: "instructor",
      });

      results.push({
        userId: user._id,
        email: user.email,
        status: "updated",
        previousRole,
        newRole: "instructor",
      });
    }

    return {
      success: true,
      message: `Migration complete. ${results.filter((r) => r.status === "updated").length} user(s) updated.`,
      updated: results,
    };
  },
});
