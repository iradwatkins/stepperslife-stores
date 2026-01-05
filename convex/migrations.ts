/**
 * Data Migration Functions
 *
 * These are one-time migration functions to update existing data.
 * Call them from the Convex dashboard or via npx convex run
 */

import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Migrate all legacy staff roles to new role names
 *
 * SELLER -> TEAM_MEMBERS
 * SCANNER -> STAFF
 * SUPPORT_STAFF -> TEAM_MEMBERS
 * SUB_RESELLER -> ASSOCIATES
 */
export const migrateStaffRoles = internalMutation({
  args: {},
  handler: async (ctx) => {

    // Get all staff records
    const allStaff = await ctx.db.query("eventStaff").collect();

    let migratedCount = 0;
    const migrationMap: Record<string, string> = {
      SELLER: "TEAM_MEMBERS",
      SCANNER: "STAFF",
      SUPPORT_STAFF: "TEAM_MEMBERS",
      SUB_RESELLER: "ASSOCIATES",
    };

    for (const staff of allStaff) {
      const newRole = migrationMap[staff.role];

      if (newRole) {
        await ctx.db.patch(staff._id, {
          role: newRole as any,
        });
        migratedCount++;
      }
    }


    return {
      success: true,
      migratedCount,
      totalRecords: allStaff.length,
    };
  },
});
