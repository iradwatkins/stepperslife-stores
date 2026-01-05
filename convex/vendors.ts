import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, requireAdmin } from "./lib/auth";
import {
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_VENDOR_TIER,
  TIER_COMMISSION_RATES,
  TIER_SORT_ORDER,
  type VendorTier,
} from "./lib/vendorTiers";

// Get all active/approved vendors (for marketplace display)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get all approved vendors (isActive may be false if suspended)
export const getApproved = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();
  },
});

// Get approved vendors with product counts (for marketplace display)
// Sorted by tier: PREMIUM first, then VERIFIED, then BASIC
export const getApprovedVendors = query({
  args: {},
  handler: async (ctx) => {
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Enrich with product counts and tier info
    const enrichedVendors = await Promise.all(
      vendors.map(async (vendor) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
          .filter((q) => q.eq(q.field("status"), "ACTIVE"))
          .collect();

        const tier = (vendor.tier || "BASIC") as VendorTier;

        return {
          _id: vendor._id,
          storeName: vendor.name,
          slug: vendor.slug,
          description: vendor.description,
          logo: vendor.logoUrl,
          banner: vendor.bannerUrl,
          city: vendor.city,
          state: vendor.state,
          categories: vendor.categories,
          productCount: products.length,
          tier, // Include tier for badge display
        };
      })
    );

    // Sort by tier: PREMIUM (0) first, then VERIFIED (1), then BASIC (2)
    return enrichedVendors.sort((a, b) => {
      const orderA = TIER_SORT_ORDER[a.tier] ?? 2;
      const orderB = TIER_SORT_ORDER[b.tier] ?? 2;
      return orderA - orderB;
    });
  },
});

// Get vendor by slug (for storefront page)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get vendor by owner (for vendor dashboard)
export const getByOwner = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
  },
});

// Get vendor by ID
export const getById = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vendorId);
  },
});

// Get pending vendor applications (for admin)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();
  },
});

// Get all vendors (for admin - includes all statuses)
export const getAllAdmin = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("APPROVED"),
        v.literal("SUSPENDED"),
        v.literal("REJECTED")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("vendors")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("vendors").collect();
  },
});

