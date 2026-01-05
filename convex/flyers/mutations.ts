import { v } from "convex/values";
import { mutation, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { getTimezoneFromLocation, parseEventDateTime } from "../lib/timezone";
import { requireAdmin as requireAdminAuth } from "../lib/auth";

/**
 * Log uploaded flyer to database
 */
export const logUploadedFlyer = mutation({
  args: {
    filename: v.string(),
    fileHash: v.string(),
    filepath: v.string(),
    originalSize: v.number(),
    optimizedSize: v.number(),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication for flyer uploads
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new Error("Authentication required. Please sign in to upload flyers.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User account not found. Please contact support.");
    }

    const flyerId = await ctx.db.insert("uploadedFlyers", {
      filename: args.filename,
      fileHash: args.fileHash,
      filepath: args.filepath,
      originalSize: args.originalSize,
      optimizedSize: args.optimizedSize,
      uploadedBy: user._id,
      uploadedAt: Date.now(),
      aiProcessed: false,
      eventCreated: false,
      status: "UPLOADED",
    });

    return { flyerId };
  },
});

/**
 * Create a claimable event from an uploaded flyer
 * Admin uses this after uploading flyers to create events that organizers can claim
 */
export const createClaimableEventFromFlyer = mutation({
  args: {
    flyerId: v.id("uploadedFlyers"),
    eventData: v.object({
      name: v.string(),
      description: v.string(),
      eventType: v.union(
        v.literal("SAVE_THE_DATE"),
        v.literal("FREE_EVENT"),
        v.literal("TICKETED_EVENT"),
        v.literal("SEATED_EVENT"),
        v.literal("CLASS")
      ),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
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
      isClaimable: v.boolean(),
      claimCode: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication
    await requireAdminAuth(ctx);

    // Get the flyer
    const flyer = await ctx.db.get(args.flyerId);
    if (!flyer) {
      throw new Error("Flyer not found");
    }

    if (flyer.eventCreated) {
      throw new Error("Event already created from this flyer");
    }

    const now = Date.now();

    // Create the event
    const eventId = await ctx.db.insert("events", {
      name: args.eventData.name,
      description: args.eventData.description,
      eventType: args.eventData.eventType,
      startDate: args.eventData.startDate,
      endDate: args.eventData.endDate,
      location: args.eventData.location,

      // Use the flyer image as the event image
      imageUrl: flyer.filepath,

      // Event is claimable by organizers
      isClaimable: args.eventData.isClaimable,
      claimCode: args.eventData.claimCode,

      // No organizer yet - will be set when claimed
      organizerId: undefined,
      organizerName: undefined,

      // Status
      status: "PUBLISHED", // Make it visible to organizers

      // Settings
      ticketsVisible: false, // No tickets until claimed and set up
      paymentModelSelected: false,

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
      message: args.eventData.isClaimable
        ? "Claimable event created - organizers can now claim it"
        : "Save-the-date event created",
    };
  },
});

/**
 * Get all uploaded flyers for admin dashboard
 */
export const getUploadedFlyers = mutation({
  args: {
    status: v.optional(
      v.union(
        v.literal("UPLOADED"),
        v.literal("PROCESSING"),
        v.literal("EXTRACTED"),
        v.literal("EVENT_CREATED"),
        v.literal("ERROR")
      )
    ),
  },
  handler: async (ctx, args) => {
    let flyers;

    if (args.status) {
      flyers = await ctx.db
        .query("uploadedFlyers")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    } else {
      flyers = await ctx.db.query("uploadedFlyers").order("desc").take(100);
    }

    return flyers;
  },
});

/**
 * Update flyer with AI-extracted data
 */
export const updateFlyerWithExtractedData = mutation({
  args: {
    flyerId: v.id("uploadedFlyers"),
    extractedData: v.any(), // Accept any object structure from AI
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.flyerId, {
      extractedData: args.extractedData,
      aiProcessed: true,
      aiProcessedAt: Date.now(),
      status: "EXTRACTED",
    });

    return { success: true };
  },
});

/**
 * Automatically create event from AI-extracted flyer data
 * Called after AI extraction completes
 */
export const autoCreateEventFromExtractedData = mutation({
  args: {
    flyerId: v.id("uploadedFlyers"),
  },
  handler: async (ctx, args) => {
    // Get the flyer with extracted data
    const flyer = await ctx.db.get(args.flyerId);
    if (!flyer) {
      throw new Error("Flyer not found");
    }

    if (flyer.eventCreated) {
      throw new Error("Event already created from this flyer");
    }

    if (!flyer.extractedData) {
      throw new Error("No extracted data available");
    }

    const data = flyer.extractedData as any;
    const now = Date.now();

    // Store literal date/time values (NO CONVERSIONS - EXACTLY AS EXTRACTED)
    const eventDateLiteral = data.eventDate || data.date || undefined;
    const eventTimeLiteral = data.eventTime || data.time || undefined;
    const eventEndDateLiteral = data.eventEndDate || undefined;
    const eventEndTimeLiteral = data.eventEndTime || undefined;

    // Determine timezone from city/state (if timezone not on flyer)
    // This ensures Chicago events get CT, Atlanta gets ET, etc.
    const eventTimezone =
      data.eventTimezone ||
      (data.city && data.state
        ? getTimezoneFromLocation(data.city, data.state)
        : "America/New_York");


    // Parse START date using event's timezone (not server timezone!)
    // This prevents date shifting based on where the server is located
    let startDate: number | undefined;
    let endDate: number | undefined;

    startDate = parseEventDateTime(
      data.eventDate || data.date,
      data.eventTime || data.time,
      eventTimezone
    );

    // Parse END date for weekend/multi-day events
    if (data.eventEndDate) {
      // Weekend event - parse the end date
      endDate = parseEventDateTime(
        data.eventEndDate,
        data.eventEndTime || data.eventTime || data.time, // Use end time if provided, else use start time
        eventTimezone
      );
    } else if (data.eventEndTime) {
      // Single-day event with END TIME - parse end time on the same date
      // Example: Event from 8PM to 2AM on the same night
      endDate = parseEventDateTime(
        data.eventDate || data.date,
        data.eventEndTime, // Use the END time
        eventTimezone
      );
    } else {
      // Single-day event without end time - end date same as start
      endDate = startDate;
    }

    if (startDate) {
      if (endDate && endDate !== startDate) {
      }
    } else {
      console.warn("[AI Extraction] Could not parse date:", data.eventDate || data.date);
    }

    // Determine event type (use AI suggestion or fallback logic)
    let eventType = data.eventType || "FREE_EVENT";

    // Validate event type
    if (!["SAVE_THE_DATE", "FREE_EVENT", "TICKETED_EVENT"].includes(eventType)) {
      eventType = "FREE_EVENT";
    }

    // Build location object with full address details
    const location =
      data.city && data.state
        ? {
            venueName: data.venueName || undefined,
            address: data.address || undefined,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode || undefined,
            country: "USA",
          }
        : undefined;

    // Get organizer name from hostOrganizer field
    const organizerName = data.hostOrganizer || "Event Organizer";

    // Create the event
    const eventId = await ctx.db.insert("events", {
      name: data.eventName || "Untitled Event",
      description: data.description || "",
      eventType: eventType as "SAVE_THE_DATE" | "FREE_EVENT" | "TICKETED_EVENT",

      // Literal date/time storage (NO CONVERSIONS - exactly as shown on flyer)
      eventDateLiteral,
      eventTimeLiteral,

      // Timezone determined from city/state
      timezone: eventTimezone,

      // Legacy timestamp fields (for backward compat and sorting)
      startDate,
      endDate,

      location,

      // Use the flyer image as the event image
      imageUrl: flyer.filepath,

      // Categories from AI
      categories: data.categories || [],

      // Event is claimable by organizers
      isClaimable: true,
      claimCode: undefined, // No claim code required

      // Set organizer name from flyer, but no organizerId yet (will be set when claimed)
      organizerId: undefined,
      organizerName: organizerName,

      // Status
      status: "PUBLISHED", // Make it visible to organizers and public

      // Settings
      ticketsVisible: false, // No tickets until claimed and set up
      paymentModelSelected: false,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    });

    // Save contacts to CRM if extracted from flyer
    let contactsCreated = 0;
    if (data.contacts && Array.isArray(data.contacts) && data.contacts.length > 0) {
      for (const contact of data.contacts) {
        if (contact.name) {
          // Check if contact already exists (by name + phone)
          const existing = contact.phoneNumber
            ? await ctx.db
                .query("eventContacts")
                .withIndex("by_phone", (q) => q.eq("phoneNumber", contact.phoneNumber))
                .filter((q) => q.eq(q.field("name"), contact.name))
                .first()
            : null;

          if (existing) {
            // Update existing contact with event link
            await ctx.db.patch(existing._id, {
              eventId: eventId,
              updatedAt: now,
            });
          } else {
            // Create new contact
            // Clean socialMedia object - remove null values
            let cleanedSocialMedia = undefined;
            if (contact.socialMedia && typeof contact.socialMedia === "object") {
              const filtered: Record<string, string> = {};
              if (contact.socialMedia.instagram) filtered.instagram = contact.socialMedia.instagram;
              if (contact.socialMedia.facebook) filtered.facebook = contact.socialMedia.facebook;
              if (contact.socialMedia.twitter) filtered.twitter = contact.socialMedia.twitter;
              if (contact.socialMedia.tiktok) filtered.tiktok = contact.socialMedia.tiktok;
              if (Object.keys(filtered).length > 0) {
                cleanedSocialMedia = filtered;
              }
            }

            await ctx.db.insert("eventContacts", {
              name: contact.name,
              phoneNumber: contact.phoneNumber || undefined,
              email: contact.email || undefined,
              role: contact.role || undefined,
              organization: contact.organization || undefined,
              socialMedia: cleanedSocialMedia,
              flyerId: args.flyerId,
              eventId: eventId,
              extractedFrom: "FLYER",
              createdAt: now,
              updatedAt: now,
            });
            contactsCreated++;
          }
        }
      }
    }

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
      eventType,
      contactsCreated,
      message: `Event automatically created from flyer${contactsCreated > 0 ? ` with ${contactsCreated} contact(s)` : ""}`,
    };
  },
});

/**
 * Migrate old flyer paths from /STEPFILES/ to /api/flyers/
 * Run this once to fix old database records
 */
export const migrateOldFlyerPaths = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all flyers with old paths
    const allFlyers = await ctx.db.query("uploadedFlyers").collect();

    let updated = 0;
    for (const flyer of allFlyers) {
      if (flyer.filepath.includes("/STEPFILES/event-flyers/")) {
        // Extract filename from old path
        const filename = flyer.filepath.split("/STEPFILES/event-flyers/")[1];
        const newPath = `/api/flyers/${filename}`;

        // Update flyer
        await ctx.db.patch(flyer._id, {
          filepath: newPath,
        });

        // If there's an associated event, update its imageUrl too
        if (flyer.eventId) {
          const event = await ctx.db.get(flyer.eventId);
          if (event && event.imageUrl?.includes("/STEPFILES/event-flyers/")) {
            await ctx.db.patch(flyer.eventId, {
              imageUrl: newPath,
            });
          }
        }

        updated++;
      }
    }

    return {
      success: true,
      message: `Updated ${updated} flyer paths from /STEPFILES/ to /api/flyers/`,
      updated,
    };
  },
});

