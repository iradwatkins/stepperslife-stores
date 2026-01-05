import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { isAdminEmail, PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Create or update user from OAuth sign-in
 * This is called after successful Google OAuth authentication
 */
export const upsertUserFromAuth = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        image: args.image,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        image: args.image,
        role: "user",
        emailVerified: true,
        welcomePopupShown: false, // Will be shown when they create first event
        createdAt: now,
        updatedAt: now,
      });

      // Credits will be granted when user creates their first event
      // Normal signup is for attendees who buy tickets, not organizers yet

      return userId;
    }
  },
});

/**
 * Update the current user's profile information
 * Allows users to update their own name, phone, and date of birth
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Build updates object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim() || undefined;
    }
    if (args.dateOfBirth !== undefined) {
      updates.dateOfBirth = args.dateOfBirth || undefined;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Mark the welcome popup as shown for the current user
 */
export const markWelcomePopupShown = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      welcomePopupShown: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark first event ticket popup as shown
 */
export const markFirstEventTicketPopupShown = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      firstEventTicketPopupShown: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a new user with email/password registration
 */
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(), // Pre-hashed password (hash before calling this)
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      passwordHash: args.passwordHash, // Store pre-hashed password
      role: (args.role || "organizer") as "admin" | "organizer" | "user",
      emailVerified: false,
      welcomePopupShown: false,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Update payment processor settings for an organizer
 * Allows organizers to enable/disable which payment methods they accept for ticket sales
 */
