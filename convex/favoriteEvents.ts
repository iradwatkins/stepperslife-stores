import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";

// Get user's favorite events/classes
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get event details for each favorite
    const favoritesWithEvents = await Promise.all(
      favorites.map(async (favorite) => {
        const event = await ctx.db.get(favorite.eventId);
        return {
          ...favorite,
          event,
        };
      })
    );

    // Filter out any null events (deleted)
    return favoritesWithEvents.filter((f) => f.event !== null);
  },
});

// Get current user's favorite events/classes (using auth)
export const getMyFavorites = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return [];
    }

    const favorites = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get event details for each favorite
    const favoritesWithEvents = await Promise.all(
      favorites.map(async (favorite) => {
        const event = await ctx.db.get(favorite.eventId);
        if (!event) return null;

        // Get image URL if event has storage image
        let imageUrl = event.imageUrl;
        if (!imageUrl && event.images && event.images.length > 0) {
          const url = await ctx.storage.getUrl(event.images[0]);
          if (url) {
            imageUrl = url;
          }
        }

        return {
          ...favorite,
          event: {
            ...event,
            imageUrl,
          },
        };
      })
    );

    // Filter out any null events (deleted)
    return favoritesWithEvents.filter((f) => f !== null);
  },
});

// Check if an event is favorited by user (public check by userId)
export const isFavorited = query({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    return !!favorite;
  },
});

// Check if an event is favorited by current authenticated user
export const isMyFavorite = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return false;
    }

    const favorite = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .first();

    return !!favorite;
  },
});

// Get favorite status for multiple events (batch query for efficiency)
export const getMyFavoriteStatus = query({
  args: {
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      // Return all false if not authenticated
      return Object.fromEntries(args.eventIds.map((id) => [id, false]));
    }

    const favorites = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const favoriteEventIds = new Set(favorites.map((f) => f.eventId));

    return Object.fromEntries(
      args.eventIds.map((id) => [id, favoriteEventIds.has(id)])
    );
  },
});

// Toggle favorite status (userId from auth, not client)
export const toggle = mutation({
  args: {
    eventId: v.id("events"),
    // NOTE: userId is NOT accepted from client - obtained from auth context
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    // Verify the event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if already favorited
    const existing = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .first();

    if (existing) {
      // Remove from favorites
      await ctx.db.delete(existing._id);
      return { action: "removed", isFavorited: false };
    } else {
      // Add to favorites
      await ctx.db.insert("favoriteEvents", {
        userId: user._id,
        eventId: args.eventId,
        createdAt: Date.now(),
      });
      return { action: "added", isFavorited: true };
    }
  },
});

// Add to favorites (userId from auth, not client)
export const add = mutation({
  args: {
    eventId: v.id("events"),
    // NOTE: userId is NOT accepted from client - obtained from auth context
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    // Verify the event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if already favorited
    const existing = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("favoriteEvents", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
    });
  },
});

// Remove from favorites (userId from auth, not client)
export const remove = mutation({
  args: {
    eventId: v.id("events"),
    // NOTE: userId is NOT accepted from client - obtained from auth context
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    const existing = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Get count of favorites for an event
export const getEventFavoriteCount = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favoriteEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return favorites.length;
  },
});
