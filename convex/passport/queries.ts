import { query } from "../_generated/server";
import { v } from "convex/values";

// Get user's event passport
export const getPassport = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return null;

    const passport = await ctx.db
      .query("userEventPassport")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!passport) {
      // Return empty passport for new users
      return {
        eventsAttended: 0,
        uniqueCities: [] as string[],
        uniqueStates: [] as string[],
        achievements: [] as string[],
        unlockedAchievements: [],
        firstEventDate: null as number | null,
        lastEventDate: null as number | null,
        userName: user.name,
        userImage: user.image,
      };
    }

    // Get full achievement details
    const unlockedAchievements = await Promise.all(
      passport.achievements.map(async (code) => {
        const achievement = await ctx.db
          .query("achievements")
          .withIndex("by_code", (q) => q.eq("code", code))
          .unique();
        return achievement;
      })
    );

    return {
      eventsAttended: passport.eventsAttended,
      uniqueCities: passport.uniqueCities,
      uniqueStates: passport.uniqueStates,
      achievements: passport.achievements,
      unlockedAchievements: unlockedAchievements.filter(Boolean),
      firstEventDate: passport.firstEventDate ?? null,
      lastEventDate: passport.lastEventDate ?? null,
      userName: user.name,
      userImage: user.image,
    };
  },
});

// Get public passport by user ID (for viewing other profiles)
export const getPublicPassport = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const passport = await ctx.db
      .query("userEventPassport")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!passport) {
      return {
        eventsAttended: 0,
        uniqueCities: [] as string[],
        uniqueStates: [] as string[],
        achievements: [] as string[],
        unlockedAchievements: [],
        firstEventDate: null as number | null,
        lastEventDate: null as number | null,
        userName: user.name,
        userImage: user.image,
      };
    }

    // Get full achievement details
    const unlockedAchievements = await Promise.all(
      passport.achievements.map(async (code) => {
        const achievement = await ctx.db
          .query("achievements")
          .withIndex("by_code", (q) => q.eq("code", code))
          .unique();
        return achievement;
      })
    );

    return {
      eventsAttended: passport.eventsAttended,
      uniqueCities: passport.uniqueCities,
      uniqueStates: passport.uniqueStates,
      achievements: passport.achievements,
      unlockedAchievements: unlockedAchievements.filter(Boolean),
      firstEventDate: passport.firstEventDate ?? null,
      lastEventDate: passport.lastEventDate ?? null,
      userName: user.name,
      userImage: user.image,
    };
  },
});

// Get all achievements (for displaying what's available)
export const getAllAchievements = query({
  args: {},
  handler: async (ctx) => {
    const achievements = await ctx.db.query("achievements").collect();
    return achievements.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Get achievements by category
export const getAchievementsByCategory = query({
  args: {
    category: v.union(
      v.literal("attendance"),
      v.literal("explorer"),
      v.literal("specialist"),
      v.literal("social"),
      v.literal("milestone")
    ),
  },
  handler: async (ctx, { category }) => {
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
    return achievements.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Get user's event attendance history
export const getAttendanceHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return [];

    let query = ctx.db
      .query("eventAttendance")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    const attendance = limit ? await query.take(limit) : await query.collect();

    // Add event details
    const attendanceWithDetails = await Promise.all(
      attendance.map(async (record) => {
        const event = await ctx.db.get(record.eventId);
        return {
          ...record,
          eventName: record.eventName || event?.name,
          eventDate: event?.startDate,
          eventImage: event?.imageUrl,
        };
      })
    );

    return attendanceWithDetails;
  },
});

// Get leaderboard (top steppers by events attended)
export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const passports = await ctx.db
      .query("userEventPassport")
      .withIndex("by_events_attended")
      .order("desc")
      .take(limit);

    // Get user details for each passport
    const leaderboard = await Promise.all(
      passports.map(async (passport, index) => {
        const user = await ctx.db.get(passport.userId);
        return {
          rank: index + 1,
          userId: passport.userId,
          userName: user?.name || "Anonymous",
          userImage: user?.image,
          eventsAttended: passport.eventsAttended,
          citiesVisited: passport.uniqueCities.length,
          statesVisited: passport.uniqueStates.length,
          achievementCount: passport.achievements.length,
        };
      })
    );

    return leaderboard;
  },
});

// Check if user has already checked in to an event
export const hasCheckedIn = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return false;

    const attendance = await ctx.db
      .query("eventAttendance")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", eventId)
      )
      .unique();

    return !!attendance;
  },
});
