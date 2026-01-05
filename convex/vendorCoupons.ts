import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

// Get all coupons for a vendor (vendor owner only)
export const getByVendor = query({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify user owns this vendor
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || vendor.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    const coupons = await ctx.db
      .query("vendorCoupons")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();

    return coupons;
  },
});

// Validate a coupon code for checkout (public)
export const validateCoupon = query({
  args: {
    vendorId: v.id("vendors"),
    code: v.string(),
    orderTotalCents: v.number(),
    productIds: v.optional(v.array(v.id("products"))),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("vendorCoupons")
      .withIndex("by_vendor_code", (q) =>
        q.eq("vendorId", args.vendorId).eq("code", args.code.toUpperCase())
      )
      .first();

    if (!coupon) {
      return { valid: false, error: "Invalid coupon code" };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "This coupon is no longer active" };
    }

    const now = Date.now();

    // Check validity period
    if (coupon.validFrom && now < coupon.validFrom) {
      return { valid: false, error: "This coupon is not yet valid" };
    }

    if (coupon.validUntil && now > coupon.validUntil) {
      return { valid: false, error: "This coupon has expired" };
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: "This coupon has reached its usage limit" };
    }

    // Check per-customer usage limit
    if (coupon.maxUsesPerCustomer && args.userId) {
      const userUsage = await ctx.db
        .query("vendorCouponUsage")
        .withIndex("by_user_coupon", (q) =>
          q.eq("userId", args.userId!).eq("couponId", coupon._id)
        )
        .collect();

      if (userUsage.length >= coupon.maxUsesPerCustomer) {
        return {
          valid: false,
          error: "You have already used this coupon the maximum number of times",
        };
      }
    }

    // Check minimum purchase
    if (coupon.minPurchaseAmount && args.orderTotalCents < coupon.minPurchaseAmount) {
      return {
        valid: false,
        error: `Minimum purchase of $${(coupon.minPurchaseAmount / 100).toFixed(2)} required`,
      };
    }

    // Check product restrictions
    if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
      if (!args.productIds || args.productIds.length === 0) {
        return { valid: false, error: "This coupon is only valid for specific products" };
      }

      const hasApplicableProduct = args.productIds.some((pid) =>
        coupon.applicableProductIds!.includes(pid)
      );

      if (!hasApplicableProduct) {
        return { valid: false, error: "This coupon is not valid for the selected products" };
      }
    }

    // Calculate discount
    let discountAmountCents = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discountAmountCents = Math.round((args.orderTotalCents * coupon.discountValue) / 100);
      // Apply max discount cap if set
      if (coupon.maxDiscountAmount) {
        discountAmountCents = Math.min(discountAmountCents, coupon.maxDiscountAmount);
      }
    } else {
      discountAmountCents = coupon.discountValue;
    }

    // Discount cannot exceed order total
    discountAmountCents = Math.min(discountAmountCents, args.orderTotalCents);

    return {
      valid: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmountCents,
      },
    };
  },
});

// Create a new coupon (vendor owner only)
export const create = mutation({
  args: {
    vendorId: v.id("vendors"),
    code: v.string(),
    description: v.optional(v.string()),
    discountType: v.union(v.literal("PERCENTAGE"), v.literal("FIXED_AMOUNT")),
    discountValue: v.number(),
    minPurchaseAmount: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    maxUsesPerCustomer: v.optional(v.number()),
    applicableProductIds: v.optional(v.array(v.id("products"))),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify user owns this vendor
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || vendor.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    const codeUpper = args.code.toUpperCase().trim();

    // Check if code already exists for this vendor
    const existing = await ctx.db
      .query("vendorCoupons")
      .withIndex("by_vendor_code", (q) =>
        q.eq("vendorId", args.vendorId).eq("code", codeUpper)
      )
      .first();

    if (existing) {
      throw new Error("This coupon code already exists");
    }

    // Validate discount value
    if (args.discountType === "PERCENTAGE" && (args.discountValue <= 0 || args.discountValue > 100)) {
      throw new Error("Percentage discount must be between 1 and 100");
    }

    if (args.discountType === "FIXED_AMOUNT" && args.discountValue <= 0) {
      throw new Error("Fixed amount discount must be greater than 0");
    }

    const now = Date.now();

    return await ctx.db.insert("vendorCoupons", {
      vendorId: args.vendorId,
      code: codeUpper,
      description: args.description,
      discountType: args.discountType,
      discountValue: args.discountValue,
      minPurchaseAmount: args.minPurchaseAmount,
      maxDiscountAmount: args.maxDiscountAmount,
      maxUses: args.maxUses,
      maxUsesPerCustomer: args.maxUsesPerCustomer,
      usedCount: 0,
      applicableProductIds: args.applicableProductIds,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a coupon (vendor owner only)
export const update = mutation({
  args: {
    couponId: v.id("vendorCoupons"),
    description: v.optional(v.string()),
    maxUses: v.optional(v.number()),
    maxUsesPerCustomer: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    // Verify user owns this vendor
    const vendor = await ctx.db.get(coupon.vendorId);
    if (!vendor || vendor.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.couponId, {
      ...(args.description !== undefined && { description: args.description }),
      ...(args.maxUses !== undefined && { maxUses: args.maxUses }),
      ...(args.maxUsesPerCustomer !== undefined && { maxUsesPerCustomer: args.maxUsesPerCustomer }),
      ...(args.validUntil !== undefined && { validUntil: args.validUntil }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete a coupon (vendor owner only, only if never used)
export const remove = mutation({
  args: {
    couponId: v.id("vendorCoupons"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    // Verify user owns this vendor
    const vendor = await ctx.db.get(coupon.vendorId);
    if (!vendor || vendor.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    // Can only delete unused coupons
    if (coupon.usedCount > 0) {
      throw new Error("Cannot delete a coupon that has been used. Deactivate it instead.");
    }

    await ctx.db.delete(args.couponId);

    return { success: true };
  },
});

// Record coupon usage (called during checkout)
export const recordUsage = mutation({
  args: {
    couponId: v.id("vendorCoupons"),
    orderId: v.id("productOrders"),
    userId: v.id("users"),
    userEmail: v.string(),
    discountAmountCents: v.number(),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    // Update usage count
    await ctx.db.patch(args.couponId, {
      usedCount: coupon.usedCount + 1,
      updatedAt: Date.now(),
    });

    // Record usage
    await ctx.db.insert("vendorCouponUsage", {
      couponId: args.couponId,
      vendorId: coupon.vendorId,
      orderId: args.orderId,
      userId: args.userId,
      userEmail: args.userEmail,
      discountAmountCents: args.discountAmountCents,
      usedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get coupon statistics (vendor owner only)
export const getStats = query({
  args: {
    couponId: v.id("vendorCoupons"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    // Verify user owns this vendor
    const vendor = await ctx.db.get(coupon.vendorId);
    if (!vendor || vendor.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    const usageRecords = await ctx.db
      .query("vendorCouponUsage")
      .withIndex("by_coupon", (q) => q.eq("couponId", args.couponId))
      .collect();

    const totalDiscountGiven = usageRecords.reduce(
      (sum, record) => sum + record.discountAmountCents,
      0
    );

    return {
      usedCount: coupon.usedCount,
      maxUses: coupon.maxUses,
      totalDiscountGiven,
      recentUsage: usageRecords.slice(-10).reverse(),
    };
  },
});