export const updatePaymentProcessorSettings = mutation({
  args: {
    acceptsStripePayments: v.optional(v.boolean()),
    acceptsPaypalPayments: v.optional(v.boolean()),
    acceptsCashPayments: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only allow organizers to update payment settings
    if (user.role !== "organizer" && user.role !== "admin") {
      throw new Error("Only organizers can configure payment processors");
    }

    const updates: any = { updatedAt: Date.now() };

    if (args.acceptsStripePayments !== undefined) {
      updates.acceptsStripePayments = args.acceptsStripePayments;
    }
    if (args.acceptsPaypalPayments !== undefined) {
      updates.acceptsPaypalPayments = args.acceptsPaypalPayments;
    }
    if (args.acceptsCashPayments !== undefined) {
      updates.acceptsCashPayments = args.acceptsCashPayments;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Connect Stripe account for receiving ticket payments
 * This saves the account ID but marks setup as incomplete until verified
 */
export const connectStripeAccount = mutation({
  args: {
    stripeConnectedAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      stripeConnectedAccountId: args.stripeConnectedAccountId,
      stripeAccountSetupComplete: false, // Mark as incomplete until verified
      acceptsStripePayments: false, // Don't enable until setup complete
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark Stripe account setup as complete after verifying with Stripe
 * This is called after the organizer completes the Stripe Connect onboarding
 */
export const markStripeAccountComplete = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.stripeConnectedAccountId) {
      throw new Error("No Stripe account connected");
    }

    await ctx.db.patch(user._id, {
      stripeAccountSetupComplete: true,
      acceptsStripePayments: true, // Auto-enable when setup complete
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update Stripe account status from webhook
 * This allows webhooks to update account status when Stripe sends updates
 */
export const updateStripeAccountStatus = mutation({
  args: {
    accountId: v.string(),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
    detailsSubmitted: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find user by Stripe account ID
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => u.stripeConnectedAccountId === args.accountId);

    if (!user) {
      // This is okay - might be a test account or deleted user
      return { success: false, reason: "User not found for account" };
    }

    // Update account status based on Stripe's data
    const setupComplete = args.detailsSubmitted && args.chargesEnabled && args.payoutsEnabled;

    await ctx.db.patch(user._id, {
      stripeAccountSetupComplete: setupComplete,
      acceptsStripePayments: setupComplete,
      updatedAt: Date.now(),
    });

    return { success: true, setupComplete };
  },
});

/**
 * Connect PayPal account for receiving ticket payments
 * Saves Partner Referral ID and merchant ID, marks setup as incomplete initially
 */
export const connectPaypalAccount = mutation({
  args: {
    paypalMerchantId: v.optional(v.string()),
    paypalPartnerReferralId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      paypalMerchantId: args.paypalMerchantId,
      paypalPartnerReferralId: args.paypalPartnerReferralId,
      paypalAccountSetupComplete: false, // Mark as incomplete until verified
      acceptsPaypalPayments: false, // Don't enable until setup complete
      paypalOnboardingStatus: "PENDING",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark PayPal account setup as complete after verifying with PayPal API
 */
export const markPayPalAccountComplete = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.paypalMerchantId) {
      throw new Error("No PayPal account connected");
    }

    await ctx.db.patch(user._id, {
      paypalAccountSetupComplete: true,
      acceptsPaypalPayments: true, // Auto-enable when setup complete
      paypalOnboardingStatus: "COMPLETED",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update PayPal account onboarding status (called from webhooks or status check)
 */
export const updatePayPalAccountStatus = mutation({
  args: {
    paypalMerchantId: v.string(),
    setupComplete: v.boolean(),
    onboardingStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by PayPal merchant ID
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => u.paypalMerchantId === args.paypalMerchantId);

    if (!user) {
      throw new Error(`No user found with PayPal merchant ID: ${args.paypalMerchantId}`);
    }

    const updates: any = {
      paypalAccountSetupComplete: args.setupComplete,
      acceptsPaypalPayments: args.setupComplete,
      updatedAt: Date.now(),
    };

    if (args.onboardingStatus) {
      updates.paypalOnboardingStatus = args.onboardingStatus;
    }

    if (!args.setupComplete) {
      updates.acceptsPaypalPayments = false;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Disconnect a payment processor
 */
export const disconnectPaymentProcessor = mutation({
  args: {
    processor: v.union(v.literal("stripe"), v.literal("paypal")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = { updatedAt: Date.now() };

    if (args.processor === "stripe") {
      updates.stripeConnectedAccountId = undefined;
      updates.stripeAccountSetupComplete = false;
      updates.acceptsStripePayments = false;
    } else if (args.processor === "paypal") {
      updates.paypalMerchantId = undefined;
      updates.paypalAccountSetupComplete = false;
      updates.acceptsPaypalPayments = false;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Internal mutation to update password hash (for CLI/testing use)
 * This is called from the deploy key, not from the browser
 */
export const internalUpdatePasswordHash = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Internal mutation to update user role (for CLI/testing use)
 */
export const internalUpdateUserRole = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("organizer"), v.literal("instructor"), v.literal("restaurateur"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return { success: true, role: args.role };
  },
});

/**
 * Update user password hash (ADMIN ONLY - highly sensitive)
 * PRODUCTION: Requires admin authentication
 */
export const updatePasswordHash = mutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication for password changes
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is a sensitive operation.");
    }

    // Verify admin privileges
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Admin access required. Only administrators can update user passwords.");
    }

    // Log admin action for security audit

    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update user role (ADMIN ONLY - highly sensitive)
 * PRODUCTION: Requires admin authentication
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("organizer"), v.literal("instructor"), v.literal("restaurateur"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication for role changes
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is a sensitive operation.");
    }

    // Verify admin privileges
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Admin access required. Only administrators can change user roles.");
    }

    // Prevent removing the last admin
    if (args.role !== "admin") {
      const targetUser = await ctx.db.get(args.userId);
      if (targetUser?.role === "admin") {
        const allAdmins = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .collect();

        if (allAdmins.length <= 1) {
          throw new Error("Cannot remove the last admin. Please assign another admin first.");
        }
      }
    }

    // Log admin action for security audit

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return { success: true, role: args.role };
  },
});

/**
 * Update user permissions (ADMIN ONLY)
 * Used to restrict organizers to only certain event types
 * PRODUCTION: Requires admin authentication
 */
export const updateUserPermissions = mutation({
  args: {
    userId: v.id("users"),
    canCreateTicketedEvents: v.boolean(),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication for permission changes
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is a sensitive operation.");
    }

    // Verify admin privileges
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Admin access required. Only administrators can modify user permissions.");
    }

    // Log admin action for security audit

    await ctx.db.patch(args.userId, {
      canCreateTicketedEvents: args.canCreateTicketedEvents,
      updatedAt: Date.now(),
    });

    return { success: true, canCreateTicketedEvents: args.canCreateTicketedEvents };
  },
});

/**
 * Create or update user from Google OAuth
 */
export const upsertUserFromGoogle = mutation({
  args: {
    googleId: v.string(),
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if email is in admin list
    const shouldBeAdmin = isAdminEmail(args.email);

    // Check if user already exists by Google ID
    let user = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();

    // If not found by Google ID, check by email
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      // If found by email, link Google ID and ensure admin role if applicable
      if (user) {
        const updates: any = {
          googleId: args.googleId,
          authProvider: "google",
          name: args.name,
          image: args.image,
          emailVerified: true,
          updatedAt: now,
        };

        // Grant admin role if email is in admin list
        if (shouldBeAdmin && user.role !== "admin") {
          updates.role = "admin";
          updates.canCreateTicketedEvents = true;
        }

        await ctx.db.patch(user._id, updates);
        return user._id;
      }
    }

    // If user exists with Google ID, update and ensure admin role if applicable
    if (user) {
      const updates: any = {
        name: args.name,
        image: args.image,
        updatedAt: now,
      };

      // Grant admin role if email is in admin list
      if (shouldBeAdmin && user.role !== "admin") {
        updates.role = "admin";
        updates.canCreateTicketedEvents = true;
      }

      await ctx.db.patch(user._id, updates);
      return user._id;
    }

    // Create new user with admin role if email is in admin list
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      image: args.image,
      googleId: args.googleId,
      authProvider: "google",
      role: shouldBeAdmin ? "admin" : "user",
      canCreateTicketedEvents: shouldBeAdmin,
      emailVerified: true,
      welcomePopupShown: false,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Delete a user (ADMIN ONLY - highly sensitive)
 * This will also delete all related data
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Require admin authentication
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. This is a sensitive operation.");
    }

    // Verify admin privileges
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Admin access required. Only administrators can delete users.");
    }

    // Get the user to be deleted
    const userToDelete = await ctx.db.get(args.userId);
    if (!userToDelete) {
      throw new Error("User not found");
    }

    // Prevent deleting the last admin
    if (userToDelete.role === "admin") {
      const allAdmins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();

      if (allAdmins.length <= 1) {
        throw new Error("Cannot delete the last admin.");
      }
    }

    // Log admin action for security audit

    // Delete the user
    await ctx.db.delete(args.userId);

    return { success: true, deletedEmail: userToDelete.email };
  },
});

/**
 * Upgrade current user to organizer role (self-service)
 * Called from /create wizard when user selects "Event Organizer"
 * NOTE: This is safe because organizers don't have admin privileges,
 * they just get access to create events.
 */
export const upgradeToOrganizer = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Don't downgrade admins
    if (user.role === "admin") {
      return { success: true, role: "admin", message: "Already an admin" };
    }

    // Don't override other specialized roles (they can still create events)
    // but organizer is considered a "promotion" from user role
    if (user.role !== "user") {
      return { success: true, role: user.role, message: "Already has a specialized role" };
    }

    await ctx.db.patch(user._id, {
      role: "organizer",
      updatedAt: Date.now(),
    });

    // Initialize organizer credits for new organizers
    const existingCredits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!existingCredits) {
      await ctx.db.insert("organizerCredits", {
        organizerId: user._id,
        creditsTotal: 100, // Standard organizer credits
        creditsUsed: 0,
        creditsRemaining: 100,
        firstEventFreeUsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    console.log("[users:upgradeToOrganizer] User upgraded to organizer:", user._id);

    return { success: true, role: "organizer" };
  },
});

/**
 * Update workspace preferences (which workspaces to hide from navigation)
 * Users can disable any workspace except "customer" (My Account)
 * Admin users cannot disable workspaces
 */
export const updateWorkspacePreferences = mutation({
  args: {
    disabledWorkspaces: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Admin users cannot disable workspaces (they have different access patterns)
    if (user.role === "admin") {
      throw new Error("Admin users cannot disable workspaces");
    }

    // Filter out "customer" workspace - it can never be disabled
    const filteredWorkspaces = args.disabledWorkspaces.filter(
      (ws) => ws !== "customer"
    );

    await ctx.db.patch(user._id, {
      disabledWorkspaces: filteredWorkspaces,
      updatedAt: Date.now(),
    });

    return { success: true, disabledWorkspaces: filteredWorkspaces };
  },
});

/**
 * Bootstrap admin role for initial setup
 * Uses a secret key instead of admin auth (for bootstrapping only)
 * IMPORTANT: This should be disabled or removed in production after initial setup
 */
export const bootstrapAdmin = mutation({
  args: {
    email: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify bootstrap secret
    const validSecret = "stepperslife-admin-setup-2025";
    if (args.secretKey !== validSecret) {
      throw new Error("Invalid secret key");
    }

    // Only allow specific admin emails to be bootstrapped
    const adminEmails = [
      PRIMARY_ADMIN_EMAIL,
      "admin-test@stepperslife.com",
      "platformadmin@stepperslife.com",
    ];

    if (!adminEmails.includes(args.email.toLowerCase())) {
      throw new Error("Email not in admin whitelist");
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Update to admin role
    await ctx.db.patch(user._id, {
      role: "admin",
      canCreateTicketedEvents: true,
      updatedAt: Date.now(),
    });

    // Initialize admin credits if not exists
    const existingCredits = await ctx.db
      .query("organizerCredits")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .first();

    if (!existingCredits) {
      await ctx.db.insert("organizerCredits", {
        organizerId: user._id,
        creditsTotal: 1000, // Admins get more credits
        creditsUsed: 0,
        creditsRemaining: 1000,
        firstEventFreeUsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      email: user.email,
      role: "admin",
      message: "User upgraded to admin successfully",
    };
  },
});
