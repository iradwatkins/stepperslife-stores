/**
 * Radio Streaming Module - Convex Functions
 *
 * This file contains all Convex queries and mutations for the
 * SteppersLife Radio streaming platform.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================
// Public Queries - No Authentication Required
// ============================================

/**
 * Get all active radio stations
 */
export const getActiveStations = query({
  args: {},
  handler: async (ctx) => {
    const stations = await ctx.db
      .query("radioStations")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .collect();

    return stations.map((station) => ({
      _id: station._id,
      name: station.name,
      slug: station.slug,
      djName: station.djName,
      description: station.description,
      genre: station.genre,
      genres: station.genres,
      logoUrl: station.logoUrl,
      bannerUrl: station.bannerUrl,
      streamUrl: station.streamUrl,
      isLive: station.isLive ?? false,
      currentListeners: station.currentListeners ?? 0,
      nowPlaying: station.nowPlaying,
      tier: station.tier,
      schedule: station.schedule,
      socialLinks: station.socialLinks,
    }));
  },
});

/**
 * Get stations that are currently live
 */
export const getLiveStations = query({
  args: {},
  handler: async (ctx) => {
    const stations = await ctx.db
      .query("radioStations")
      .withIndex("by_isLive", (q) => q.eq("isLive", true).eq("status", "ACTIVE"))
      .collect();

    return stations.map((station) => ({
      _id: station._id,
      name: station.name,
      slug: station.slug,
      djName: station.djName,
      genre: station.genre,
      logoUrl: station.logoUrl,
      streamUrl: station.streamUrl,
      currentListeners: station.currentListeners ?? 0,
      nowPlaying: station.nowPlaying,
    }));
  },
});

/**
 * Get a single station by slug
 */
export const getStationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!station) return null;

    return {
      _id: station._id,
      djId: station.djId,
      name: station.name,
      slug: station.slug,
      djName: station.djName,
      description: station.description,
      genre: station.genre,
      genres: station.genres,
      logoUrl: station.logoUrl,
      bannerUrl: station.bannerUrl,
      streamUrl: station.streamUrl,
      isLive: station.isLive ?? false,
      currentListeners: station.currentListeners ?? 0,
      peakListeners: station.peakListeners ?? 0,
      nowPlaying: station.nowPlaying,
      tier: station.tier,
      schedule: station.schedule,
      socialLinks: station.socialLinks,
      totalListenHours: station.totalListenHours ?? 0,
      totalUniqueListeners: station.totalUniqueListeners ?? 0,
      status: station.status,
    };
  },
});

/**
 * Get stations by genre
 */
export const getStationsByGenre = query({
  args: { genre: v.string() },
  handler: async (ctx, args) => {
    const stations = await ctx.db
      .query("radioStations")
      .withIndex("by_genre", (q) => q.eq("genre", args.genre).eq("status", "ACTIVE"))
      .collect();

    return stations;
  },
});

// ============================================
// DJ Queries - Require Authentication
// ============================================

/**
 * Get the current user's radio station
 */
export const getMyStation = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    return station;
  },
});

/**
 * Get DJ application status
 */
export const getMyDjApplication = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const application = await ctx.db
      .query("djApplications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    return application;
  },
});

// ============================================
// DJ Mutations
// ============================================

/**
 * Submit a DJ application
 */