/**
 * Delete a flyer and its associated event (admin only)
 */
/**
 * Action to delete flyer - handles both physical file and database cleanup
 * This calls the API to delete the physical file, then deletes database records
 */
export const deleteFlyerWithCleanup = action({
  args: {
    flyerId: v.id("uploadedFlyers"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    message: string;
    deletedFileHash: string;
    deletedFilepath: string;
  }> => {

    // Get the flyer to find the filepath
    const flyer: Doc<"uploadedFlyers"> | null = await ctx.runQuery(
      api.flyers.queries.getFlyerById,
      {
        flyerId: args.flyerId,
      }
    );

    if (!flyer) {
      throw new Error("Flyer not found");
    }


    // Call API to delete physical file
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "https://events.stepperslife.com"}/api/admin/delete-flyer-file`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filepath: flyer.filepath,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`⚠️ Failed to delete physical file: ${flyer.filepath}`, errorData);
        // Continue anyway - we still want to delete the database record
      } else {
        const successData = await response.json();
      }
    } catch (error) {
      console.warn(`⚠️ Error deleting physical file:`, error);
      // Continue anyway - we still want to delete the database record
    }

    // Now delete from database
    await ctx.runMutation(api.flyers.mutations.deleteFlyerFromDb, {
      flyerId: args.flyerId,
    });


    return {
      success: true,
      message: "Flyer, physical file, and associated event deleted successfully",
      deletedFileHash: flyer.fileHash,
      deletedFilepath: flyer.filepath,
    };
  },
});

/**
 * Bulk delete ALL flyers - deletes all flyers from database and file system
 * WARNING: This is destructive and cannot be undone!
 */
export const deleteAllFlyers = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    success: boolean;
    totalFlyers: number;
    successCount: number;
    failCount: number;
    message: string;
  }> => {

    // Get all flyers
    const flyers: Array<any> = await ctx.runQuery(api.flyers.queries.getAllFlyers, {});


    let successCount = 0;
    let failCount = 0;

    // Delete each flyer
    for (const flyer of flyers) {
      try {
        await ctx.runAction(api.flyers.mutations.deleteFlyerWithCleanup, {
          flyerId: flyer._id,
        });
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to delete flyer ${flyer.filename}:`, error);
      }
    }


    return {
      success: true,
      totalFlyers: flyers.length,
      successCount,
      failCount,
      message: `Deleted ${successCount} of ${flyers.length} flyers`,
    };
  },
});

