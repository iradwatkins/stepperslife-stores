import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Record event attendance and update passport
export const recordAttendance = mutation({
  args: {
    eventId: v.id("events"),
    ticketId: v.optional(v.id("tickets")),
  },
  handler: async (ctx, { eventId, ticketId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already checked in
    const existingAttendance = await ctx.db
      .query("eventAttendance")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", eventId)
      )
      .unique();

    if (existingAttendance) {
      return { alreadyCheckedIn: true, passportId: existingAttendance._id };
    }

    // Get event details
    const event = await ctx.db.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Extract location info
    let eventCity: string | undefined;
    let eventState: string | undefined;
    if (event.location && typeof event.location === "object") {
      eventCity = event.location.city;
      eventState = event.location.state;
    }

    // Record attendance
    const attendanceId = await ctx.db.insert("eventAttendance", {
      userId: user._id,
      eventId,
      ticketId,
      checkedInAt: Date.now(),
      eventName: event.name,
      eventCity,
      eventState,
      eventType: event.eventSubType,
    });

    // Update or create passport
    let passport = await ctx.db
      .query("userEventPassport")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();

    if (!passport) {
      // Create new passport
      const passportId = await ctx.db.insert("userEventPassport", {
        userId: user._id,
        eventsAttended: 1,
        uniqueCities: eventCity ? [eventCity] : [],
        uniqueStates: eventState ? [eventState] : [],
        weekendersAttended: event.eventSubType === "weekender" ? 1 : 0,
        setsAttended: event.eventSubType === "set" ? 1 : 0,
        ballsAttended: event.eventSubType === "ball" ? 1 : 0,
        workshopsAttended: event.eventSubType === "workshop" ? 1 : 0,
        achievements: [],
        firstEventDate: now,
        lastEventDate: now,
        createdAt: now,
        updatedAt: now,
      });

      passport = await ctx.db.get(passportId);
    } else {
      // Update existing passport
      const newCities = eventCity && !passport.uniqueCities.includes(eventCity)
        ? [...passport.uniqueCities, eventCity]
        : passport.uniqueCities;
      const newStates = eventState && !passport.uniqueStates.includes(eventState)
        ? [...passport.uniqueStates, eventState]
        : passport.uniqueStates;

      await ctx.db.patch(passport._id, {
        eventsAttended: passport.eventsAttended + 1,
        uniqueCities: newCities,
        uniqueStates: newStates,
        weekendersAttended:
          passport.weekendersAttended + (event.eventSubType === "weekender" ? 1 : 0),
        setsAttended:
          passport.setsAttended + (event.eventSubType === "set" ? 1 : 0),
        ballsAttended:
          passport.ballsAttended + (event.eventSubType === "ball" ? 1 : 0),
        workshopsAttended:
          passport.workshopsAttended + (event.eventSubType === "workshop" ? 1 : 0),
        lastEventDate: now,
        updatedAt: now,
      });

      passport = await ctx.db.get(passport._id);
    }

    // Check for new achievements
    if (passport) {
      await checkAndAwardAchievements(ctx, passport);
    }

    return { alreadyCheckedIn: false, attendanceId };
  },
});

// Helper to check and award achievements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAndAwardAchievements(
  ctx: any,
  passport: {
    _id: unknown;
    eventsAttended: number;
    uniqueCities: string[];
    uniqueStates: string[];
    weekendersAttended: number;
    setsAttended: number;
    ballsAttended: number;
    workshopsAttended: number;
    achievements: string[];
    updatedAt: number;
  }
) {
  const allAchievements = await ctx.db.query("achievements").collect();
  const newAchievements: string[] = [];

  for (const achievement of allAchievements) {
    // Skip if already earned
    if (passport.achievements.includes(achievement.code)) continue;

    let earned = false;
    const { type, count } = achievement.requirement;

    switch (type) {
      case "events_attended":
        earned = passport.eventsAttended >= count;
        break;
      case "cities_visited":
        earned = passport.uniqueCities.length >= count;
        break;
      case "states_visited":
        earned = passport.uniqueStates.length >= count;
        break;
      case "weekenders_attended":
        earned = passport.weekendersAttended >= count;
        break;
      case "sets_attended":
        earned = passport.setsAttended >= count;
        break;
      case "balls_attended":
        earned = passport.ballsAttended >= count;
        break;
      case "workshops_attended":
        earned = passport.workshopsAttended >= count;
        break;
    }

    if (earned) {
      newAchievements.push(achievement.code);
    }
  }

  if (newAchievements.length > 0) {
    await ctx.db.patch(passport._id, {
      achievements: [...passport.achievements, ...newAchievements],
      updatedAt: Date.now(),
    });
  }

  return newAchievements;
}

