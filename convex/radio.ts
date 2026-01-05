import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ========================================
// DJ PROFILES - Queries
// ========================================

// Get all active, verified DJs
export const getActiveDJs = query({
  args: {
    genre: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const djs = await ctx.db
      .query("djProfiles")
      .withIndex("by_verified", (q) => q.eq("verified", true).eq("isActive", true))
      .collect();

    let filtered = djs;

    if (args.genre) {
      filtered = djs.filter((dj) =>
        dj.genres.some((g) => g.toLowerCase().includes(args.genre!.toLowerCase()))
      );
    }

    // Sort by featured first, then by rating
    filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.averageRating || 0) - (a.averageRating || 0);
    });

    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

// Get featured DJs for homepage
export const getFeaturedDJs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const djs = await ctx.db
      .query("djProfiles")
      .withIndex("by_featured", (q) => q.eq("featured", true).eq("isActive", true))
      .collect();

    return djs.slice(0, args.limit || 6);
  },
});

// Get all active DJs (including non-verified for browse page)
export const getAllDJs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const djs = await ctx.db.query("djProfiles").collect();

    const active = djs.filter((dj) => dj.isActive);

    // Sort: featured first, then verified, then by rating
    active.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      return (b.averageRating || 0) - (a.averageRating || 0);
    });

    if (args.limit) {
      return active.slice(0, args.limit);
    }

    return active;
  },
});

// Get DJ by slug
export const getDJBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const dj = await ctx.db
      .query("djProfiles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!dj || !dj.isActive) {
      return null;
    }

    return dj;
  },
});

// Get my DJ profile
export const getMyDJProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("djProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

// ========================================
// RADIO TOP 10 - Queries
// ========================================

// Get current week's Top 10
export const getCurrentTop10 = query({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db
      .query("radioTop10")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Sort by rank
    return songs.sort((a, b) => a.rank - b.rank).slice(0, 10);
  },
});

// Get Top 10 for a specific week
export const getTop10ByWeek = query({
  args: {
    weekOf: v.string(),
  },
  handler: async (ctx, args) => {
    const songs = await ctx.db
      .query("radioTop10")
      .withIndex("by_week", (q) => q.eq("weekOf", args.weekOf))
      .collect();

    return songs.sort((a, b) => a.rank - b.rank);
  },
});

// ========================================
// DJ PROFILES - Mutations
// ========================================

// Create DJ profile
export const createDJProfile = mutation({
  args: {
    stageName: v.string(),
    bio: v.optional(v.string()),
    genres: v.array(v.string()),
    soundcloudUrl: v.optional(v.string()),
    mixcloudUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    appleMusicUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    bookingEmail: v.optional(v.string()),
    bookingPhone: v.optional(v.string()),
    acceptsWeddings: v.optional(v.boolean()),
    acceptsCorporate: v.optional(v.boolean()),
    acceptsClubs: v.optional(v.boolean()),
    acceptsPrivateParties: v.optional(v.boolean()),
    serviceProviderId: v.optional(v.id("serviceProviders")),
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

    // Check if user already has a DJ profile
    const existing = await ctx.db
      .query("djProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      throw new Error("You already have a DJ profile");
    }

    // Generate slug
    const baseSlug = args.stageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await ctx.db
        .query("djProfiles")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existingSlug) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const now = Date.now();

    const djId = await ctx.db.insert("djProfiles", {
      userId: user._id,
      serviceProviderId: args.serviceProviderId,
      stageName: args.stageName,
      slug,
      bio: args.bio,
      genres: args.genres,
      soundcloudUrl: args.soundcloudUrl,
      mixcloudUrl: args.mixcloudUrl,
      spotifyUrl: args.spotifyUrl,
      appleMusicUrl: args.appleMusicUrl,
      youtubeUrl: args.youtubeUrl,
      instagramUrl: args.instagramUrl,
      tiktokUrl: args.tiktokUrl,
      facebookUrl: args.facebookUrl,
      websiteUrl: args.websiteUrl,
      bookingEmail: args.bookingEmail,
      bookingPhone: args.bookingPhone,
      acceptsWeddings: args.acceptsWeddings,
      acceptsCorporate: args.acceptsCorporate,
      acceptsClubs: args.acceptsClubs,
      acceptsPrivateParties: args.acceptsPrivateParties,
      verified: false,
      featured: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return djId;
  },
});

// Update DJ profile
export const updateDJProfile = mutation({
  args: {
    id: v.id("djProfiles"),
    stageName: v.optional(v.string()),
    bio: v.optional(v.string()),
    genres: v.optional(v.array(v.string())),
    photoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    soundcloudUrl: v.optional(v.string()),
    mixcloudUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    appleMusicUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    bookingEmail: v.optional(v.string()),
    bookingPhone: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    minimumBookingHours: v.optional(v.number()),
    acceptsWeddings: v.optional(v.boolean()),
    acceptsCorporate: v.optional(v.boolean()),
    acceptsClubs: v.optional(v.boolean()),
    acceptsPrivateParties: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const dj = await ctx.db.get(args.id);
    if (!dj) {
      throw new Error("DJ profile not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || dj.userId !== user._id) {
      throw new Error("Not authorized to update this profile");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// ========================================
// RADIO TOP 10 - Mutations (Admin only)
// ========================================

// Add song to Top 10
export const addTop10Song = mutation({
  args: {
    rank: v.number(),
    title: v.string(),
    artist: v.string(),
    embedUrl: v.string(),
    embedType: v.union(
      v.literal("soundcloud"),
      v.literal("spotify"),
      v.literal("mixcloud"),
      v.literal("youtube")
    ),
    coverImageUrl: v.optional(v.string()),
    weekOf: v.string(),
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

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    const now = Date.now();

    return await ctx.db.insert("radioTop10", {
      rank: args.rank,
      title: args.title,
      artist: args.artist,
      embedUrl: args.embedUrl,
      embedType: args.embedType,
      coverImageUrl: args.coverImageUrl,
      weekOf: args.weekOf,
      addedBy: user._id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update song in Top 10
export const updateTop10Song = mutation({
  args: {
    id: v.id("radioTop10"),
    rank: v.number(),
    title: v.string(),
    artist: v.string(),
    embedUrl: v.string(),
    embedType: v.union(
      v.literal("soundcloud"),
      v.literal("spotify"),
      v.literal("mixcloud"),
      v.literal("youtube")
    ),
    coverImageUrl: v.optional(v.string()),
    weekOf: v.string(),
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

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    const song = await ctx.db.get(args.id);
    if (!song) {
      throw new Error("Song not found");
    }

    return await ctx.db.patch(args.id, {
      rank: args.rank,
      title: args.title,
      artist: args.artist,
      embedUrl: args.embedUrl,
      embedType: args.embedType,
      coverImageUrl: args.coverImageUrl,
      weekOf: args.weekOf,
      updatedAt: Date.now(),
    });
  },
});

// Remove song from Top 10
export const removeTop10Song = mutation({
  args: {
    id: v.id("radioTop10"),
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

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    const song = await ctx.db.get(args.id);
    if (!song) {
      throw new Error("Song not found");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
