import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Create Stripe Connect account and return onboarding link
 * This creates the account via API and stores the account ID
 */
export const createStripeConnectAccount = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for Stripe Connect
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to connect Stripe.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    // If user already has a Stripe account, just return a new onboarding link
    if (user.stripeConnectedAccountId) {

      // Return existing account with refresh link
      // The frontend will call the PUT endpoint to get a new account link
      return {
        accountId: user.stripeConnectedAccountId,
        accountLinkUrl: `/organizer/settings?stripe=refresh&accountId=${user.stripeConnectedAccountId}`,
        success: true,
      };
    }

    // Return info needed for frontend to create account via API
    // Frontend will call /api/stripe/create-connect-account with this email
    return {
      accountLinkUrl: `/organizer/settings?stripe=create&email=${user.email}`,
      success: true,
    };
  },
});

/**
 * Save Stripe Connect account ID to user after successful onboarding
 */
export const saveStripeConnectAccount = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for saving Stripe account
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to save Stripe account.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    // Update user with Stripe account ID and mark as setup complete
    await ctx.db.patch(user._id, {
      stripeConnectedAccountId: args.accountId,
      stripeAccountSetupComplete: true,
    });


    return { success: true };
  },
});

/**
 * Save PayPal account (email or merchant ID) for organizer
 * Used for receiving split payments from ticket sales
 * Supports both personal and business PayPal accounts
 */
export const savePayPalAccount = mutation({
  args: {
    paypalMerchantId: v.string(), // Email or merchant ID
    paypalEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Require authentication and only allow users to update their own account
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to connect PayPal.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    // Update user with PayPal account
    await ctx.db.patch(user._id, {
      paypalMerchantId: args.paypalMerchantId,
      paypalAccountSetupComplete: true,
      acceptsPaypalPayments: true,
      updatedAt: Date.now(),
    });

    console.log(`[PayPal] Account saved for user ${user._id}: ${args.paypalMerchantId}`);

    return { success: true };
  },
});

/**
 * Disconnect PayPal account from organizer
 */
export const disconnectPayPalAccount = mutation({
  args: {},
  handler: async (ctx) => {
    // SECURITY: Require authentication and only allow users to disconnect their own account
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to disconnect PayPal.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    // Remove PayPal account info
    await ctx.db.patch(user._id, {
      paypalMerchantId: undefined,
      paypalAccountSetupComplete: false,
      acceptsPaypalPayments: false,
      updatedAt: Date.now(),
    });

    console.log(`[PayPal] Account disconnected for user ${user._id}`);

    return { success: true };
  },
});