// Staff check-in (for organizers/staff scanning tickets)
export const staffCheckIn = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    ticketId: v.optional(v.id("tickets")),
  },
  handler: async (ctx, { eventId, userId, ticketId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const staffUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!staffUser) {
      throw new Error("Staff user not found");
    }

    // Verify staff has permission for this event
    const staffRole = await ctx.db
      .query("eventStaff")
      .filter((q) =>
        q.and(
          q.eq(q.field("eventId"), eventId),
          q.eq(q.field("staffUserId"), staffUser._id),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!staffRole && staffUser.role !== "admin") {
      throw new Error("Not authorized to check in attendees for this event");
    }

    // Check if already checked in
    const existingAttendance = await ctx.db
      .query("eventAttendance")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .unique();

    if (existingAttendance) {
      return { alreadyCheckedIn: true };
    }

    // Get event and user details
    const event = await ctx.db.get(eventId);
    const attendee = await ctx.db.get(userId);

    if (!event || !attendee) {
      throw new Error("Event or attendee not found");
    }

    // Extract location info
    let eventCity: string | undefined;
    let eventState: string | undefined;
    if (event.location && typeof event.location === "object") {
      eventCity = event.location.city;
      eventState = event.location.state;
    }

    // Record attendance
    await ctx.db.insert("eventAttendance", {
      userId,
      eventId,
      ticketId,
      checkedInAt: Date.now(),
      checkedInBy: staffUser._id,
      eventName: event.name,
      eventCity,
      eventState,
      eventType: event.eventSubType,
    });

    // Update passport (same logic as recordAttendance)
    let passport = await ctx.db
      .query("userEventPassport")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const now = Date.now();

    if (!passport) {
      await ctx.db.insert("userEventPassport", {
        userId,
        eventsAttended: 1,
        uniqueCities: eventCity ? [eventCity] : [],
        uniqueStates: eventState ? [eventState] : [],
        weekendersAttended: event.eventSubType === "weekender" ? 1 : 0,
        setsAttended: event.eventSubType === "set" ? 1 : 0,
        ballsAttended: event.eventSubType === "ball" ? 1 : 0,
        workshopsAttended: event.eventSubType === "workshop" ? 1 : 0,
        achievements: [],
        firstEventDate: now,
        lastEventDate: now,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const newCities =
        eventCity && !passport.uniqueCities.includes(eventCity)
          ? [...passport.uniqueCities, eventCity]
          : passport.uniqueCities;
      const newStates =
        eventState && !passport.uniqueStates.includes(eventState)
          ? [...passport.uniqueStates, eventState]
          : passport.uniqueStates;

      await ctx.db.patch(passport._id, {
        eventsAttended: passport.eventsAttended + 1,
        uniqueCities: newCities,
        uniqueStates: newStates,
        weekendersAttended:
          passport.weekendersAttended + (event.eventSubType === "weekender" ? 1 : 0),
        setsAttended:
          passport.setsAttended + (event.eventSubType === "set" ? 1 : 0),
        ballsAttended:
          passport.ballsAttended + (event.eventSubType === "ball" ? 1 : 0),
        workshopsAttended:
          passport.workshopsAttended + (event.eventSubType === "workshop" ? 1 : 0),
        lastEventDate: now,
        updatedAt: now,
      });
    }

    return { success: true, attendeeName: attendee.name };
  },
});

// Seed default achievements (admin only)
export const seedAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    const achievements = [
      // Attendance achievements
      {
        code: "first_timer",
        name: "First Timer",
        description: "Attended your first stepping event",
        icon: "🎫",
        category: "attendance" as const,
        requirement: { type: "events_attended" as const, count: 1 },
        tier: "bronze" as const,
        sortOrder: 1,
      },
      {
        code: "regular",
        name: "Regular",
        description: "Attended 5 events",
        icon: "⭐",
        category: "attendance" as const,
        requirement: { type: "events_attended" as const, count: 5 },
        tier: "bronze" as const,
        sortOrder: 2,
      },
      {
        code: "dedicated",
        name: "Dedicated Stepper",
        description: "Attended 25 events",
        icon: "🌟",
        category: "attendance" as const,
        requirement: { type: "events_attended" as const, count: 25 },
        tier: "silver" as const,
        sortOrder: 3,
      },
      {
        code: "century_club",
        name: "Century Club",
        description: "Attended 100 events",
        icon: "💯",
        category: "attendance" as const,
        requirement: { type: "events_attended" as const, count: 100 },
        tier: "gold" as const,
        sortOrder: 4,
      },
      // Explorer achievements
      {
        code: "explorer",
        name: "Explorer",
        description: "Stepped in 3 different cities",
        icon: "🗺️",
        category: "explorer" as const,
        requirement: { type: "cities_visited" as const, count: 3 },
        tier: "bronze" as const,
        sortOrder: 10,
      },
      {
        code: "road_warrior",
        name: "Road Warrior",
        description: "Stepped in 10 different cities",
        icon: "🚗",
        category: "explorer" as const,
        requirement: { type: "cities_visited" as const, count: 10 },
        tier: "silver" as const,
        sortOrder: 11,
      },
      {
        code: "state_hopper",
        name: "State Hopper",
        description: "Stepped in 5 different states",
        icon: "🌎",
        category: "explorer" as const,
        requirement: { type: "states_visited" as const, count: 5 },
        tier: "silver" as const,
        sortOrder: 12,
      },
      {
        code: "coast_to_coast",
        name: "Coast to Coast",
        description: "Stepped in 10 different states",
        icon: "✈️",
        category: "explorer" as const,
        requirement: { type: "states_visited" as const, count: 10 },
        tier: "gold" as const,
        sortOrder: 13,
      },
      // Specialist achievements
      {
        code: "weekender_warrior",
        name: "Weekender Warrior",
        description: "Attended 5 weekender events",
        icon: "🎭",
        category: "specialist" as const,
        requirement: { type: "weekenders_attended" as const, count: 5 },
        tier: "silver" as const,
        sortOrder: 20,
      },
      {
        code: "set_regular",
        name: "Set Regular",
        description: "Attended 10 sets",
        icon: "🌙",
        category: "specialist" as const,
        requirement: { type: "sets_attended" as const, count: 10 },
        tier: "bronze" as const,
        sortOrder: 21,
      },
      {
        code: "ball_enthusiast",
        name: "Ball Enthusiast",
        description: "Attended 3 balls",
        icon: "🏆",
        category: "specialist" as const,
        requirement: { type: "balls_attended" as const, count: 3 },
        tier: "silver" as const,
        sortOrder: 22,
      },
      {
        code: "student_of_the_dance",
        name: "Student of the Dance",
        description: "Attended 10 workshops",
        icon: "📚",
        category: "specialist" as const,
        requirement: { type: "workshops_attended" as const, count: 10 },
        tier: "silver" as const,
        sortOrder: 23,
      },
    ];

    const now = Date.now();
    let created = 0;

    for (const achievement of achievements) {
      // Check if already exists
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_code", (q) => q.eq("code", achievement.code))
        .unique();

      if (!existing) {
        await ctx.db.insert("achievements", {
          ...achievement,
          createdAt: now,
        });
        created++;
      }
    }

    return { created, total: achievements.length };
  },
});