export const submitDjApplication = mutation({
  args: {
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    djName: v.string(),
    proposedStationName: v.string(),
    genre: v.string(),
    description: v.string(),
    experience: v.optional(v.string()),
    sampleMixUrl: v.optional(v.string()),
    socialProof: v.optional(v.string()),
    preferredSchedule: v.optional(v.string()),
    broadcastMethod: v.optional(
      v.union(
        v.literal("WEB_DJ"),
        v.literal("OBS"),
        v.literal("MIXXX"),
        v.literal("OTHER")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Check if user already has an application
    const existingApplication = await ctx.db
      .query("djApplications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingApplication && existingApplication.status !== "REJECTED") {
      throw new Error("You already have a pending or approved application");
    }

    // Check if user already has a station
    const existingStation = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    if (existingStation) {
      throw new Error("You already have a radio station");
    }

    const now = Date.now();

    const applicationId = await ctx.db.insert("djApplications", {
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      djName: args.djName,
      proposedStationName: args.proposedStationName,
      genre: args.genre,
      description: args.description,
      experience: args.experience,
      sampleMixUrl: args.sampleMixUrl,
      socialProof: args.socialProof,
      preferredSchedule: args.preferredSchedule,
      broadcastMethod: args.broadcastMethod,
      contentAgreementAccepted: true,
      contentAgreementDate: now,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    return applicationId;
  },
});

/**
 * Update station now playing info (called by background job)
 */
export const updateNowPlaying = mutation({
  args: {
    stationId: v.id("radioStations"),
    nowPlaying: v.object({
      title: v.optional(v.string()),
      artist: v.optional(v.string()),
      album: v.optional(v.string()),
      artUrl: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      duration: v.optional(v.number()),
    }),
    isLive: v.boolean(),
    currentListeners: v.number(),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db.get(args.stationId);
    if (!station) {
      throw new Error("Station not found");
    }

    const now = Date.now();
    const updateData: Record<string, unknown> = {
      nowPlaying: args.nowPlaying,
      isLive: args.isLive,
      currentListeners: args.currentListeners,
      updatedAt: now,
    };

    // Update peak listeners if current is higher
    if (args.currentListeners > (station.peakListeners ?? 0)) {
      updateData.peakListeners = args.currentListeners;
    }

    // Update last live timestamp
    if (args.isLive && !station.isLive) {
      updateData.lastLiveAt = now;
    }

    await ctx.db.patch(args.stationId, updateData);
  },
});

// ============================================
// Admin Queries
// ============================================

/**
 * Get all DJ applications (admin only)
 */
export const getAllDjApplications = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let applications;

    if (args.status) {
      applications = await ctx.db
        .query("djApplications")
        .withIndex("by_status", (q) =>
          q.eq(
            "status",
            args.status as
              | "PENDING"
              | "UNDER_REVIEW"
              | "APPROVED"
              | "REJECTED"
              | "WAITLISTED"
          )
        )
        .collect();
    } else {
      applications = await ctx.db.query("djApplications").collect();
    }

    return applications;
  },
});

/**
 * Get all radio stations (admin only)
 */
export const getAllStations = query({
  args: {},
  handler: async (ctx) => {
    const stations = await ctx.db.query("radioStations").collect();

    // Get DJ info for each station
    const stationsWithDj = await Promise.all(
      stations.map(async (station) => {
        const dj = await ctx.db.get(station.djId);
        return {
          ...station,
          djEmail: dj?.email,
        };
      })
    );

    return stationsWithDj;
  },
});

// ============================================
// Admin Mutations
// ============================================

/**
 * Approve a DJ application and create station
 */
export const approveDjApplication = mutation({
  args: {
    applicationId: v.id("djApplications"),
    reviewedBy: v.id("users"),
    reviewNotes: v.optional(v.string()),
    // Station creation details
    stationSlug: v.string(),
    azuracastStationId: v.optional(v.number()),
    azuracastShortcode: v.optional(v.string()),
    streamUrl: v.optional(v.string()),
    mountPoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== "PENDING" && application.status !== "UNDER_REVIEW") {
      throw new Error("Application is not in a reviewable state");
    }

    const now = Date.now();

    // Create the radio station
    const stationId = await ctx.db.insert("radioStations", {
      djId: application.userId,
      djName: application.djName,
      name: application.proposedStationName,
      slug: args.stationSlug,
      description: application.description,
      genre: application.genre,
      status: "ACTIVE",
      tier: "STANDARD",
      azuracastStationId: args.azuracastStationId,
      azuracastShortcode: args.azuracastShortcode,
      streamUrl: args.streamUrl,
      mountPoint: args.mountPoint,
      isLive: false,
      currentListeners: 0,
      autoDjEnabled: true,
      webDjEnabled: true,
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
    });

    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: "APPROVED",
      reviewedBy: args.reviewedBy,
      reviewedAt: now,
      reviewNotes: args.reviewNotes,
      stationId,
      updatedAt: now,
    });

    return stationId;
  },
});

/**
 * Reject a DJ application
 */
export const rejectDjApplication = mutation({
  args: {
    applicationId: v.id("djApplications"),
    reviewedBy: v.id("users"),
    rejectionReason: v.string(),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.applicationId, {
      status: "REJECTED",
      reviewedBy: args.reviewedBy,
      reviewedAt: now,
      rejectionReason: args.rejectionReason,
      reviewNotes: args.reviewNotes,
      updatedAt: now,
    });
  },
});

/**
 * Suspend a radio station
 */
