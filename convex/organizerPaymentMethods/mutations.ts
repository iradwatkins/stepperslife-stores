import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Add a bank account as a payment method
 */
export const addBankAccount = mutation({
  args: {
    nickname: v.optional(v.string()),
    bankName: v.string(),
    accountType: v.union(v.literal("checking"), v.literal("savings")),
    accountHolderName: v.string(),
    routingNumber: v.string(),
    accountNumber: v.string(), // Full account number - we only store last 4
    setAsDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is an organizer
    if (user.role !== "organizer" && user.role !== "admin") {
      throw new Error("Only organizers can add payment methods");
    }

    const now = Date.now();

    // If setting as default, unset any existing default
    if (args.setAsDefault) {
      const existingMethods = await ctx.db
        .query("organizerPaymentMethods")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .collect();

      for (const method of existingMethods) {
        if (method.isDefault) {
          await ctx.db.patch(method._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    // Check if this is the first payment method (auto-set as default)
    const existingCount = await ctx.db
      .query("organizerPaymentMethods")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const isFirstMethod = existingCount.length === 0;

    // Extract last 4 digits of account number
    const accountNumberLast4 = args.accountNumber.slice(-4);

    // Validate routing number format (9 digits)
    if (!/^\d{9}$/.test(args.routingNumber)) {
      throw new Error("Invalid routing number format. Must be 9 digits.");
    }

    // Create the payment method
    const paymentMethodId = await ctx.db.insert("organizerPaymentMethods", {
      organizerId: user._id,
      type: "bank_account",
      isDefault: args.setAsDefault || isFirstMethod,
      nickname: args.nickname,
      bankName: args.bankName,
      accountType: args.accountType,
      accountHolderName: args.accountHolderName,
      routingNumber: args.routingNumber, // In production, this should be encrypted
      accountNumberLast4,
      status: "active", // Bank accounts are active immediately (manual verification later)
      createdAt: now,
      updatedAt: now,
    });

    return {
      paymentMethodId,
      message: "Bank account added successfully",
    };
  },
});

/**
 * Add a PayPal account as a payment method
 */
export const addPayPal = mutation({
  args: {
    nickname: v.optional(v.string()),
    paypalEmail: v.string(),
    setAsDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "organizer" && user.role !== "admin") {
      throw new Error("Only organizers can add payment methods");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.paypalEmail)) {
      throw new Error("Invalid PayPal email format");
    }

    const now = Date.now();

    // If setting as default, unset any existing default
    if (args.setAsDefault) {
      const existingMethods = await ctx.db
        .query("organizerPaymentMethods")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .collect();

      for (const method of existingMethods) {
        if (method.isDefault) {
          await ctx.db.patch(method._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    // Check if this is the first payment method
    const existingCount = await ctx.db
      .query("organizerPaymentMethods")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const isFirstMethod = existingCount.length === 0;

    // Check if PayPal email already exists for this organizer
    const existingPayPal = existingCount.find(
      (m) => m.type === "paypal" && m.paypalEmail === args.paypalEmail
    );

    if (existingPayPal) {
      throw new Error("This PayPal email is already added");
    }

    const paymentMethodId = await ctx.db.insert("organizerPaymentMethods", {
      organizerId: user._id,
      type: "paypal",
      isDefault: args.setAsDefault || isFirstMethod,
      nickname: args.nickname,
      paypalEmail: args.paypalEmail,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return {
      paymentMethodId,
      message: "PayPal account added successfully",
    };
  },
});

/**
 * Connect Stripe account (stores the connected account ID from Stripe)
 */
export const connectStripeAccount = mutation({
  args: {
    stripeConnectedAccountId: v.string(),
    nickname: v.optional(v.string()),
    setAsDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "organizer" && user.role !== "admin") {
      throw new Error("Only organizers can add payment methods");
    }

    const now = Date.now();

    // Check if Stripe account already exists
    const existingMethods = await ctx.db
      .query("organizerPaymentMethods")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    const existingStripe = existingMethods.find(
      (m) =>
        m.type === "stripe_connect" &&
        m.stripeConnectedAccountId === args.stripeConnectedAccountId
    );

    if (existingStripe) {
      // Update existing Stripe connection
      await ctx.db.patch(existingStripe._id, {
        stripeAccountStatus: "active",
        updatedAt: now,
      });
      return {
        paymentMethodId: existingStripe._id,
        message: "Stripe account updated",
      };
    }

    // If setting as default, unset any existing default
    if (args.setAsDefault) {
      for (const method of existingMethods) {
        if (method.isDefault) {
          await ctx.db.patch(method._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    const isFirstMethod = existingMethods.length === 0;

    const paymentMethodId = await ctx.db.insert("organizerPaymentMethods", {
      organizerId: user._id,
      type: "stripe_connect",
      isDefault: args.setAsDefault || isFirstMethod,
      nickname: args.nickname || "Stripe Connect",
      stripeConnectedAccountId: args.stripeConnectedAccountId,
      stripeAccountStatus: "pending", // Will be updated by webhook
      status: "pending_verification",
      createdAt: now,
      updatedAt: now,
    });

    // Also update user record with Stripe account ID for backward compatibility
    await ctx.db.patch(user._id, {
      stripeConnectedAccountId: args.stripeConnectedAccountId,
    });

    return {
      paymentMethodId,
      message: "Stripe account connected. Verification pending.",
    };
  },
});

/**
 * Set a payment method as default
 */
export const setAsDefault = mutation({
  args: {
    paymentMethodId: v.id("organizerPaymentMethods"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const paymentMethod = await ctx.db.get(args.paymentMethodId);

    if (!paymentMethod || paymentMethod.organizerId !== user._id) {
      throw new Error("Payment method not found");
    }

    if (paymentMethod.status !== "active") {
      throw new Error("Can only set active payment methods as default");
    }

    const now = Date.now();

    // Unset any existing default
    const existingMethods = await ctx.db
      .query("organizerPaymentMethods")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .collect();

    for (const method of existingMethods) {
      if (method.isDefault && method._id !== args.paymentMethodId) {
        await ctx.db.patch(method._id, { isDefault: false, updatedAt: now });
      }
    }

    // Set the new default
    await ctx.db.patch(args.paymentMethodId, {
      isDefault: true,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Remove a payment method
 */
export const removePaymentMethod = mutation({
  args: {
    paymentMethodId: v.id("organizerPaymentMethods"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const paymentMethod = await ctx.db.get(args.paymentMethodId);

    if (!paymentMethod || paymentMethod.organizerId !== user._id) {
      throw new Error("Payment method not found");
    }

    // Check if there are pending payouts using this method
    const pendingPayouts = await ctx.db
      .query("organizerPayouts")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "PENDING"),
          q.eq(q.field("status"), "APPROVED"),
          q.eq(q.field("status"), "PROCESSING")
        )
      )
      .collect();

    if (pendingPayouts.length > 0) {
      throw new Error(
        "Cannot remove payment method while there are pending payouts"
      );
    }

    const wasDefault = paymentMethod.isDefault;

    // Delete the payment method
    await ctx.db.delete(args.paymentMethodId);

    // If this was the default, set the first remaining method as default
    if (wasDefault) {
      const remainingMethods = await ctx.db
        .query("organizerPaymentMethods")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (remainingMethods) {
        await ctx.db.patch(remainingMethods._id, {
          isDefault: true,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

/**
 * Update payment method nickname
 */
export const updateNickname = mutation({
  args: {
    paymentMethodId: v.id("organizerPaymentMethods"),
    nickname: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const paymentMethod = await ctx.db.get(args.paymentMethodId);

    if (!paymentMethod || paymentMethod.organizerId !== user._id) {
      throw new Error("Payment method not found");
    }

    await ctx.db.patch(args.paymentMethodId, {
      nickname: args.nickname,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update Stripe account status (called by webhook)
 */
export const updateStripeAccountStatus = mutation({
  args: {
    stripeConnectedAccountId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // This would typically be called by a Stripe webhook
    // Find all payment methods with this Stripe account ID
    const paymentMethods = await ctx.db
      .query("organizerPaymentMethods")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "stripe_connect"),
          q.eq(q.field("stripeConnectedAccountId"), args.stripeConnectedAccountId)
        )
      )
      .collect();

    const now = Date.now();

    for (const method of paymentMethods) {
      await ctx.db.patch(method._id, {
        stripeAccountStatus: args.status,
        status: args.status === "active" ? "active" : "pending_verification",
        verifiedAt: args.status === "active" ? now : method.verifiedAt,
        updatedAt: now,
      });
    }

    return { updatedCount: paymentMethods.length };
  },
});