/**
 * Internal mutation to delete flyer from database
 * Called by deleteFlyerWithCleanup action after file cleanup
 */
export const deleteFlyerFromDb = mutation({
  args: {
    flyerId: v.id("uploadedFlyers"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication
    await requireAdminAuth(ctx);

    // Get the flyer
    const flyer = await ctx.db.get(args.flyerId);
    if (!flyer) {
      throw new Error("Flyer not found");
    }

    // If there's an associated event, delete it too
    if (flyer.eventId) {
      await ctx.db.delete(flyer.eventId);
    }

    // Delete the flyer record
    await ctx.db.delete(args.flyerId);

    return {
      success: true,
      message: "Flyer and associated event deleted from database",
    };
  },
});

/**
 * @deprecated Use deleteFlyerWithCleanup action instead for full cleanup
 * Legacy mutation kept for backward compatibility
 */
export const deleteFlyer = mutation({
  args: {
    flyerId: v.id("uploadedFlyers"),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require admin authentication
    await requireAdminAuth(ctx);

    // Get the flyer
    const flyer = await ctx.db.get(args.flyerId);
    if (!flyer) {
      throw new Error("Flyer not found");
    }

    // If there's an associated event, delete it too
    if (flyer.eventId) {
      await ctx.db.delete(flyer.eventId);
    }

    // Delete the flyer record
    await ctx.db.delete(args.flyerId);

    return {
      success: true,
      message: "Flyer and associated event deleted from database (physical file NOT deleted)",
    };
  },
});

/**
 * Get statistics for flyer uploads (for analytics)
 */
export const getFlyerStats = mutation({
  args: {},
  handler: async (ctx) => {
    const allFlyers = await ctx.db.query("uploadedFlyers").collect();

    const totalUploaded = allFlyers.length;
    const eventsCreated = allFlyers.filter((f) => f.eventCreated).length;
    const pendingEvents = allFlyers.filter((f) => !f.eventCreated).length;
    const totalSizeSaved = allFlyers.reduce(
      (sum, f) => sum + (f.originalSize - f.optimizedSize),
      0
    );

    // Get event type breakdown
    const eventsByType = await ctx.db
      .query("events")
      .filter((q) => q.neq(q.field("organizerId"), undefined))
      .collect();

    const saveTheDateCount = eventsByType.filter((e) => e.eventType === "SAVE_THE_DATE").length;
    const freeEventCount = eventsByType.filter((e) => e.eventType === "FREE_EVENT").length;
    const ticketedEventCount = eventsByType.filter((e) => e.eventType === "TICKETED_EVENT").length;

    // Get claimable vs claimed events
    const claimableEvents = await ctx.db
      .query("events")
      .withIndex("by_claimable", (q) => q.eq("isClaimable", true))
      .filter((q) => q.eq(q.field("organizerId"), undefined))
      .collect();

    const claimedEvents = await ctx.db
      .query("events")
      .filter((q) => q.neq(q.field("claimedAt"), undefined))
      .collect();

    return {
      flyers: {
        totalUploaded,
        eventsCreated,
        pendingEvents,
        totalSizeSaved: (totalSizeSaved / 1024 / 1024).toFixed(2) + " MB",
      },
      events: {
        saveTheDateCount,
        freeEventCount,
        ticketedEventCount,
        claimableCount: claimableEvents.length,
        claimedCount: claimedEvents.length,
      },
    };
  },
});

/**
 * Delete all flyer records from database only (for cleanup when events are already deleted)
 * Does NOT delete physical files or events
 */
export const deleteAllFlyerRecordsOnly = mutation({
  args: {},
  handler: async (ctx) => {

    const allFlyers = await ctx.db.query("uploadedFlyers").collect();

    for (const flyer of allFlyers) {
      await ctx.db.delete(flyer._id);
    }


    return {
      success: true,
      deleted: allFlyers.length,
    };
  },
});
