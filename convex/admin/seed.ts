import { internalMutation } from "../_generated/server";

// Seed initial achievements (no auth required - for fresh database)
export const seedAchievements = internalMutation({
  args: {},
  handler: async (ctx) => {
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

// Seed tax rates for US states
export const seedTaxRates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const taxRates = [
      { state: "AL", stateFullName: "Alabama", rate: 0.04 },
      { state: "AK", stateFullName: "Alaska", rate: 0 },
      { state: "AZ", stateFullName: "Arizona", rate: 0.056 },
      { state: "AR", stateFullName: "Arkansas", rate: 0.065 },
      { state: "CA", stateFullName: "California", rate: 0.0725 },
      { state: "CO", stateFullName: "Colorado", rate: 0.029 },
      { state: "CT", stateFullName: "Connecticut", rate: 0.0635 },
      { state: "DE", stateFullName: "Delaware", rate: 0 },
      { state: "FL", stateFullName: "Florida", rate: 0.06 },
      { state: "GA", stateFullName: "Georgia", rate: 0.04 },
      { state: "HI", stateFullName: "Hawaii", rate: 0.04 },
      { state: "ID", stateFullName: "Idaho", rate: 0.06 },
      { state: "IL", stateFullName: "Illinois", rate: 0.0625 },
      { state: "IN", stateFullName: "Indiana", rate: 0.07 },
      { state: "IA", stateFullName: "Iowa", rate: 0.06 },
      { state: "KS", stateFullName: "Kansas", rate: 0.065 },
      { state: "KY", stateFullName: "Kentucky", rate: 0.06 },
      { state: "LA", stateFullName: "Louisiana", rate: 0.0445 },
      { state: "ME", stateFullName: "Maine", rate: 0.055 },
      { state: "MD", stateFullName: "Maryland", rate: 0.06 },
      { state: "MA", stateFullName: "Massachusetts", rate: 0.0625 },
      { state: "MI", stateFullName: "Michigan", rate: 0.06 },
      { state: "MN", stateFullName: "Minnesota", rate: 0.06875 },
      { state: "MS", stateFullName: "Mississippi", rate: 0.07 },
      { state: "MO", stateFullName: "Missouri", rate: 0.04225 },
      { state: "MT", stateFullName: "Montana", rate: 0 },
      { state: "NE", stateFullName: "Nebraska", rate: 0.055 },
      { state: "NV", stateFullName: "Nevada", rate: 0.0685 },
      { state: "NH", stateFullName: "New Hampshire", rate: 0 },
      { state: "NJ", stateFullName: "New Jersey", rate: 0.06625 },
      { state: "NM", stateFullName: "New Mexico", rate: 0.04875 },
      { state: "NY", stateFullName: "New York", rate: 0.04 },
      { state: "NC", stateFullName: "North Carolina", rate: 0.0475 },
      { state: "ND", stateFullName: "North Dakota", rate: 0.05 },
      { state: "OH", stateFullName: "Ohio", rate: 0.0575 },
      { state: "OK", stateFullName: "Oklahoma", rate: 0.045 },
      { state: "OR", stateFullName: "Oregon", rate: 0 },
      { state: "PA", stateFullName: "Pennsylvania", rate: 0.06 },
      { state: "RI", stateFullName: "Rhode Island", rate: 0.07 },
      { state: "SC", stateFullName: "South Carolina", rate: 0.06 },
      { state: "SD", stateFullName: "South Dakota", rate: 0.042 },
      { state: "TN", stateFullName: "Tennessee", rate: 0.07 },
      { state: "TX", stateFullName: "Texas", rate: 0.0625 },
      { state: "UT", stateFullName: "Utah", rate: 0.061 },
      { state: "VT", stateFullName: "Vermont", rate: 0.06 },
      { state: "VA", stateFullName: "Virginia", rate: 0.053 },
      { state: "WA", stateFullName: "Washington", rate: 0.065 },
      { state: "WV", stateFullName: "West Virginia", rate: 0.06 },
      { state: "WI", stateFullName: "Wisconsin", rate: 0.05 },
      { state: "WY", stateFullName: "Wyoming", rate: 0.04 },
      { state: "DC", stateFullName: "District of Columbia", rate: 0.06 },
    ];

    const now = Date.now();
    let created = 0;

    for (const tax of taxRates) {
      const existing = await ctx.db
        .query("taxRates")
        .withIndex("by_state", (q) => q.eq("state", tax.state))
        .unique();

      if (!existing) {
        await ctx.db.insert("taxRates", {
          state: tax.state,
          stateFullName: tax.stateFullName,
          rate: tax.rate,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, total: taxRates.length };
  },
});

// Seed shipping zones
export const seedShippingZones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const zones = [
      {
        name: "Local",
        states: ["IL", "IN", "WI"],
        standardRate: 599,
        expressRate: 1299,
        standardDays: "3-5 business days",
        expressDays: "1-2 business days",
        freeShippingThreshold: 5000,
        isActive: true,
      },
      {
        name: "Regional",
        states: ["MI", "OH", "MN", "IA", "MO"],
        standardRate: 799,
        expressRate: 1599,
        standardDays: "4-6 business days",
        expressDays: "2-3 business days",
        freeShippingThreshold: 7500,
        isActive: true,
      },
      {
        name: "Extended",
        states: ["TX", "CA", "NY", "FL", "GA"],
        standardRate: 999,
        expressRate: 1999,
        standardDays: "5-7 business days",
        expressDays: "2-3 business days",
        freeShippingThreshold: 10000,
        isActive: true,
      },
      {
        name: "Remote",
        states: ["AK", "HI"],
        standardRate: 1499,
        expressRate: 2999,
        standardDays: "7-10 business days",
        expressDays: "3-5 business days",
        isActive: true,
      },
    ];

    const now = Date.now();
    let created = 0;

    for (const zone of zones) {
      const existing = await ctx.db
        .query("shippingZones")
        .withIndex("by_name", (q) => q.eq("name", zone.name))
        .unique();

      if (!existing) {
        await ctx.db.insert("shippingZones", {
          ...zone,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, total: zones.length };
  },
});
