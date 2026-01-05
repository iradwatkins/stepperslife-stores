import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// ========================================
// SERVICE PROVIDER ANALYTICS - Queries
// ========================================

/**
 * Get analytics dashboard data for the current service provider
 */
export const getDashboardAnalytics = query({
  args: {
    dateRange: v.optional(v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("all")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return null;

    // Get provider
    const provider = await ctx.db
      .query("serviceProviders")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();

    if (!provider) return null;

    // Calculate date range
    const now = Date.now();
    const rangeMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      "all": now, // All time
    };
    const range = args.dateRange || "30d";
    const startDate = now - rangeMs[range];

    // Get views in date range
    const allViews = await ctx.db
      .query("serviceViews")
      .withIndex("by_provider_date", (q) => q.eq("serviceProviderId", provider._id))
      .collect();

    const views = allViews.filter((v) => v.createdAt >= startDate);
    const previousViews = allViews.filter(
      (v) => v.createdAt >= startDate - rangeMs[range] && v.createdAt < startDate
    );

    // Get inquiries in date range
    const allInquiries = await ctx.db
      .query("serviceInquiries")
      .withIndex("by_provider", (q) => q.eq("serviceProviderId", provider._id))
      .collect();

    const inquiries = allInquiries.filter((i) => i.createdAt >= startDate);
    const previousInquiries = allInquiries.filter(
      (i) => i.createdAt >= startDate - rangeMs[range] && i.createdAt < startDate
    );

    // Get favorites count
    const favorites = await ctx.db
      .query("serviceProviderFavorites")
      .withIndex("by_provider", (q) => q.eq("serviceProviderId", provider._id))
      .collect();

    // Get reviews
    const reviews = await ctx.db
      .query("serviceReviews")
      .withIndex("by_provider", (q) =>
        q.eq("serviceProviderId", provider._id).eq("status", "APPROVED")
      )
      .collect();

    const recentReviews = reviews.filter((r) => r.createdAt >= startDate);

    // Calculate inquiry breakdown by type
    const inquiryByType = {
      phone_click: inquiries.filter((i) => i.type === "phone_click").length,
      email_click: inquiries.filter((i) => i.type === "email_click").length,
      website_click: inquiries.filter((i) => i.type === "website_click").length,
      contact_form: inquiries.filter((i) => i.type === "contact_form").length,
      booking_request: inquiries.filter((i) => i.type === "booking_request").length,
    };

    // Calculate view sources
    const viewSources = {
      search: views.filter((v) => v.source === "search").length,
      category: views.filter((v) => v.source === "category").length,
      direct: views.filter((v) => v.source === "direct").length,
      referral: views.filter((v) => v.source === "referral").length,
      other: views.filter((v) => !v.source || !["search", "category", "direct", "referral"].includes(v.source)).length,
    };

    // Calculate trends (daily data for chart)
    const dailyData = generateDailyData(views, inquiries, range, now);

    // Calculate percentage changes
    const viewsChange = calculatePercentChange(views.length, previousViews.length);
    const inquiriesChange = calculatePercentChange(inquiries.length, previousInquiries.length);

    return {
      provider: {
        id: provider._id,
        name: provider.name,
        businessName: provider.businessName,
        averageRating: provider.averageRating || 0,
        totalReviews: provider.totalReviews || 0,
        tier: provider.tier || "BASIC",
      },
      metrics: {
        totalViews: views.length,
        viewsChange,
        totalInquiries: inquiries.length,
        inquiriesChange,
        totalFavorites: favorites.length,
        totalReviews: reviews.length,
        recentReviewsCount: recentReviews.length,
        conversionRate: views.length > 0
          ? ((inquiries.length / views.length) * 100).toFixed(1)
          : "0.0",
      },
      inquiryByType,
      viewSources,
      dailyData,
      dateRange: range,
    };
  },
});

/**
 * Get recent activity (views and inquiries)
 */
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    const provider = await ctx.db
      .query("serviceProviders")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();

    if (!provider) return [];

    const limit = args.limit || 20;

    // Get recent inquiries
    const inquiries = await ctx.db
      .query("serviceInquiries")
      .withIndex("by_provider", (q) => q.eq("serviceProviderId", provider._id))
      .order("desc")
      .take(limit);

    // Format as activity items
    return inquiries.map((inq) => ({
      id: inq._id,
      type: inq.type,
      message: inq.message,
      status: inq.status,
      createdAt: inq.createdAt,
    }));
  },
});

// ========================================
// SERVICE PROVIDER ANALYTICS - Mutations
// ========================================

/**
 * Track a profile view
 */
export const trackView = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    source: v.optional(v.string()),
    referrer: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();

      // Don't track owner's own views
      const provider = await ctx.db.get(args.providerId);
      if (provider && user && provider.ownerId === user._id) {
        return null;
      }

      userId = user?._id;
    }

    await ctx.db.insert("serviceViews", {
      serviceProviderId: args.providerId,
      userId,
      sessionId: args.sessionId,
      source: args.source,
      referrer: args.referrer,
      createdAt: Date.now(),
    });
  },
});

/**
 * Track an inquiry/contact click
 */
export const trackInquiry = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    type: v.union(
      v.literal("phone_click"),
      v.literal("email_click"),
      v.literal("website_click"),
      v.literal("contact_form"),
      v.literal("booking_request")
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();
      userId = user?._id;
    }

    await ctx.db.insert("serviceInquiries", {
      serviceProviderId: args.providerId,
      userId,
      type: args.type,
      message: args.message,
      status: args.type === "contact_form" || args.type === "booking_request"
        ? "pending"
        : undefined,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update inquiry status (for contact forms/booking requests)
 */
export const updateInquiryStatus = mutation({
  args: {
    inquiryId: v.id("serviceInquiries"),
    status: v.union(
      v.literal("pending"),
      v.literal("responded"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) {
      throw new Error("Inquiry not found");
    }

    // Verify ownership
    const provider = await ctx.db.get(inquiry.serviceProviderId);
    if (!provider || provider.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.inquiryId, {
      status: args.status,
    });
  },
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function generateDailyData(
  views: { createdAt: number }[],
  inquiries: { createdAt: number }[],
  range: string,
  now: number
): { date: string; views: number; inquiries: number }[] {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
  const dayMs = 24 * 60 * 60 * 1000;
  const data: { date: string; views: number; inquiries: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - (i + 1) * dayMs;
    const dayEnd = now - i * dayMs;

    const dayViews = views.filter(
      (v) => v.createdAt >= dayStart && v.createdAt < dayEnd
    ).length;

    const dayInquiries = inquiries.filter(
      (inq) => inq.createdAt >= dayStart && inq.createdAt < dayEnd
    ).length;

    const date = new Date(dayStart);
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      views: dayViews,
      inquiries: dayInquiries,
    });
  }

  return data;
}