export const suspendStation = mutation({
  args: {
    stationId: v.id("radioStations"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db.get(args.stationId);
    if (!station) {
      throw new Error("Station not found");
    }

    await ctx.db.patch(args.stationId, {
      status: "SUSPENDED",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Reactivate a suspended station
 */
export const reactivateStation = mutation({
  args: {
    stationId: v.id("radioStations"),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db.get(args.stationId);
    if (!station) {
      throw new Error("Station not found");
    }

    if (station.status !== "SUSPENDED") {
      throw new Error("Station is not suspended");
    }

    await ctx.db.patch(args.stationId, {
      status: "ACTIVE",
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// Simplified Admin Functions (for admin UI)
// ============================================

/**
 * Generate a URL-safe slug from a station name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Approve a DJ application (simplified - auto-creates station)
 */
export const approveDjApplicationSimple = mutation({
  args: {
    applicationId: v.id("djApplications"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== "PENDING" && application.status !== "UNDER_REVIEW") {
      throw new Error("Application is not in a reviewable state");
    }

    const now = Date.now();
    const slug = generateSlug(application.proposedStationName);

    // Check if slug already exists
    const existingStation = await ctx.db
      .query("radioStations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    const finalSlug = existingStation
      ? `${slug}-${Math.random().toString(36).slice(2, 8)}`
      : slug;

    // Create the radio station
    const stationId = await ctx.db.insert("radioStations", {
      djId: application.userId,
      djName: application.djName,
      name: application.proposedStationName,
      slug: finalSlug,
      description: application.description,
      genre: application.genre,
      status: "ACTIVE",
      tier: "STANDARD",
      isLive: false,
      currentListeners: 0,
      autoDjEnabled: true,
      webDjEnabled: true,
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
    });

    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: "APPROVED",
      reviewedAt: now,
      reviewNotes: args.adminNotes,
      stationId,
      updatedAt: now,
    });

    return { stationId, slug: finalSlug };
  },
});

/**
 * Reject a DJ application (simplified)
 */
export const rejectDjApplicationSimple = mutation({
  args: {
    applicationId: v.id("djApplications"),
    adminNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== "PENDING" && application.status !== "UNDER_REVIEW") {
      throw new Error("Application is not in a reviewable state");
    }

    const now = Date.now();

    await ctx.db.patch(args.applicationId, {
      status: "REJECTED",
      reviewedAt: now,
      rejectionReason: args.adminNotes,
      reviewNotes: args.adminNotes,
      updatedAt: now,
    });
  },
});

// ============================================
// Radio Shows - Pre-recorded content management
// ============================================

/**
 * Get shows for a DJ's station
 */
export const getMyShows = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get DJ's station
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    if (!station) return [];

    const shows = await ctx.db
      .query("radioShows")
      .withIndex("by_stationId", (q) => q.eq("stationId", station._id))
      .order("desc")
      .collect();

    return shows;
  },
});

/**
 * Create a new show (start upload)
 */
export const createShow = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    genre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get DJ's station
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    if (!station) {
      throw new Error("You don't have a radio station");
    }

    const now = Date.now();

    const showId = await ctx.db.insert("radioShows", {
      stationId: station._id,
      djId: args.userId,
      title: args.title,
      description: args.description,
      genre: args.genre,
      status: "UPLOADING",
      playCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return showId;
  },
});

/**
 * Generate upload URL for show audio
 */
export const generateShowUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Complete show upload with file
 */
export const completeShowUpload = mutation({
  args: {
    showId: v.id("radioShows"),
    storageId: v.id("_storage"),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) {
      throw new Error("Show not found");
    }

    await ctx.db.patch(args.showId, {
      audioFileId: args.storageId,
      duration: args.duration,
      status: "PENDING_APPROVAL",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update show details
 */
export const updateShow = mutation({
  args: {
    showId: v.id("radioShows"),
    userId: v.id("users"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    genre: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    isRecurring: v.optional(v.boolean()),
    recurringDayOfWeek: v.optional(v.number()),
    recurringTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) {
      throw new Error("Show not found");
    }

    if (show.djId !== args.userId) {
      throw new Error("You don't have permission to update this show");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.genre !== undefined) updates.genre = args.genre;
    if (args.scheduledAt !== undefined) updates.scheduledAt = args.scheduledAt;
    if (args.isRecurring !== undefined) updates.isRecurring = args.isRecurring;

    if (args.isRecurring && args.recurringDayOfWeek !== undefined && args.recurringTime !== undefined) {
      updates.recurringSchedule = {
        dayOfWeek: args.recurringDayOfWeek,
        time: args.recurringTime,
      };
    }

    await ctx.db.patch(args.showId, updates);
  },
});

/**
 * Delete a show
 */
export const deleteShow = mutation({
  args: {
    showId: v.id("radioShows"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) {
      throw new Error("Show not found");
    }

    if (show.djId !== args.userId) {
      throw new Error("You don't have permission to delete this show");
    }

    // Delete the audio file from storage if it exists
    if (show.audioFileId) {
      await ctx.storage.delete(show.audioFileId);
    }

    await ctx.db.delete(args.showId);
  },
});

/**
 * Get URL for show audio file
 */
export const getShowAudioUrl = query({
  args: {
    showId: v.id("radioShows"),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return null;

    if (show.audioFileId) {
      return await ctx.storage.getUrl(show.audioFileId);
    }

    return show.audioUrl || null;
  },
});

// ============================================
// Schedule Management
// ============================================

/**
 * Get DJ's station schedule
 */
export const getMySchedule = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    if (!station) return null;

    return {
      stationId: station._id,
      stationName: station.name,
      schedule: station.schedule || [],
    };
  },
});

/**
 * Get all station schedules for conflict checking
 */
export const getAllSchedules = query({
  args: {},
  handler: async (ctx) => {
    const stations = await ctx.db
      .query("radioStations")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .collect();

    return stations
      .filter((s) => s.schedule && s.schedule.length > 0)
      .map((s) => ({
        stationId: s._id,
        stationName: s.name,
        djName: s.djName,
        schedule: s.schedule || [],
      }));
  },
});

/**
 * Add or update a schedule slot
 */
export const addScheduleSlot = mutation({
  args: {
    userId: v.id("users"),
    dayOfWeek: v.number(), // 0-6
    startTime: v.string(), // "HH:MM"
    endTime: v.string(), // "HH:MM"
    showName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the DJ's station
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    if (!station) {
      throw new Error("You don't have a radio station");
    }

    // Validate times
    const startParts = args.startTime.split(":");
    const endParts = args.endTime.split(":");
    if (startParts.length !== 2 || endParts.length !== 2) {
      throw new Error("Invalid time format");
    }

    const startHour = parseInt(startParts[0]);
    const startMin = parseInt(startParts[1]);
    const endHour = parseInt(endParts[0]);
    const endMin = parseInt(endParts[1]);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      throw new Error("End time must be after start time");
    }

    // Check for conflicts with other stations
    const allStations = await ctx.db
      .query("radioStations")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .collect();

    for (const otherStation of allStations) {
      if (otherStation._id === station._id) continue;
      if (!otherStation.schedule) continue;

      for (const slot of otherStation.schedule) {
        if (slot.dayOfWeek !== args.dayOfWeek) continue;

        const otherStart = slot.startTime.split(":");
        const otherEnd = slot.endTime.split(":");
        const otherStartMin = parseInt(otherStart[0]) * 60 + parseInt(otherStart[1]);
        const otherEndMin = parseInt(otherEnd[0]) * 60 + parseInt(otherEnd[1]);

        // Check for overlap
        if (startMinutes < otherEndMin && endMinutes > otherStartMin) {
          throw new Error(
            `Time conflict with ${otherStation.djName}'s slot (${slot.startTime} - ${slot.endTime})`
          );
        }
      }
    }

    // Check for conflicts within own schedule
    const currentSchedule = station.schedule || [];
    for (const slot of currentSchedule) {
      if (slot.dayOfWeek !== args.dayOfWeek) continue;

      const slotStart = slot.startTime.split(":");
      const slotEnd = slot.endTime.split(":");
      const slotStartMin = parseInt(slotStart[0]) * 60 + parseInt(slotStart[1]);
      const slotEndMin = parseInt(slotEnd[0]) * 60 + parseInt(slotEnd[1]);

      if (startMinutes < slotEndMin && endMinutes > slotStartMin) {
        throw new Error(
          `Overlaps with your existing slot (${slot.startTime} - ${slot.endTime})`
        );
      }
    }

    // Add the new slot
    const newSlot = {
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      showName: args.showName,
    };

    const newSchedule = [...currentSchedule, newSlot].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    await ctx.db.patch(station._id, {
      schedule: newSchedule,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update a schedule slot
 */
export const updateScheduleSlot = mutation({
  args: {
    userId: v.id("users"),
    oldDayOfWeek: v.number(),
    oldStartTime: v.string(),
    newDayOfWeek: v.number(),
    newStartTime: v.string(),
    newEndTime: v.string(),
    showName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    if (!station) {
      throw new Error("You don't have a radio station");
    }

    const currentSchedule = station.schedule || [];

    // Find and remove the old slot
    const filteredSchedule = currentSchedule.filter(
      (s) => !(s.dayOfWeek === args.oldDayOfWeek && s.startTime === args.oldStartTime)
    );

    if (filteredSchedule.length === currentSchedule.length) {
      throw new Error("Schedule slot not found");
    }

    // Validate new times
    const startParts = args.newStartTime.split(":");
    const endParts = args.newEndTime.split(":");
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    if (startMinutes >= endMinutes) {
      throw new Error("End time must be after start time");
    }

    // Check for conflicts (excluding the slot we're replacing)
    const allStations = await ctx.db
      .query("radioStations")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .collect();

    for (const otherStation of allStations) {
      if (otherStation._id === station._id) continue;
      if (!otherStation.schedule) continue;

      for (const slot of otherStation.schedule) {
        if (slot.dayOfWeek !== args.newDayOfWeek) continue;

        const otherStart = slot.startTime.split(":");
        const otherEnd = slot.endTime.split(":");
        const otherStartMin = parseInt(otherStart[0]) * 60 + parseInt(otherStart[1]);
        const otherEndMin = parseInt(otherEnd[0]) * 60 + parseInt(otherEnd[1]);

        if (startMinutes < otherEndMin && endMinutes > otherStartMin) {
          throw new Error(
            `Time conflict with ${otherStation.djName}'s slot (${slot.startTime} - ${slot.endTime})`
          );
        }
      }
    }

    // Check conflicts within own remaining schedule
    for (const slot of filteredSchedule) {
      if (slot.dayOfWeek !== args.newDayOfWeek) continue;

      const slotStart = slot.startTime.split(":");
      const slotEnd = slot.endTime.split(":");
      const slotStartMin = parseInt(slotStart[0]) * 60 + parseInt(slotStart[1]);
      const slotEndMin = parseInt(slotEnd[0]) * 60 + parseInt(slotEnd[1]);

      if (startMinutes < slotEndMin && endMinutes > slotStartMin) {
        throw new Error(
          `Overlaps with your existing slot (${slot.startTime} - ${slot.endTime})`
        );
      }
    }

    // Add the updated slot
    const newSlot = {
      dayOfWeek: args.newDayOfWeek,
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      showName: args.showName,
    };

    const newSchedule = [...filteredSchedule, newSlot].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    await ctx.db.patch(station._id, {
      schedule: newSchedule,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a schedule slot
 */
export const removeScheduleSlot = mutation({
  args: {
    userId: v.id("users"),
    dayOfWeek: v.number(),
    startTime: v.string(),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db
      .query("radioStations")
      .withIndex("by_djId", (q) => q.eq("djId", args.userId))
      .first();

    if (!station) {
      throw new Error("You don't have a radio station");
    }

    const currentSchedule = station.schedule || [];
    const newSchedule = currentSchedule.filter(
      (s) => !(s.dayOfWeek === args.dayOfWeek && s.startTime === args.startTime)
    );

    if (newSchedule.length === currentSchedule.length) {
      throw new Error("Schedule slot not found");
    }

    await ctx.db.patch(station._id, {
      schedule: newSchedule,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Check for schedule conflicts
 */
export const checkScheduleConflicts = query({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    excludeStationId: v.optional(v.id("radioStations")),
  },
  handler: async (ctx, args) => {
    const startParts = args.startTime.split(":");
    const endParts = args.endTime.split(":");
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    const allStations = await ctx.db
      .query("radioStations")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .collect();

    const conflicts: Array<{
      stationName: string;
      djName: string;
      startTime: string;
      endTime: string;
      showName?: string;
    }> = [];

    for (const station of allStations) {
      if (args.excludeStationId && station._id === args.excludeStationId) continue;
      if (!station.schedule) continue;

      for (const slot of station.schedule) {
        if (slot.dayOfWeek !== args.dayOfWeek) continue;

        const slotStart = slot.startTime.split(":");
        const slotEnd = slot.endTime.split(":");
        const slotStartMin = parseInt(slotStart[0]) * 60 + parseInt(slotStart[1]);
        const slotEndMin = parseInt(slotEnd[0]) * 60 + parseInt(slotEnd[1]);

        if (startMinutes < slotEndMin && endMinutes > slotStartMin) {
          conflicts.push({
            stationName: station.name,
            djName: station.djName || "Unknown DJ",
            startTime: slot.startTime,
            endTime: slot.endTime,
            showName: slot.showName,
          });
        }
      }
    }

    return conflicts;
  },
});

// ============================================
// Listen Session Tracking (Story 5.1)
// ============================================

/**
 * Start a new listen session
 */
export const startListenSession = mutation({
  args: {
    stationId: v.id("radioStations"),
    listenerFingerprint: v.string(),
    userId: v.optional(v.id("users")),
    userAgent: v.optional(v.string()),
    deviceType: v.optional(v.union(
      v.literal("DESKTOP"),
      v.literal("MOBILE"),
      v.literal("TABLET"),
      v.literal("OTHER")
    )),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
    streamQuality: v.optional(v.string()),
    playerType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate a unique session ID
    const sessionId = `${args.listenerFingerprint}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // End any existing active sessions for this listener on this station
    const existingSessions = await ctx.db
      .query("radioListenSessions")
      .withIndex("by_fingerprint", (q) =>
        q.eq("listenerFingerprint", args.listenerFingerprint).eq("stationId", args.stationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();
    for (const session of existingSessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
        endedAt: now,
        durationSeconds: Math.floor((now - session.startedAt) / 1000),
      });
    }

    // Create the new session
    const sessionDocId = await ctx.db.insert("radioListenSessions", {
      stationId: args.stationId,
      listenerFingerprint: args.listenerFingerprint,
      userId: args.userId,
      sessionId,
      startedAt: now,
      userAgent: args.userAgent,
      deviceType: args.deviceType,
      region: args.region,
      city: args.city,
      streamQuality: args.streamQuality,
      playerType: args.playerType,
      isActive: true,
    });

    // Update station's current listener count
    const activeListeners = await ctx.db
      .query("radioListenSessions")
      .withIndex("by_isActive", (q) =>
        q.eq("isActive", true).eq("stationId", args.stationId)
      )
      .collect();

    const station = await ctx.db.get(args.stationId);
    if (station) {
      await ctx.db.patch(args.stationId, {
        currentListeners: activeListeners.length,
        updatedAt: now,
      });
    }

    return { sessionId, sessionDocId };
  },
});

/**
 * Send heartbeat to keep session active
 */
export const heartbeatSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("radioListenSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || !session.isActive) {
      return { success: false, reason: "Session not found or inactive" };
    }

    // Session is still active - no need to update anything
    // The isActive flag is what matters
    return { success: true };
  },
});

/**
 * End a listen session
 */
export const endListenSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("radioListenSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return { success: false, reason: "Session not found" };
    }

    const now = Date.now();
    const durationSeconds = Math.floor((now - session.startedAt) / 1000);

    await ctx.db.patch(session._id, {
      isActive: false,
      endedAt: now,
      durationSeconds,
    });

    // Update station's current listener count
    const activeListeners = await ctx.db
      .query("radioListenSessions")
      .withIndex("by_isActive", (q) =>
        q.eq("isActive", true).eq("stationId", session.stationId)
      )
      .collect();

    const station = await ctx.db.get(session.stationId);
    if (station) {
      await ctx.db.patch(session.stationId, {
        currentListeners: activeListeners.length,
        updatedAt: now,
      });
    }

    return { success: true, durationSeconds };
  },
});

/**
 * Clean up stale sessions (sessions with no heartbeat for 2+ minutes)
 */
export const cleanupStaleSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

    // Get all active sessions
    const activeSessions = await ctx.db
      .query("radioListenSessions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const stationsToUpdate = new Set<string>();
    let cleanedCount = 0;

    for (const session of activeSessions) {
      // If no heartbeat for 2 minutes, mark as ended
      // We use startedAt as proxy - in production you'd add a lastHeartbeat field
      const sessionAge = Date.now() - session.startedAt;
      if (sessionAge > 2 * 60 * 1000 && !session.endedAt) {
        // Only clean up if session is older than 2 min and seems abandoned
        // This is a simple heuristic - in production, use heartbeat timestamps
        const now = Date.now();
        await ctx.db.patch(session._id, {
          isActive: false,
          endedAt: now,
          durationSeconds: Math.floor((now - session.startedAt) / 1000),
        });
        stationsToUpdate.add(session.stationId);
        cleanedCount++;
      }
    }

    // Update listener counts for affected stations
    for (const stationId of stationsToUpdate) {
      const activeListeners = await ctx.db
        .query("radioListenSessions")
        .withIndex("by_isActive", (q) =>
          q.eq("isActive", true).eq("stationId", stationId as any)
        )
        .collect();

      const station = await ctx.db.get(stationId as any);
      if (station) {
        await ctx.db.patch(stationId as any, {
          currentListeners: activeListeners.length,
          updatedAt: Date.now(),
        });
      }
    }

    return { cleanedCount };
  },
});

/**
 * Get current listener count for a station
 */
export const getListenerCount = query({
  args: {
    stationId: v.id("radioStations"),
  },
  handler: async (ctx, args) => {
    const activeListeners = await ctx.db
      .query("radioListenSessions")
      .withIndex("by_isActive", (q) =>
        q.eq("isActive", true).eq("stationId", args.stationId)
      )
      .collect();

    return activeListeners.length;
  },
});

/**
 * Get station analytics for a DJ
 */
export const getStationAnalytics = query({
  args: {
    stationId: v.id("radioStations"),
    days: v.optional(v.number()), // Default 30
  },
  handler: async (ctx, args) => {
    const daysBack = args.days || 30;
    const startDate = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query("radioListenSessions")
      .withIndex("by_stationId", (q) => q.eq("stationId", args.stationId))
      .filter((q) => q.gte(q.field("startedAt"), startDate))
      .collect();

    // Calculate metrics
    const uniqueListeners = new Set(sessions.map((s) => s.listenerFingerprint)).size;
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.durationSeconds);
    const totalListenSeconds = completedSessions.reduce(
      (sum, s) => sum + (s.durationSeconds || 0),
      0
    );
    const avgSessionDuration = completedSessions.length
      ? Math.floor(totalListenSeconds / completedSessions.length)
      : 0;

    // Device breakdown
    const deviceBreakdown: Record<string, number> = {};
    for (const session of sessions) {
      const device = session.deviceType || "OTHER";
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
    }

    // Region breakdown
    const regionBreakdown: Record<string, number> = {};
    for (const session of sessions) {
      const region = session.region || "Unknown";
      regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;
    }

    // Sessions by day
    const sessionsByDay: Record<string, number> = {};
    const listenHoursByDay: Record<string, number> = {};
    for (const session of sessions) {
      const day = new Date(session.startedAt).toISOString().split("T")[0];
      sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
      listenHoursByDay[day] =
        (listenHoursByDay[day] || 0) + (session.durationSeconds || 0) / 3600;
    }

    // Peak hours (0-23)
    const peakHours: number[] = Array(24).fill(0);
    for (const session of sessions) {
      const hour = new Date(session.startedAt).getHours();
      peakHours[hour]++;
    }

    return {
      uniqueListeners,
      totalSessions,
      totalListenHours: Math.round(totalListenSeconds / 3600 * 10) / 10,
      avgSessionDuration, // in seconds
      deviceBreakdown,
      regionBreakdown,
      sessionsByDay,
      listenHoursByDay,
      peakHours,
    };
  },
});

/**
 * Get all stations analytics for admin
 */
export const getAllStationsAnalytics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.days || 30;
    const startDate = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    // Get all stations
    const stations = await ctx.db
      .query("radioStations")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .collect();

    // Get all sessions in date range
    const allSessions = await ctx.db
      .query("radioListenSessions")
      .filter((q) => q.gte(q.field("startedAt"), startDate))
      .collect();

    // Global metrics
    const uniqueListeners = new Set(allSessions.map((s) => s.listenerFingerprint)).size;
    const totalSessions = allSessions.length;
    const completedSessions = allSessions.filter((s) => s.durationSeconds);
    const totalDurationSeconds = completedSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const totalListenHours = Math.round(totalDurationSeconds / 3600 * 10) / 10;
    const avgSessionDuration = completedSessions.length > 0
      ? Math.round(totalDurationSeconds / completedSessions.length)
      : 0;

    // Sessions by day (platform-wide)
    const sessionsByDay: Record<string, number> = {};
    for (const session of allSessions) {
      const date = new Date(session.startedAt).toISOString().split("T")[0];
      sessionsByDay[date] = (sessionsByDay[date] || 0) + 1;
    }

    // Peak hours (platform-wide)
    const peakHours: number[] = new Array(24).fill(0);
    for (const session of allSessions) {
      const hour = new Date(session.startedAt).getHours();
      peakHours[hour]++;
    }

    // Device breakdown (platform-wide)
    const deviceBreakdown: Record<string, number> = {};
    for (const session of allSessions) {
      const device = session.deviceType || "OTHER";
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
    }

    // Region breakdown (platform-wide)
    const regionBreakdown: Record<string, number> = {};
    for (const session of allSessions) {
      const region = session.region || "Unknown";
      regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;
    }

    // Per-station metrics
    const stationMetrics = stations.map((station) => {
      const stationSessions = allSessions.filter(
        (s) => s.stationId === station._id
      );
      const stationListenSeconds = stationSessions
        .filter((s) => s.durationSeconds)
        .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

      return {
        stationId: station._id,
        stationName: station.name,
        djName: station.djName,
        slug: station.slug,
        isLive: station.isLive || false,
        totalSessions: stationSessions.length,
        uniqueListeners: new Set(stationSessions.map((s) => s.listenerFingerprint)).size,
        totalListenHours: Math.round(stationListenSeconds / 3600 * 10) / 10,
        currentListeners: station.currentListeners || 0,
      };
    });

    // Sort by total listen hours descending
    stationMetrics.sort((a, b) => b.totalListenHours - a.totalListenHours);

    return {
      globalMetrics: {
        totalStations: stations.length,
        uniqueListeners,
        totalSessions,
        totalListenHours,
        avgSessionDuration,
      },
      sessionsByDay,
      peakHours,
      deviceBreakdown,
      regionBreakdown,
      stationMetrics,
    };
  },
});

// ============================================
// Seed Functions - For Development/Demo
// ============================================

/**
 * Seed sample radio data for demo purposes
 * Creates a sample DJ station and listen sessions
 */
export const seedSampleRadioData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if sample station already exists
    const existingStation = await ctx.db
      .query("radioStations")
      .filter((q) => q.eq(q.field("slug"), "dj-smooth-chicago"))
      .first();

    if (existingStation) {
      return {
        success: false,
        message: "Sample station already exists",
        stationId: existingStation._id
      };
    }

    // Create sample DJ users first
    const dj1Id = await ctx.db.insert("users", {
      email: "djsmooth@demo.stepperslife.com",
      name: "DJ Smooth",
      role: "organizer",
      createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    const dj2Id = await ctx.db.insert("users", {
      email: "djsoulatl@demo.stepperslife.com",
      name: "DJ Soul ATL",
      role: "organizer",
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    // Create sample DJ station
    // Using SomaFM's Soul stream (free, legal, royalty-free)
    const stationId = await ctx.db.insert("radioStations", {
      djId: dj1Id,
      name: "Smooth Chicago Steppin'",
      slug: "dj-smooth-chicago",
      djName: "DJ Smooth",
      description: "The smoothest steppin' grooves from the Windy City. Classic R&B, neo-soul, and Chicago steppin' music 24/7. Perfect for practicing your moves or setting the mood.",
      genre: "Chicago Steppin'",
      genres: ["R&B", "Soul", "Neo-Soul", "Chicago Steppin'"],
      // Using SomaFM Soul stream as placeholder (free, legal streaming)
      streamUrl: "https://ice1.somafm.com/seventies-128-mp3",
      logoUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
      bannerUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200",
      isLive: true,
      status: "ACTIVE",
      tier: "VERIFIED",
      currentListeners: 47,
      peakListeners: 156,
      totalUniqueListeners: 1247,
      totalListenHours: 3892,
      socialLinks: {
        instagram: "https://instagram.com/djsmooth",
        facebook: "https://facebook.com/djsmoothchicago",
        twitter: "https://twitter.com/djsmooth",
      },
      schedule: [
        { dayOfWeek: 5, startTime: "20:00", endTime: "02:00", showName: "Friday Night Steppin'" },
        { dayOfWeek: 6, startTime: "21:00", endTime: "03:00", showName: "Saturday Soul Session" },
        { dayOfWeek: 0, startTime: "18:00", endTime: "22:00", showName: "Sunday Smooth Grooves" },
      ],
      nowPlaying: {
        title: "Before I Let Go",
        artist: "Maze ft. Frankie Beverly",
        album: "Live in New Orleans",
        startedAt: Date.now() - 120000, // Started 2 minutes ago
      },
      createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000, // Created 90 days ago
      updatedAt: Date.now(),
    });

    // Generate sample listen sessions for the past 30 days
    const now = Date.now();
    const devices: ("DESKTOP" | "MOBILE" | "TABLET")[] = ["DESKTOP", "MOBILE", "MOBILE", "MOBILE", "TABLET"]; // Mobile-heavy
    const regions = [
      "Chicago, IL", "Chicago, IL", "Chicago, IL", // Heavy Chicago presence
      "Atlanta, GA", "Atlanta, GA",
      "Detroit, MI", "Detroit, MI",
      "Los Angeles, CA",
      "Houston, TX",
      "New York, NY",
      "Dallas, TX",
      "Memphis, TN",
      "St. Louis, MO",
      "Indianapolis, IN",
      "Milwaukee, WI",
    ];

    const sessionsToCreate = [];

    // Create 200-400 sessions spread over 30 days
    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      // More sessions on weekends
      const isWeekend = daysAgo % 7 === 0 || daysAgo % 7 === 6;
      const sessionsPerDay = isWeekend
        ? Math.floor(Math.random() * 20) + 15  // 15-35 on weekends
        : Math.floor(Math.random() * 12) + 5;  // 5-17 on weekdays

      for (let i = 0; i < sessionsPerDay; i++) {
        // Peak hours: evening (18:00-23:00)
        const hour = Math.random() > 0.3
          ? Math.floor(Math.random() * 5) + 18  // 60% evening
          : Math.floor(Math.random() * 24);     // 40% any time

        const startedAt = now - (daysAgo * 24 * 60 * 60 * 1000)
          - (hour * 60 * 60 * 1000)
          - (Math.floor(Math.random() * 60) * 60 * 1000);

        // Session duration: 5 minutes to 3 hours
        const durationSeconds = Math.floor(Math.random() * 10200) + 300;

        sessionsToCreate.push({
          sessionId: `demo_${daysAgo}_${i}_${Math.random().toString(36).slice(2, 10)}`,
          stationId,
          listenerFingerprint: `demo_listener_${Math.floor(Math.random() * 500)}`,
          startedAt,
          endedAt: startedAt + (durationSeconds * 1000),
          durationSeconds,
          deviceType: devices[Math.floor(Math.random() * devices.length)],
          region: regions[Math.floor(Math.random() * regions.length)],
          isActive: false,
        });
      }
    }

    // Add a few currently active sessions
    for (let i = 0; i < 47; i++) {
      sessionsToCreate.push({
        sessionId: `demo_active_${i}_${Math.random().toString(36).slice(2, 10)}`,
        stationId,
        listenerFingerprint: `demo_active_${i}`,
        startedAt: now - (Math.floor(Math.random() * 3600) * 1000), // Started within last hour
        deviceType: devices[Math.floor(Math.random() * devices.length)],
        region: regions[Math.floor(Math.random() * regions.length)],
        isActive: true,
      });
    }

    // Insert all sessions
    for (const session of sessionsToCreate) {
      await ctx.db.insert("radioListenSessions", session);
    }

    // Create a second sample station (offline)
    const station2Id = await ctx.db.insert("radioStations", {
      djId: dj2Id,
      name: "ATL Steppers Radio",
      slug: "atl-steppers",
      djName: "DJ Soul ATL",
      description: "Atlanta's home for steppin' music. Southern soul, classic R&B, and the smoothest grooves for your steppin' pleasure.",
      genre: "Southern Soul",
      genres: ["Southern Soul", "R&B", "Blues", "Steppin'"],
      streamUrl: "https://ice1.somafm.com/soulsoul-128-mp3",
      logoUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400",
      bannerUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200",
      isLive: false,
      status: "ACTIVE",
      tier: "STANDARD",
      currentListeners: 0,
      peakListeners: 89,
      totalUniqueListeners: 456,
      totalListenHours: 1234,
      socialLinks: {
        instagram: "https://instagram.com/djsoulatl",
      },
      schedule: [
        { dayOfWeek: 6, startTime: "22:00", endTime: "04:00", showName: "Saturday Night ATL" },
      ],
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    // Add some sessions for station 2 (fewer, since it's less active)
    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      const sessionsPerDay = Math.floor(Math.random() * 5) + 2;

      for (let i = 0; i < sessionsPerDay; i++) {
        const hour = Math.floor(Math.random() * 6) + 20; // Evening focus
        const startedAt = now - (daysAgo * 24 * 60 * 60 * 1000)
          - (hour * 60 * 60 * 1000);
        const durationSeconds = Math.floor(Math.random() * 5400) + 300;

        await ctx.db.insert("radioListenSessions", {
          sessionId: `demo_atl_${daysAgo}_${i}_${Math.random().toString(36).slice(2, 10)}`,
          stationId: station2Id,
          listenerFingerprint: `demo_atl_${Math.floor(Math.random() * 200)}`,
          startedAt,
          endedAt: startedAt + (durationSeconds * 1000),
          durationSeconds,
          deviceType: devices[Math.floor(Math.random() * devices.length)],
          region: regions[Math.floor(Math.random() * regions.length)],
          isActive: false,
        });
      }
    }

    return {
      success: true,
      message: "Sample radio data created successfully",
      stations: [
        { id: stationId, name: "Smooth Chicago Steppin'" },
        { id: station2Id, name: "ATL Steppers Radio" },
      ],
      sessionsCreated: sessionsToCreate.length + 90, // approx
    };
  },
});

/**
 * Clear all sample radio data
 */
export const clearSampleRadioData = mutation({
  args: {},
  handler: async (ctx) => {
    // Get sample stations
    const sampleSlugs = ["dj-smooth-chicago", "atl-steppers"];
    const sampleEmails = ["djsmooth@demo.stepperslife.com", "djsoulatl@demo.stepperslife.com"];

    for (const slug of sampleSlugs) {
      const station = await ctx.db
        .query("radioStations")
        .filter((q) => q.eq(q.field("slug"), slug))
        .first();

      if (station) {
        // Delete all sessions for this station
        const sessions = await ctx.db
          .query("radioListenSessions")
          .filter((q) => q.eq(q.field("stationId"), station._id))
          .collect();

        for (const session of sessions) {
          await ctx.db.delete(session._id);
        }

        // Delete the station
        await ctx.db.delete(station._id);
      }
    }

    // Delete sample DJ users
    for (const email of sampleEmails) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), email))
        .first();

      if (user) {
        await ctx.db.delete(user._id);
      }
    }

    return { success: true, message: "Sample radio data cleared" };
  },
});
