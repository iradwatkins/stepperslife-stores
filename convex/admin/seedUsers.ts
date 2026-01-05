import { internalMutation } from "../_generated/server";
import { hashSync } from "bcryptjs";

// Test users configuration
const TEST_PASSWORD = "Bobby321!";

// Pre-compute hash synchronously (bcryptjs async uses setTimeout which isn't allowed in Convex)
const PASSWORD_HASH = hashSync(TEST_PASSWORD, 10);

const testUsers = [
  {
    email: "admin@thestepperslife.com",
    name: "Platform Admin",
    role: "admin" as const,
  },
  {
    email: "organizer@thestepperslife.com",
    name: "Event Organizer",
    role: "organizer" as const,
  },
  {
    email: "organizer2@thestepperslife.com",
    name: "Second Organizer",
    role: "organizer" as const,
  },
  {
    email: "restaurant@thestepperslife.com",
    name: "Restaurant Owner",
    role: "restaurateur" as const,
  },
  {
    email: "vendor@thestepperslife.com",
    name: "Vendor Owner",
    role: "user" as const,
  },
  {
    email: "customer@thestepperslife.com",
    name: "Test Customer",
    role: "user" as const,
  },
  {
    email: "instructor@thestepperslife.com",
    name: "Dance Instructor",
    role: "user" as const,
  },
];

// Seed test user accounts
export const seedUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const results: { email: string; created: boolean; userId?: string }[] = [];

    for (const userData of testUsers) {
      // Check if user already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userData.email))
        .unique();

      if (existing) {
        results.push({ email: userData.email, created: false, userId: existing._id });
        continue;
      }

      // Create user with appropriate permissions based on role
      const userId = await ctx.db.insert("users", {
        name: userData.name,
        email: userData.email,
        emailVerified: true,
        role: userData.role,
        passwordHash: PASSWORD_HASH,
        authProvider: "password",
        // Organizer-specific permissions
        ...(userData.role === "organizer" && {
          canCreateTicketedEvents: true,
          acceptsStripePayments: true,
          acceptsPaypalPayments: true,
          acceptsCashPayments: true,
        }),
        // Admin-specific permissions
        ...(userData.role === "admin" && {
          canCreateTicketedEvents: true,
        }),
        createdAt: now,
        updatedAt: now,
      });

      results.push({ email: userData.email, created: true, userId });
    }

    const created = results.filter((r) => r.created).length;
    return {
      created,
      total: testUsers.length,
      users: results,
    };
  },
});

// Get user IDs by email (helper for other seed functions)
export const getUsersByEmail = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userMap: Record<string, string> = {};

    for (const userData of testUsers) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userData.email))
        .unique();

      if (user) {
        userMap[userData.email] = user._id;
      }
    }

    return userMap;
  },
});
