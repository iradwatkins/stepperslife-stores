import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "../lib/auth";
import { Id } from "../_generated/dataModel";

/**
 * Admin Event/Class Upload Mutations
 *
 * These mutations allow SteppersLife admins to upload flyers and create
 * events/classes on behalf of organizers. Events created this way are
 * marked with isAdminUploaded: true and show "Uploaded by SteppersLife"
 * badge in the UI.
 */

/**
 * Log an admin-uploaded flyer to the database
 * Similar to regular flyer upload but tracks admin source
 */
export const adminLogUploadedFlyer = mutation({
  args: {
    filename: v.string(),
    fileHash: v.string(),
    filepath: v.string(),
    originalSize: v.number(),
    optimizedSize: v.number(),
    eventType: v.optional(v.union(v.literal("EVENT"), v.literal("CLASS"))),
  },
  handler: async (ctx, args) => {
    // Require admin authentication
    const admin = await requireAdmin(ctx);

    const flyerId = await ctx.db.insert("uploadedFlyers", {
      filename: args.filename,
      fileHash: args.fileHash,
      filepath: args.filepath,
      originalSize: args.originalSize,
      optimizedSize: args.optimizedSize,
      uploadedBy: admin._id,
      uploadedAt: Date.now(),
      aiProcessed: false,
      eventCreated: false,
      status: "UPLOADED",
      // Track that this was admin-uploaded for the eventual event
      isAdminUpload: true,
    });

    return { flyerId, uploadedBy: admin._id };
  },
});

/**
 * Create an event from admin-uploaded flyer with AI-extracted data
 * Marks event as admin-uploaded for UI badge display
 */
