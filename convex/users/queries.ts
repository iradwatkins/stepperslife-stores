import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Get the currently authenticated user from the database.
 * Uses JWT identity from ctx.auth to look up user by email.
 *
 * @returns User document if authenticated and found, null otherwise
 *
 * @security In development, returns a test admin user if no identity.
 *           In production, requires valid authentication.
 *
 * @example
 * const currentUser = useQuery(api.users.queries.getCurrentUser)
 * if (!currentUser) redirect('/login')
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // PRODUCTION: No identity - return null (user must log in)
    if (!identity) {
      return null;
    }

    // Parse the identity (which is a JSON string from our NextAuth integration)
    let userInfo;
    try {
      userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    } catch (error) {
      console.error("[getCurrentUser] Failed to parse identity:", error);
      userInfo = identity;
    }

    const email = userInfo.email || identity.email;

    if (!email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();


    return user;
  },
});

/**
 * Check if user is authenticated
 */
export const isAuthenticated = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return !!identity;
  },
});

/**
 * Debug: Get raw identity information for troubleshooting
 */
export const getIdentityDebug = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { authenticated: false, identity: null };
    }

    // Return all available fields from the identity
    return {
      authenticated: true,
      identity: {
        // Standard Convex identity fields
        tokenIdentifier: identity.tokenIdentifier,
        subject: (identity as any).subject,
        issuer: (identity as any).issuer,
        // Custom claims from our JWT
        email: identity.email,
        name: identity.name,
        role: (identity as any).role,
        // Raw object for debugging
        raw: JSON.stringify(identity),
      },
    };
  },
});

/**
 * Get user by ID (internal use only - includes password hash).
 * For client-facing endpoints, use getUserByIdPublic instead.
 *
 * @param userId - The user document ID
 * @returns Full user document including passwordHash
 *
 * @security This query exposes sensitive data. Only use server-side.
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Get user by ID (internal - for use by other Convex functions)
 */
export const getByIdInternal = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get user by ID with sensitive fields removed (safe for client use).
 * Excludes passwordHash from the returned document.
 *
 * @param userId - The user document ID
 * @returns User document without passwordHash, or null if not found
 *
 * @example
 * const profile = useQuery(api.users.queries.getUserByIdPublic, { userId: profileId })
 */
export const getUserByIdPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    // Don't return password hash to client
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

/**
 * Get user by email address
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return user;
  },
});

/**
 * Get Stripe Connect account status for the current authenticated user.
 * Used to check if organizer has completed Stripe onboarding.
 *
 * @returns Object with stripeConnectedAccountId, setup status, and payment acceptance flag
 * @returns null if user not authenticated or not found
 *
 * @example
 * const stripeInfo = useQuery(api.users.queries.getStripeConnectAccount)
 * if (!stripeInfo?.stripeAccountSetupComplete) showOnboardingPrompt()
 */
export const getStripeConnectAccount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    const email = userInfo.email || identity.email;
    if (!email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return null;
    }

    return {
      stripeConnectedAccountId: user.stripeConnectedAccountId,
      stripeAccountSetupComplete: user.stripeAccountSetupComplete,
      acceptsStripePayments: user.acceptsStripePayments,
    };
  },
});

/**
 * Get PayPal account info for current user
 */
export const getPayPalAccount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    const email = userInfo.email || identity.email;
    if (!email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return null;
    }

    return {
      paypalMerchantId: user.paypalMerchantId,
      paypalAccountSetupComplete: user.paypalAccountSetupComplete,
      paypalPartnerReferralId: user.paypalPartnerReferralId,
      paypalOnboardingStatus: user.paypalOnboardingStatus,
      acceptsPaypalPayments: user.acceptsPaypalPayments,
    };
  },
});

/**
 * Get an admin user (internal - for setup scripts)
 */
export const getAdminUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    // First try to find the primary admin
    const primaryAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", PRIMARY_ADMIN_EMAIL))
      .first();

    if (primaryAdmin) {
      return primaryAdmin;
    }

    // Otherwise find any admin user
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.find((u) => u.role === "admin") || null;
  },
});

/**
 * Get user by email (internal - for setup scripts)
 */
export const getByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Get all creator profiles for the current user.
 * Used to show "For Creators" navigation in profile dropdown.
 *
 * @returns Object indicating which creator profiles the user has, or null if not authenticated
 *
 * @example
 * const profiles = useQuery(api.users.queries.getCreatorProfiles)
 * if (profiles?.hasInstructor) showInstructorDashboardLink()
 */
export const getCreatorProfiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // PRODUCTION: No identity - return null (user must log in)
    if (!identity) {
      return null;
    }

    // Parse the identity
    let userInfo;
    try {
      userInfo = typeof identity === "string" ? JSON.parse(identity) : identity;
    } catch {
      userInfo = identity;
    }

    const email = userInfo.email || identity.email;
    if (!email) {
      return null;
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return null;
    }

    // Query all creator profiles in parallel
    const [instructor, vendor, restaurant, serviceProvider] = await Promise.all(
      [
        ctx.db
          .query("instructors")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .first(),
        ctx.db
          .query("vendors")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .first(),
        ctx.db
          .query("restaurants")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .first(),
        ctx.db
          .query("serviceProviders")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .first(),
      ]
    );

    return {
      isOrganizer: user.role === "organizer" || user.role === "admin",
      hasInstructor: !!instructor,
      hasVendor: !!vendor,
      hasRestaurant: !!restaurant,
      hasServiceProvider: !!serviceProvider,
    };
  },
});