// Apply to become a vendor (creates pending vendor application)
// NOTE: ownerId is derived from auth context, not from args (security)
export const apply = mutation({
  args: {
    // REMOVED: ownerId - now derived from auth context for security
    name: v.string(),
    description: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    businessType: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    categories: v.array(v.string()),
    website: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from context
    const user = await getCurrentUser(ctx);

    // ADMIN RESTRICTION: Admins cannot apply for vendor accounts as themselves
    // Admin role is for management only - admins cannot BE vendors
    // Use createVendorOnBehalfOf to create vendor for a specific user
    if (user.role === "admin") {
      throw new Error(
        "Admins cannot apply for vendor accounts. " +
        "Use the admin create flow (createVendorOnBehalfOf) to create a vendor for a specific user."
      );
    }

    const now = Date.now();

    // Generate slug from name
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for existing slug and make unique if needed
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await ctx.db
        .query("vendors")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Check if user already has a vendor application
    const existingVendor = await ctx.db
      .query("vendors")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();

    if (existingVendor) {
      throw new Error("You already have a vendor application or store");
    }

    return await ctx.db.insert("vendors", {
      ownerId: user._id,
      name: args.name,
      slug,
      description: args.description,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      businessType: args.businessType,
      address: args.address,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      categories: args.categories,
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
      tier: DEFAULT_VENDOR_TIER,
      website: args.website,
      additionalNotes: args.additionalNotes,
      status: "APPROVED", // Auto-approve vendors immediately
      isActive: true,
      reviewedAt: now, // Mark as reviewed immediately
      totalProducts: 0,
      totalSales: 0,
      totalEarnings: 0,
      totalPaidOut: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create vendor on behalf of another user (admin only)
// This allows admins to create vendor accounts for users without becoming the owner
export const createVendorOnBehalfOf = mutation({
  args: {
    ownerId: v.id("users"), // REQUIRED - the actual owner (NOT the admin)
    name: v.string(),
    description: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    businessType: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    categories: v.array(v.string()),
    website: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only admins can create vendors on behalf of others
    await requireAdmin(ctx);

    // Verify the owner exists
    const owner = await ctx.db.get(args.ownerId);
    if (!owner) {
      throw new Error("Specified owner not found");
    }

    // Verify the owner is not an admin (admins cannot be vendors)
    if (owner.role === "admin") {
      throw new Error("Cannot create vendor for an admin user. Admin accounts cannot be vendors.");
    }

    const now = Date.now();

    // Generate slug from name
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for existing slug and make unique if needed
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await ctx.db
        .query("vendors")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Check if owner already has a vendor application
    const existingVendor = await ctx.db
      .query("vendors")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (existingVendor) {
      throw new Error("This user already has a vendor application or store");
    }

    return await ctx.db.insert("vendors", {
      ownerId: args.ownerId, // Use the specified owner, NOT the admin
      name: args.name,
      slug,
      description: args.description,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      businessType: args.businessType,
      address: args.address,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      categories: args.categories,
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
      tier: DEFAULT_VENDOR_TIER,
      website: args.website,
      additionalNotes: args.additionalNotes,
      status: "APPROVED", // Auto-approve when admin creates
      isActive: true,
      reviewedAt: now,
      totalProducts: 0,
      totalSales: 0,
      totalEarnings: 0,
      totalPaidOut: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Approve vendor application (admin only)
// Note: New vendors are auto-approved, but this is kept for existing PENDING vendors
export const approve = mutation({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    if (vendor.status !== "PENDING") {
      throw new Error("Vendor is not pending approval");
    }

    const now = Date.now();
    return await ctx.db.patch(args.vendorId, {
      status: "APPROVED",
      isActive: true,
      tier: vendor.tier ?? DEFAULT_VENDOR_TIER, // Set tier if not already set
      reviewedAt: now,
      commissionPercent: vendor.commissionPercent ?? DEFAULT_COMMISSION_PERCENT,
      updatedAt: now,
    });
  },
});

// Reject vendor application (admin only)
export const reject = mutation({
  args: {
    vendorId: v.id("vendors"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    if (vendor.status !== "PENDING") {
      throw new Error("Vendor is not pending approval");
    }

    const now = Date.now();
    return await ctx.db.patch(args.vendorId, {
      status: "REJECTED",
      isActive: false,
      rejectionReason: args.reason,
      updatedAt: now,
    });
  },
});

// Suspend vendor (admin only)
export const suspend = mutation({
  args: {
    vendorId: v.id("vendors"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    if (vendor.status !== "APPROVED") {
      throw new Error("Can only suspend approved vendors");
    }

    const now = Date.now();
    return await ctx.db.patch(args.vendorId, {
      status: "SUSPENDED",
      isActive: false,
      reviewedAt: now,
      rejectionReason: args.reason,
      updatedAt: now,
    });
  },
});

// Reactivate suspended or rejected vendor (admin only)
export const reactivate = mutation({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    if (vendor.status !== "SUSPENDED" && vendor.status !== "REJECTED") {
      throw new Error("Can only reactivate suspended or rejected vendors");
    }

    const now = Date.now();
    return await ctx.db.patch(args.vendorId, {
      status: "APPROVED",
      isActive: true,
      tier: vendor.tier ?? DEFAULT_VENDOR_TIER, // Set tier if not already set
      reviewedAt: now,
      rejectionReason: undefined,
      updatedAt: now,
    });
  },
});

// Update vendor profile (vendor can update own profile)
export const update = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    businessType: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { vendorId, ...updates } = args;

    const vendor = await ctx.db.get(vendorId);
    if (!vendor) throw new Error("Vendor not found");

    // If name is being changed, update slug
    let slug = vendor.slug;
    if (updates.name && updates.name !== vendor.name) {
      const baseSlug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await ctx.db
          .query("vendors")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (!existing || existing._id === vendorId) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    return await ctx.db.patch(vendorId, {
      ...updates,
      slug,
      updatedAt: Date.now(),
    });
  },
});

// Update vendor commission rate (admin only)
export const updateCommission = mutation({
  args: {
    vendorId: v.id("vendors"),
    commissionPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    if (args.commissionPercent < 0 || args.commissionPercent > 100) {
      throw new Error("Commission must be between 0 and 100");
    }

    return await ctx.db.patch(args.vendorId, {
      commissionPercent: args.commissionPercent,
      updatedAt: Date.now(),
    });
  },
});

// Update vendor tier (admin only)
// Automatically updates commission rate based on tier
export const updateTier = mutation({
  args: {
    vendorId: v.id("vendors"),
    tier: v.union(v.literal("BASIC"), v.literal("VERIFIED"), v.literal("PREMIUM")),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    // Only allow tier changes for approved vendors
    if (vendor.status !== "APPROVED") {
      throw new Error("Can only change tier for approved vendors");
    }

    // Get commission rate for the new tier
    const newCommissionRate = TIER_COMMISSION_RATES[args.tier as VendorTier];

    return await ctx.db.patch(args.vendorId, {
      tier: args.tier,
      commissionPercent: newCommissionRate,
      updatedAt: Date.now(),
    });
  },
});

// Update vendor stats (internal use when orders are placed)
export const updateStats = mutation({
  args: {
    id: v.id("vendors"),
    saleAmount: v.number(), // Amount to add to totalSales
    earningsAmount: v.number(), // Amount to add to totalEarnings
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.id);
    if (!vendor) throw new Error("Vendor not found");

    return await ctx.db.patch(args.id, {
      totalSales: (vendor.totalSales || 0) + args.saleAmount,
      totalEarnings: (vendor.totalEarnings || 0) + args.earningsAmount,
      updatedAt: Date.now(),
    });
  },
});

// Update vendor product count (called when products are added/removed)
export const updateProductCount = mutation({
  args: {
    id: v.id("vendors"),
    delta: v.number(), // +1 or -1
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.id);
    if (!vendor) throw new Error("Vendor not found");

    const newCount = Math.max(0, (vendor.totalProducts || 0) + args.delta);

    return await ctx.db.patch(args.id, {
      totalProducts: newCount,
      updatedAt: Date.now(),
    });
  },
});

// Save Stripe Connect account ID for a vendor
export const saveStripeAccount = mutation({
  args: {
    vendorId: v.id("vendors"),
    stripeConnectedAccountId: v.string(),
    stripeAccountSetupComplete: v.optional(v.boolean()),
    stripeCashAppEnabled: v.optional(v.boolean()),
    stripePayoutsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    return await ctx.db.patch(args.vendorId, {
      stripeConnectedAccountId: args.stripeConnectedAccountId,
      stripeAccountSetupComplete: args.stripeAccountSetupComplete ?? false,
      stripeCashAppEnabled: args.stripeCashAppEnabled ?? false,
      stripePayoutsEnabled: args.stripePayoutsEnabled ?? false,
      updatedAt: Date.now(),
    });
  },
});

// Update Stripe account setup status
export const updateStripeAccountStatus = mutation({
  args: {
    vendorId: v.id("vendors"),
    stripeAccountSetupComplete: v.optional(v.boolean()),
    stripeCashAppEnabled: v.optional(v.boolean()),
    stripePayoutsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.stripeAccountSetupComplete !== undefined) {
      updates.stripeAccountSetupComplete = args.stripeAccountSetupComplete;
    }
    if (args.stripeCashAppEnabled !== undefined) {
      updates.stripeCashAppEnabled = args.stripeCashAppEnabled;
    }
    if (args.stripePayoutsEnabled !== undefined) {
      updates.stripePayoutsEnabled = args.stripePayoutsEnabled;
    }

    return await ctx.db.patch(args.vendorId, updates);
  },
});

// Get Stripe account status for a vendor
export const getStripeAccountStatus = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) return null;

    return {
      hasStripeAccount: !!vendor.stripeConnectedAccountId,
      stripeConnectedAccountId: vendor.stripeConnectedAccountId,
      stripeAccountSetupComplete: vendor.stripeAccountSetupComplete ?? false,
      stripeCashAppEnabled: vendor.stripeCashAppEnabled ?? false,
      stripePayoutsEnabled: vendor.stripePayoutsEnabled ?? false,
    };
  },
});

// Get vendor with Stripe account info for payment processing
export const getVendorForPayment = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) return null;

    return {
      _id: vendor._id,
      name: vendor.name,
      commissionPercent: vendor.commissionPercent,
      tier: vendor.tier,
      stripeConnectedAccountId: vendor.stripeConnectedAccountId,
      stripeAccountSetupComplete: vendor.stripeAccountSetupComplete ?? false,
      canReceivePayments: !!(
        vendor.stripeConnectedAccountId && vendor.stripeAccountSetupComplete
      ),
    };
  },
});
