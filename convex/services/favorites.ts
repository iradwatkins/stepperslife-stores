import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Get all favorites for the current user
export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user) {
      return [];
    }

    // Get all favorites for this user
    const favorites = await ctx.db
      .query("serviceProviderFavorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get the provider details for each favorite
    const providersWithDetails = await Promise.all(
      favorites.map(async (fav) => {
        const provider = await ctx.db.get(fav.serviceProviderId);
        if (!provider || provider.status !== "APPROVED" || !provider.isActive) {
          return null;
        }
        return {
          ...provider,
          favoriteId: fav._id,
          favoritedAt: fav.createdAt,
        };
      })
    );

    // Filter out null values and sort by favorited date (newest first)
    return providersWithDetails
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => b.favoritedAt - a.favoritedAt);
  },
});

// Check if a provider is favorited by the current user
export const isFavorited = query({
  args: {
    serviceProviderId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user) {
      return false;
    }

    const favorite = await ctx.db
      .query("serviceProviderFavorites")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("serviceProviderId", args.serviceProviderId)
      )
      .unique();

    return favorite !== null;
  },
});

// Toggle favorite status for a provider
export const toggle = mutation({
  args: {
    serviceProviderId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if provider exists
    const provider = await ctx.db.get(args.serviceProviderId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Check if already favorited
    const existingFavorite = await ctx.db
      .query("serviceProviderFavorites")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("serviceProviderId", args.serviceProviderId)
      )
      .unique();

    if (existingFavorite) {
      // Remove favorite
      await ctx.db.delete(existingFavorite._id);
      return { action: "removed", isFavorited: false };
    } else {
      // Add favorite
      await ctx.db.insert("serviceProviderFavorites", {
        userId: user._id,
        serviceProviderId: args.serviceProviderId,
        createdAt: Date.now(),
      });
      return { action: "added", isFavorited: true };
    }
  },
});

// Get favorite count for a provider
export const getCount = query({
  args: {
    serviceProviderId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("serviceProviderFavorites")
      .withIndex("by_provider", (q) => q.eq("serviceProviderId", args.serviceProviderId))
      .collect();

    return favorites.length;
  },
});