export const adminCreateEventFromFlyer = mutation({
  args: {
    flyerId: v.id("uploadedFlyers"),
    eventData: v.object({
      name: v.string(),
      description: v.optional(v.string()),
      eventType: v.union(
        v.literal("SAVE_THE_DATE"),
        v.literal("FREE_EVENT"),
        v.literal("TICKETED_EVENT"),
        v.literal("SEATED_EVENT")
      ),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      eventDateLiteral: v.optional(v.string()),
      eventTimeLiteral: v.optional(v.string()),
      timezone: v.optional(v.string()),
      location: v.optional(
        v.object({
          venueName: v.optional(v.string()),
          address: v.optional(v.string()),
          city: v.string(),
          state: v.string(),
          zipCode: v.optional(v.string()),
          country: v.string(),
        })
      ),
      categories: v.optional(v.array(v.string())),
      organizerName: v.optional(v.string()),
      isClaimable: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Get the flyer
    const flyer = await ctx.db.get(args.flyerId);
    if (!flyer) {
      throw new Error("Flyer not found");
    }

    if (flyer.eventCreated) {
      throw new Error("Event already created from this flyer");
    }

    const now = Date.now();

    // Create the event with admin tracking
    const eventId = await ctx.db.insert("events", {
      name: args.eventData.name,
      description: args.eventData.description || "",
      eventType: args.eventData.eventType,

      // Date/time fields
      startDate: args.eventData.startDate,
      endDate: args.eventData.endDate,
      eventDateLiteral: args.eventData.eventDateLiteral,
      eventTimeLiteral: args.eventData.eventTimeLiteral,
      timezone: args.eventData.timezone || "America/Chicago",

      location: args.eventData.location,
      categories: args.eventData.categories || [],

      // Use the flyer image as the event image
      imageUrl: flyer.filepath,

      // Organizer info (can be claimed later)
      organizerName: args.eventData.organizerName || "SteppersLife",
      organizerId: undefined, // No owner yet - claimable

      // Claimability
      isClaimable: args.eventData.isClaimable !== false, // Default true

      // Status
      status: "PUBLISHED",
      ticketsVisible: false,
      paymentModelSelected: false,

      // ADMIN UPLOAD TRACKING - Key fields for "Uploaded by SteppersLife" badge
      isAdminUploaded: true,
      uploadedByAdminId: admin._id,
      adminUploadedAt: now,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    });

    // Update flyer record
    await ctx.db.patch(args.flyerId, {
      eventCreated: true,
      eventId: eventId,
      eventCreatedAt: now,
      status: "EVENT_CREATED",
    });

    return {
      success: true,
      eventId,
      message: "Event created and marked as uploaded by SteppersLife",
    };
  },
});

/**
 * Create a class from admin-uploaded flyer with AI-extracted data
 * Same as event but with eventType: "CLASS"
 */
export const adminCreateClassFromFlyer = mutation({
  args: {
    flyerId: v.id("uploadedFlyers"),
    classData: v.object({
      name: v.string(),
      description: v.optional(v.string()),
      classLevel: v.optional(v.union(
        v.literal("Beginner"),
        v.literal("Intermediate"),
        v.literal("Advanced"),
        v.literal("All Levels")
      )),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      eventDateLiteral: v.optional(v.string()),
      eventTimeLiteral: v.optional(v.string()),
      timezone: v.optional(v.string()),
      location: v.optional(
        v.object({
          venueName: v.optional(v.string()),
          address: v.optional(v.string()),
          city: v.string(),
          state: v.string(),
          zipCode: v.optional(v.string()),
          country: v.string(),
        })
      ),
      instructorName: v.optional(v.string()),
      isClaimable: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Get the flyer
    const flyer = await ctx.db.get(args.flyerId);
    if (!flyer) {
      throw new Error("Flyer not found");
    }

    if (flyer.eventCreated) {
      throw new Error("Class already created from this flyer");
    }

    const now = Date.now();

    // Create the class (events with eventType: CLASS)
    const classId = await ctx.db.insert("events", {
      name: args.classData.name,
      description: args.classData.description || "",
      eventType: "CLASS",
      classLevel: args.classData.classLevel || "All Levels",

      // Date/time fields
      startDate: args.classData.startDate,
      endDate: args.classData.endDate,
      eventDateLiteral: args.classData.eventDateLiteral,
      eventTimeLiteral: args.classData.eventTimeLiteral,
      timezone: args.classData.timezone || "America/Chicago",

      location: args.classData.location,

      // Use the flyer image as the class image
      imageUrl: flyer.filepath,

      // Instructor/organizer info (can be claimed later)
      organizerName: args.classData.instructorName || "SteppersLife",
      organizerId: undefined, // No owner yet - claimable

      // Claimability
      isClaimable: args.classData.isClaimable !== false, // Default true

      // Status
      status: "PUBLISHED",
      ticketsVisible: false,
      paymentModelSelected: false,

      // ADMIN UPLOAD TRACKING - Key fields for "Uploaded by SteppersLife" badge
      isAdminUploaded: true,
      uploadedByAdminId: admin._id,
      adminUploadedAt: now,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    });

    // Update flyer record
    await ctx.db.patch(args.flyerId, {
      eventCreated: true,
      eventId: classId,
      eventCreatedAt: now,
      status: "EVENT_CREATED",
    });

    return {
      success: true,
      classId,
      message: "Class created and marked as uploaded by SteppersLife",
    };
  },
});

/**
 * Get all admin-uploaded events (for admin dashboard)
 */
export const getAdminUploadedEvents = query({
  args: {
    eventType: v.optional(v.union(
      v.literal("EVENT"),
      v.literal("CLASS"),
      v.literal("ALL")
    )),
  },
  handler: async (ctx, args) => {
    // Get all events that were admin-uploaded
    let events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("isAdminUploaded"), true))
      .order("desc")
      .collect();

    // Filter by event type if specified
    if (args.eventType === "EVENT") {
      events = events.filter((e) => e.eventType !== "CLASS");
    } else if (args.eventType === "CLASS") {
      events = events.filter((e) => e.eventType === "CLASS");
    }

    return events;
  },
});

/**
 * Get admin upload statistics
 */
export const getAdminUploadStats = query({
  args: {},
  handler: async (ctx) => {
    const adminEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("isAdminUploaded"), true))
      .collect();

    const events = adminEvents.filter((e) => e.eventType !== "CLASS");
    const classes = adminEvents.filter((e) => e.eventType === "CLASS");
    const claimed = adminEvents.filter((e) => e.claimedAt !== undefined);

    return {
      totalUploaded: adminEvents.length,
      events: events.length,
      classes: classes.length,
      claimed: claimed.length,
      unclaimed: adminEvents.length - claimed.length,
    };
  },
});

/**
 * Mark an existing event as admin-uploaded (for migration)
 */
export const markEventAsAdminUploaded = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, {
      isAdminUploaded: true,
      uploadedByAdminId: admin._id,
      adminUploadedAt: Date.now(),
    });

    return { success: true, eventId: args.eventId };
  },
});
