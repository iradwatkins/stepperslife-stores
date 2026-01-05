import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUser, requireEventOwnership, requireAdmin } from "../lib/auth";
import { internal } from "../_generated/api";
import { getTimestamps, getUpdateTimestamp } from "../lib/helpers";
import { PRIMARY_ADMIN_EMAIL } from "../lib/roles";

/**
 * Create a new event
 */
export const createEvent = mutation({
  args: {
    name: v.string(),
    eventType: v.union(
      v.literal("TICKETED_EVENT"),
      v.literal("FREE_EVENT"),
      v.literal("SAVE_THE_DATE"),
      v.literal("SEATED_EVENT"),
      v.literal("CLASS")
    ),
    description: v.string(),
    categories: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    timezone: v.string(),
    // Literal date/time fields for display without timezone conversion
    eventDateLiteral: v.optional(v.string()),
    eventTimeLiteral: v.optional(v.string()),
    eventTimezone: v.optional(v.string()),
    location: v.object({
      venueName: v.optional(v.string()),
      address: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zipCode: v.optional(v.string()),
      country: v.string(),
    }),
    capacity: v.optional(v.number()),
    doorPrice: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.id("_storage"))),
    // Class-specific fields
    classDays: v.optional(v.array(v.number())), // Days of week: 0=Sun, 1=Mon, ... 6=Sat
    classLevel: v.optional(v.string()), // Skill level: Beginner, Intermediate, Advanced
    duration: v.optional(v.number()), // Duration in minutes
    // Recurring class series
    seriesId: v.optional(v.string()), // UUID shared by all sessions in a series
    seriesPosition: v.optional(v.number()), // Position in series (1, 2, 3...)
    // Class series configuration
    numberOfSessions: v.optional(v.number()), // Total sessions in the class series (1-12)
    classFrequency: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("bi-weekly"),
        v.literal("monthly")
      )
    ),
    seriesPriceCents: v.optional(v.number()), // Price to buy full series (in cents)
    doorPriceCents: v.optional(v.number()), // Per-class drop-in price (in cents)
    // Culture-specific fields (Stepping community)
    eventSubType: v.optional(
      v.union(
        v.literal("weekender"),
        v.literal("set"),
        v.literal("ball"),
        v.literal("workshop"),
        v.literal("social")
      )
    ),
    dressCode: v.optional(
      v.union(
        v.literal("all_white"),
        v.literal("black_tie"),
        v.literal("stepping_attire"),
        v.literal("casual"),
        v.literal("theme")
      )
    ),
    dressCodeDetails: v.optional(v.string()), // Custom description for "theme" dress code
    beginnerFriendly: v.optional(v.boolean()),
    hasBeginnerLesson: v.optional(v.boolean()),
    beginnerLessonTime: v.optional(v.string()), // e.g., "7:00 PM - 8:00 PM"
    // Hotel Block Information (for out-of-town guests)
    hotelBlock: v.optional(v.object({
      hotelName: v.string(),
      bookingUrl: v.string(),
      groupCode: v.optional(v.string()),
      rate: v.optional(v.string()),
      cutoffDate: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    try {
      // Get authenticated user
      const user = await getCurrentUser(ctx);

      // ROLE-BASED ACCESS CONTROL: Separate instructors from organizers
      // Classes can only be created by instructors
      // Events can only be created by organizers
      // NOTE: Admins CANNOT create content as themselves - they must use createEventOnBehalfOf
      if (args.eventType === "CLASS") {
        if (user.role !== "instructor") {
          throw new Error(
            "Only instructors can create classes. Please switch to an instructor account or contact support."
          );
        }
      } else {
        // Non-CLASS events (TICKETED_EVENT, FREE_EVENT, SAVE_THE_DATE, SEATED_EVENT)
        if (user.role !== "organizer") {
          throw new Error(
            "Only organizers can create events. Please switch to an organizer account or contact support."
          );
        }
      }

      // Check if user can create ticketed events
      if (
        (args.eventType === "TICKETED_EVENT" || args.eventType === "SEATED_EVENT") &&
        user.canCreateTicketedEvents === false
      ) {
        throw new Error(
          "Your account is restricted to creating Save The Date and Free Events only. " +
            "Contact support to upgrade your account for ticketed events."
        );
      }

      // VALIDATION: Require event image for ticketed events (optional for CLASS type)
      if (args.eventType !== "CLASS" && !args.imageUrl && (!args.images || args.images.length === 0)) {
        throw new Error(
          "Event image is required. Please upload a professional event image that will be displayed on the event page, checkout, and payment confirmation."
        );
      }

      // Create the event
      const eventId = await ctx.db.insert("events", {
        organizerId: user._id,
        organizerName: user.name || user.email,
        name: args.name,
        description: args.description,
        eventType: args.eventType,
        categories: args.categories,
        startDate: args.startDate,
        endDate: args.endDate,
        timezone: args.timezone,
        // Store literal date/time strings for accurate display
        eventDateLiteral: args.eventDateLiteral,
        eventTimeLiteral: args.eventTimeLiteral,
        eventTimezone: args.eventTimezone || args.timezone,
        location: args.location,
        doorPrice: args.doorPrice,
        imageUrl: args.imageUrl,
        images: args.images || [],
        // Class-specific: days of the week, skill level, and duration
        classDays: args.classDays,
        classLevel: args.classLevel,
        duration: args.duration,
        // Recurring class series
        seriesId: args.seriesId,
        seriesPosition: args.seriesPosition,
        // Class series configuration
        numberOfSessions: args.numberOfSessions,
        classFrequency: args.classFrequency,
        seriesPriceCents: args.seriesPriceCents,
        doorPriceCents: args.doorPriceCents,
        // Culture-specific fields (Stepping community)
        eventSubType: args.eventSubType,
        dressCode: args.dressCode,
        dressCodeDetails: args.dressCodeDetails,
        beginnerFriendly: args.beginnerFriendly,
        hasBeginnerLesson: args.hasBeginnerLesson,
        beginnerLessonTime: args.beginnerLessonTime,
        // Hotel Block (for out-of-town guests)
        hotelBlock: args.hotelBlock,
        // PRODUCTION: Create events as DRAFT by default
        // Organizers must explicitly publish events after setup
        status: "DRAFT",
        capacity: args.capacity,
        paymentModelSelected: false,
        ticketsVisible: false,
        allowWaitlist: false,
        allowTransfers: false,
        maxTicketsPerOrder: 10,
        minTicketsPerOrder: 1,
        socialShareCount: 0,
        ...getTimestamps(),
      });

      // CHECK IF THIS IS USER'S FIRST EVENT - GRANT 1000 FREE CREDITS
      const existingEvents = await ctx.db
        .query("events")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .collect();

      const isFirstEvent = existingEvents.length === 1; // Just created their first event

      if (isFirstEvent) {
        // Check if credits already exist
        const existingCredits = await ctx.db
          .query("organizerCredits")
          .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
          .first();

        if (!existingCredits) {
          // Grant 1000 FREE credits for first-time organizer (FIRST EVENT ONLY)
          const now = Date.now();
          await ctx.db.insert("organizerCredits", {
            organizerId: user._id,
            creditsTotal: 1000,
            creditsUsed: 0,
            creditsRemaining: 1000,
            firstEventFreeUsed: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // AUTO-ASSIGN GLOBAL STAFF: Find all global staff (eventId=null) with autoAssignToNewEvents=true
      const globalStaff = await ctx.db
        .query("eventStaff")
        .filter((q) =>
          q.and(
            q.eq(q.field("organizerId"), user._id),
            q.eq(q.field("eventId"), undefined),
            q.eq(q.field("isActive"), true),
            q.eq(q.field("autoAssignToNewEvents"), true)
          )
        )
        .collect();

      // Clone each global staff member to this new event
      for (const staff of globalStaff) {
        // Generate new unique referral code for this event instance
        const namePart = staff.name
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 6)
          .toUpperCase();
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        let referralCode = `${namePart}${randomPart}`;

        let attempts = 0;
        while (attempts < 10) {
          const existing = await ctx.db
            .query("eventStaff")
            .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
            .first();
          if (!existing) break;
          referralCode = `${namePart}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          attempts++;
        }

        // Clone staff to new event
        const newStaffId = await ctx.db.insert("eventStaff", {
          eventId, // Assign to new event
          organizerId: staff.organizerId,
          staffUserId: staff.staffUserId,
          email: staff.email,
          name: staff.name,
          phone: staff.phone,
          role: staff.role,
          canScan: staff.canScan,
          commissionType: staff.commissionType,
          commissionValue: staff.commissionValue,
          commissionPercent: staff.commissionPercent,
          commissionEarned: 0, // Reset for new event
          allocatedTickets: 0, // Start at 0, organizer will allocate
          cashCollected: 0,
          isActive: true,
          ticketsSold: 0, // Reset for new event
          referralCode,
          // Hierarchy fields - preserve from global staff
          assignedByStaffId: undefined,
          hierarchyLevel: staff.hierarchyLevel || 1,
          canAssignSubSellers: staff.canAssignSubSellers,
          maxSubSellers: staff.maxSubSellers,
          parentCommissionPercent: staff.parentCommissionPercent,
          subSellerCommissionPercent: staff.subSellerCommissionPercent,
          autoAssignToNewEvents: staff.autoAssignToNewEvents,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // AUTO-ASSIGN SUB-SELLERS: If this staff has sub-sellers with autoAssignToNewEvents=true, clone them too
        await autoAssignSubSellers(ctx, staff._id, newStaffId, eventId, user._id);
      }

      return eventId;
    } catch (error) {
      console.error("[createEvent] Error:", error);
      throw error;
    }
  },
});

/**
 * Create an event on behalf of another user (Admin-only)
 * Admins cannot create events as themselves - they must specify an owner.
 * This is used when admin needs to help a customer create an event.
 */
export const createEventOnBehalfOf = mutation({
  args: {
    ownerId: v.id("users"), // REQUIRED - the actual owner of the event
    name: v.string(),
    eventType: v.union(
      v.literal("TICKETED_EVENT"),
      v.literal("FREE_EVENT"),
      v.literal("SAVE_THE_DATE"),
      v.literal("SEATED_EVENT"),
      v.literal("CLASS")
    ),
    description: v.string(),
    categories: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    timezone: v.string(),
    eventDateLiteral: v.optional(v.string()),
    eventTimeLiteral: v.optional(v.string()),
    eventTimezone: v.optional(v.string()),
    location: v.object({
      venueName: v.optional(v.string()),
      address: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zipCode: v.optional(v.string()),
      country: v.string(),
    }),
    capacity: v.optional(v.number()),
    doorPrice: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.id("_storage"))),
    classDays: v.optional(v.array(v.number())),
    classLevel: v.optional(v.string()),
    duration: v.optional(v.number()),
    seriesId: v.optional(v.string()),
    seriesPosition: v.optional(v.number()),
    eventSubType: v.optional(
      v.union(
        v.literal("weekender"),
        v.literal("set"),
        v.literal("ball"),
        v.literal("workshop"),
        v.literal("social")
      )
    ),
    dressCode: v.optional(
      v.union(
        v.literal("all_white"),
        v.literal("black_tie"),
        v.literal("stepping_attire"),
        v.literal("casual"),
        v.literal("theme")
      )
    ),
    dressCodeDetails: v.optional(v.string()),
    beginnerFriendly: v.optional(v.boolean()),
    hasBeginnerLesson: v.optional(v.boolean()),
    beginnerLessonTime: v.optional(v.string()),
    hotelBlock: v.optional(v.object({
      hotelName: v.string(),
      bookingUrl: v.string(),
      groupCode: v.optional(v.string()),
      rate: v.optional(v.string()),
      cutoffDate: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const admin = await requireAdmin(ctx);
    console.log("[createEventOnBehalfOf] Admin creating event for owner:", args.ownerId);

    // Get the specified owner
    const owner = await ctx.db.get(args.ownerId);
    if (!owner) {
      throw new Error("Specified owner not found");
    }

    // Validate owner has correct role for the event type
    if (args.eventType === "CLASS") {
      if (owner.role !== "instructor") {
        throw new Error(
          "Specified owner must be an instructor to create classes. " +
          "Please create an instructor account for this user first."
        );
      }
    } else {
      if (owner.role !== "organizer") {
        throw new Error(
          "Specified owner must be an organizer to create events. " +
          "Please create an organizer account for this user first."
        );
      }
    }

    // Check if owner can create ticketed events
    if (
      (args.eventType === "TICKETED_EVENT" || args.eventType === "SEATED_EVENT") &&
      owner.canCreateTicketedEvents === false
    ) {
      throw new Error(
        "This user is restricted to creating Save The Date and Free Events only. " +
        "Contact support to upgrade their account for ticketed events."
      );
    }

    // Require event image for ticketed events (optional for CLASS type)
    if (args.eventType !== "CLASS" && !args.imageUrl && (!args.images || args.images.length === 0)) {
      throw new Error(
        "Event image is required. Please upload a professional event image."
      );
    }

    // Create the event with OWNER's ID, not admin's
    const eventId = await ctx.db.insert("events", {
      organizerId: args.ownerId, // Owner's ID, NOT admin's
      organizerName: owner.name || owner.email,
      name: args.name,
      description: args.description,
      eventType: args.eventType,
      categories: args.categories,
      startDate: args.startDate,
      endDate: args.endDate,
      timezone: args.timezone,
      eventDateLiteral: args.eventDateLiteral,
      eventTimeLiteral: args.eventTimeLiteral,
      eventTimezone: args.eventTimezone || args.timezone,
      location: args.location,
      doorPrice: args.doorPrice,
      imageUrl: args.imageUrl,
      images: args.images || [],
      classDays: args.classDays,
      classLevel: args.classLevel,
      duration: args.duration,
      seriesId: args.seriesId,
      seriesPosition: args.seriesPosition,
      eventSubType: args.eventSubType,
      dressCode: args.dressCode,
      dressCodeDetails: args.dressCodeDetails,
      beginnerFriendly: args.beginnerFriendly,
      hasBeginnerLesson: args.hasBeginnerLesson,
      beginnerLessonTime: args.beginnerLessonTime,
      hotelBlock: args.hotelBlock,
      status: "DRAFT",
      capacity: args.capacity,
      paymentModelSelected: false,
      ticketsVisible: false,
      allowWaitlist: false,
      allowTransfers: false,
      maxTicketsPerOrder: 10,
      minTicketsPerOrder: 1,
      socialShareCount: 0,
      ...getTimestamps(),
    });

    // Grant first-event credits to the OWNER (not admin)
    const existingEvents = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.ownerId))
      .collect();

    const isFirstEvent = existingEvents.length === 1;

    if (isFirstEvent) {
      const existingCredits = await ctx.db
        .query("organizerCredits")
        .withIndex("by_organizer", (q) => q.eq("organizerId", args.ownerId))
        .first();

      if (!existingCredits) {
        const now = Date.now();
        await ctx.db.insert("organizerCredits", {
          organizerId: args.ownerId,
          creditsTotal: 1000,
          creditsUsed: 0,
          creditsRemaining: 1000,
          firstEventFreeUsed: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    console.log("[createEventOnBehalfOf] Event created:", eventId, "for owner:", owner.email);
    return eventId;
  },
});

/**
 * Recursively auto-assign sub-sellers when their parent staff is added to an event
 * This maintains the full hierarchy tree
 */
async function autoAssignSubSellers(
  ctx: any,
  originalParentStaffId: Id<"eventStaff">,
  newParentStaffId: Id<"eventStaff">,
  eventId: Id<"events">,
  organizerId: Id<"users">
): Promise<void> {
  // Find all sub-sellers of the original parent staff that have autoAssignToNewEvents=true
  const subSellers = await ctx.db
    .query("eventStaff")
    .withIndex("by_assigned_by", (q: any) => q.eq("assignedByStaffId", originalParentStaffId))
    .filter((q: any) =>
      q.and(q.eq(q.field("isActive"), true), q.eq(q.field("autoAssignToNewEvents"), true))
    )
    .collect();

  for (const subSeller of subSellers) {
    // Generate unique referral code
    const namePart = subSeller.name
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    let referralCode = `${namePart}${randomPart}`;

    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("eventStaff")
        .withIndex("by_referral_code", (q: any) => q.eq("referralCode", referralCode))
        .first();
      if (!existing) break;
      referralCode = `${namePart}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      attempts++;
    }

    // Clone sub-seller to new event
    const newSubSellerId = await ctx.db.insert("eventStaff", {
      eventId,
      organizerId,
      staffUserId: subSeller.staffUserId,
      email: subSeller.email,
      name: subSeller.name,
      phone: subSeller.phone,
      role: subSeller.role,
      canScan: subSeller.canScan,
      commissionType: subSeller.commissionType,
      commissionValue: subSeller.commissionValue,
      commissionPercent: subSeller.commissionPercent,
      commissionEarned: 0,
      allocatedTickets: 0,
      cashCollected: 0,
      isActive: true,
      ticketsSold: 0,
      referralCode,
      // Hierarchy - link to new parent
      assignedByStaffId: newParentStaffId,
      hierarchyLevel: subSeller.hierarchyLevel,
      canAssignSubSellers: subSeller.canAssignSubSellers,
      maxSubSellers: subSeller.maxSubSellers,
      parentCommissionPercent: subSeller.parentCommissionPercent,
      subSellerCommissionPercent: subSeller.subSellerCommissionPercent,
      autoAssignToNewEvents: subSeller.autoAssignToNewEvents,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });


    // Recursively assign this sub-seller's own sub-sellers
    await autoAssignSubSellers(ctx, subSeller._id, newSubSellerId, eventId, organizerId);
  }
}

/**
 * Configure payment for event (simplified wrapper)
 */
export const configurePayment = mutation({
  args: {
    eventId: v.id("events"),
    model: v.union(v.literal("PREPAY"), v.literal("CREDIT_CARD")),
    ticketPrice: v.optional(v.number()),
    platformFeePercent: v.optional(v.number()),
    platformFeeFixed: v.optional(v.number()),
    stripeFeePercent: v.optional(v.number()),
    stripeFeeFixed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // PRODUCTION: Require authentication and event ownership
    const ownership = await requireEventOwnership(ctx, args.eventId);
    const user = ownership.user;
    const event = ownership.event;

    // Check if config already exists
    const existing = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      throw new Error("Payment model already configured for this event");
    }

    // For PREPAY model: Initialize 100 FREE ticket credits for new organizers
    if (args.model === "PREPAY") {
      const credits = await ctx.db
        .query("organizerCredits")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .first();

      if (!credits) {
        await ctx.db.insert("organizerCredits", {
          organizerId: user._id,
          creditsTotal: 1000,
          creditsUsed: 0,
          creditsRemaining: 1000,
          firstEventFreeUsed: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Determine customer payment methods based on connected accounts
    let customerPaymentMethods: ("CASH" | "STRIPE" | "PAYPAL")[] = ["CASH"]; // Cash always available
    if (args.model === "CREDIT_CARD") {
      if (user.stripeConnectedAccountId) {
        customerPaymentMethods.push("STRIPE");
      }
      if (user.paypalMerchantId) {
        customerPaymentMethods.push("PAYPAL");
      }
    }

    // Create payment config
    const configId = await ctx.db.insert("eventPaymentConfig", {
      eventId: args.eventId,
      organizerId: user._id,
      paymentModel: args.model,
      isActive: true,
      activatedAt: Date.now(),
      platformFeePercent: args.platformFeePercent || 0,
      platformFeeFixed: args.platformFeeFixed || 0,
      processingFeePercent: args.stripeFeePercent || 2.9,
      charityDiscount: false,
      lowPriceDiscount: false,
      ticketsAllocated: args.model === "PREPAY" ? 0 : undefined,
      // Copy organizer's payment account IDs for CREDIT_CARD model
      stripeConnectAccountId:
        args.model === "CREDIT_CARD" ? user.stripeConnectedAccountId : undefined,
      paypalMerchantId:
        args.model === "CREDIT_CARD" ? user.paypalMerchantId : undefined,
      customerPaymentMethods,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update event
    await ctx.db.patch(args.eventId, {
      paymentModelSelected: true,
      ticketsVisible: true,
      updatedAt: Date.now(),
    });

    return { configId, success: true };
  },
});

/**
 * Publish an event
 */
export const publishEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Check for ticket tiers - required for ticketed events but optional for CLASSes
    const ticketTiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Classes can be published without tiers (free classes)
    // Ticketed events require at least one tier
    if (ticketTiers.length === 0 && event.eventType !== "CLASS") {
      throw new Error(
        "Cannot publish without ticket/enrollment tiers. Please add at least one pricing tier before publishing."
      );
    }

    await ctx.db.patch(args.eventId, {
      status: "PUBLISHED",
      ticketsVisible: true, // Make tickets visible when publishing
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update event details
 */
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    timezone: v.optional(v.string()),
    eventDateLiteral: v.optional(v.string()),
    eventTimeLiteral: v.optional(v.string()),
    eventTimezone: v.optional(v.string()),
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
    capacity: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.id("_storage"))),
    // Class-specific fields
    classDays: v.optional(v.array(v.number())), // Days of week: 0=Sun, 1=Mon, ... 6=Sat
    classLevel: v.optional(v.string()), // Skill level: Beginner, Intermediate, Advanced
    duration: v.optional(v.number()), // Duration in minutes
    // Class series configuration
    numberOfSessions: v.optional(v.number()),
    classFrequency: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("bi-weekly"),
        v.literal("monthly")
      )
    ),
    seriesPriceCents: v.optional(v.number()),
    doorPriceCents: v.optional(v.number()),
    // Culture-specific fields (Stepping community)
    eventSubType: v.optional(
      v.union(
        v.literal("weekender"),
        v.literal("set"),
        v.literal("ball"),
        v.literal("workshop"),
        v.literal("social")
      )
    ),
    dressCode: v.optional(
      v.union(
        v.literal("all_white"),
        v.literal("black_tie"),
        v.literal("stepping_attire"),
        v.literal("casual"),
        v.literal("theme")
      )
    ),
    dressCodeDetails: v.optional(v.string()),
    beginnerFriendly: v.optional(v.boolean()),
    hasBeginnerLesson: v.optional(v.boolean()),
    beginnerLessonTime: v.optional(v.string()),
    // Hotel Block Information
    hotelBlock: v.optional(v.object({
      hotelName: v.string(),
      bookingUrl: v.string(),
      groupCode: v.optional(v.string()),
      rate: v.optional(v.string()),
      cutoffDate: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
    status: v.optional(
      v.union(
        v.literal("DRAFT"),
        v.literal("PUBLISHED"),
        v.literal("CANCELLED"),
        v.literal("COMPLETED")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Verify event ownership
    const { event } = await requireEventOwnership(ctx, args.eventId);

    // VALIDATION: Ensure event has an image (existing or being added)
    const hasExistingImage = event.imageUrl || (event.images && event.images.length > 0);
    const isAddingImage = args.imageUrl || (args.images && args.images.length > 0);
    const isRemovingImage = args.imageUrl === undefined && args.images && args.images.length === 0;

    if (!hasExistingImage && !isAddingImage) {
      throw new Error(
        "Event image is required. Please upload a professional event image that will be displayed on the event page, checkout, and payment confirmation."
      );
    }

    if (hasExistingImage && isRemovingImage) {
      throw new Error(
        "Cannot remove event image. Events must have an image displayed on the event page, checkout, and payment confirmation."
      );
    }

    // SAFEGUARD: Check if event has any ticket sales
    const hasTicketSales = event.status === "PUBLISHED" && event.eventType === "TICKETED_EVENT";
    let ticketsSold = 0;

    if (hasTicketSales) {
      // Count total tickets sold across all tiers
      const ticketTiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      ticketsSold = ticketTiers.reduce((sum, tier) => sum + tier.sold, 0);
    }

    // RESTRICTION: Prevent date/time changes if tickets have been sold
    if (ticketsSold > 0 && (args.startDate || args.endDate)) {
      throw new Error(
        `Cannot change event date/time after ${ticketsSold} ticket${ticketsSold === 1 ? " has" : "s have"} been sold. ` +
          `This would affect customers who already purchased tickets. ` +
          `If you must reschedule, please cancel this event and create a new one.`
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // ALLOWED: Always allow these edits (even with sales)
    if (args.name) updates.name = args.name;
    if (args.description) updates.description = args.description;
    if (args.categories) updates.categories = args.categories;
    if (args.location) updates.location = args.location;
    // Handle imageUrl - can be set or explicitly cleared
    if (args.imageUrl !== undefined) {
      updates.imageUrl = args.imageUrl;
    }
    if (args.images) {
      updates.images = args.images;
      // Clear imageUrl when uploading new images to storage
      updates.imageUrl = undefined;
    }

    // RESTRICTED: Only allow date changes if no sales
    if (args.startDate && ticketsSold === 0) updates.startDate = args.startDate;
    if (args.endDate && ticketsSold === 0) updates.endDate = args.endDate;

    // ALLOWED: Capacity can increase but not decrease below sold
    if (args.capacity) {
      if (ticketsSold > 0 && args.capacity < ticketsSold) {
        throw new Error(
          `Cannot reduce capacity to ${args.capacity} because ${ticketsSold} tickets have already been sold. ` +
            `Capacity must be at least ${ticketsSold}.`
        );
      }
      updates.capacity = args.capacity;
    }

    // Handle timezone fields
    if (args.timezone) updates.timezone = args.timezone;
    if (args.eventDateLiteral) updates.eventDateLiteral = args.eventDateLiteral;
    if (args.eventTimeLiteral) updates.eventTimeLiteral = args.eventTimeLiteral;
    if (args.eventTimezone) updates.eventTimezone = args.eventTimezone;

    // Handle class-specific fields
    if (args.classDays) updates.classDays = args.classDays;
    if (args.classLevel !== undefined) updates.classLevel = args.classLevel;
    if (args.duration !== undefined) updates.duration = args.duration;

    // Handle class series configuration
    if (args.numberOfSessions !== undefined) updates.numberOfSessions = args.numberOfSessions;
    if (args.classFrequency !== undefined) updates.classFrequency = args.classFrequency;
    if (args.seriesPriceCents !== undefined) updates.seriesPriceCents = args.seriesPriceCents;
    if (args.doorPriceCents !== undefined) updates.doorPriceCents = args.doorPriceCents;

    // Handle culture-specific fields (Stepping community)
    if (args.eventSubType !== undefined) updates.eventSubType = args.eventSubType;
    if (args.dressCode !== undefined) updates.dressCode = args.dressCode;
    if (args.dressCodeDetails !== undefined) updates.dressCodeDetails = args.dressCodeDetails;
    if (args.beginnerFriendly !== undefined) updates.beginnerFriendly = args.beginnerFriendly;
    if (args.hasBeginnerLesson !== undefined) updates.hasBeginnerLesson = args.hasBeginnerLesson;
    if (args.beginnerLessonTime !== undefined) updates.beginnerLessonTime = args.beginnerLessonTime;
    if (args.hotelBlock !== undefined) updates.hotelBlock = args.hotelBlock;

    // Handle status changes
    if (args.status) updates.status = args.status;

    await ctx.db.patch(args.eventId, updates);

    return { success: true };
  },
});

/**
 * Update event status (publish, cancel, complete)
 */
export const updateEventStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("PUBLISHED"),
      v.literal("CANCELLED"),
      v.literal("COMPLETED")
    ),
  },
  handler: async (ctx, args) => {
    // Verify event ownership
    const { event } = await requireEventOwnership(ctx, args.eventId);


    // Update event status
    await ctx.db.patch(args.eventId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // If event is being cancelled or completed, expire unused first-event credits
    if (args.status === "CANCELLED" || args.status === "COMPLETED") {
      try {
        // Call the expiration mutation
        await ctx.scheduler.runAfter(0, internal.events.allocations.expireFirstEventCredits, {
          eventId: args.eventId,
        });
      } catch (error) {
        // Don't fail the status update if credit expiration fails - error logged internally
      }
    }

    return { success: true, newStatus: args.status };
  },
});

/**
 * Claim an event
 * Allows an organizer to take ownership of a claimable event
 */
export const claimEvent = mutation({
  args: {
    eventId: v.id("events"),
    claimCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the event
    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    // Check if event is claimable
    if (!event.isClaimable) {
      throw new Error("This event is not available for claiming");
    }

    // Check if event already has an organizer
    if (event.organizerId) {
      throw new Error("This event has already been claimed");
    }

    // Validate claim code if required
    if (event.claimCode) {
      if (!args.claimCode || args.claimCode !== event.claimCode) {
        throw new Error("Invalid claim code");
      }
    }

    // Get authenticated user to claim the event
    const user = await getCurrentUser(ctx);

    // Claim the event
    await ctx.db.patch(args.eventId, {
      organizerId: user._id,
      organizerName: user.name,
      isClaimable: false,
      claimedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      eventId: args.eventId,
      organizerId: user._id,
    };
  },
});

/**
 * Duplicate an event with all its configurations
 */
export const duplicateEvent = mutation({
  args: {
    eventId: v.id("events"),
    options: v.object({
      copyTickets: v.boolean(),
      copySeating: v.boolean(),
      copyStaff: v.boolean(),
      newName: v.optional(v.string()),
      newDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Verify event ownership
    const { user, event: originalEvent } = await requireEventOwnership(ctx, args.eventId);

    // Create new event with duplicated data
    const newEventData = {
      ...originalEvent,
      _id: undefined, // Remove ID to create new record
      _creationTime: undefined, // Remove system fields
      name: args.options.newName || `${originalEvent.name} (Copy)`,
      startDate: args.options.newDate || originalEvent.startDate,
      status: "DRAFT" as const, // Reset to draft status
      isClaimable: false,
      claimCode: undefined,
      claimedAt: undefined,

      // Reset ticket tracking
      ticketsSold: 0,
      ticketsVisible: originalEvent.ticketsVisible,

      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create the new event
    const newEventId = await ctx.db.insert("events", newEventData);

    // Copy ticket tiers if requested
    if (args.options.copyTickets) {
      const ticketTiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      for (const tier of ticketTiers) {
        const newTierData = {
          ...tier,
          _id: undefined,
          _creationTime: undefined,
          eventId: newEventId,
          sold: 0, // Reset sold count
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const newTierId = await ctx.db.insert("ticketTiers", newTierData);
      }
    }

    // Copy seating chart if requested
    if (args.options.copySeating) {
      const seatingCharts = await ctx.db
        .query("seatingCharts")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      for (const chart of seatingCharts) {
        const newChartData = {
          ...chart,
          _id: undefined,
          _creationTime: undefined,
          eventId: newEventId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const newChartId = await ctx.db.insert("seatingCharts", newChartData);

        // Copy all seat reservations for this chart
        const reservations = await ctx.db
          .query("seatReservations")
          .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
          .collect();

        // Note: We're not copying seat reservations as they should start fresh for the new event
      }
    }

    // Copy staff if requested
    if (args.options.copyStaff) {
      const eventStaff = await ctx.db
        .query("eventStaff")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      for (const staff of eventStaff) {
        const newStaffData = {
          ...staff,
          _id: undefined,
          _creationTime: undefined,
          eventId: newEventId,
          allocatedTickets: 0, // Reset allocations
          ticketsSold: 0,
          totalCommissionEarned: 0,
          totalCashCollected: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const newStaffId = await ctx.db.insert("eventStaff", newStaffData);
      }
    }

    // Copy payment configuration
    const paymentConfig = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (paymentConfig) {
      const newPaymentConfig = {
        ...paymentConfig,
        _id: undefined,
        _creationTime: undefined,
        eventId: newEventId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await ctx.db.insert("eventPaymentConfig", newPaymentConfig);
    }

    return {
      success: true,
      originalEventId: args.eventId,
      newEventId,
      duplicatedItems: {
        tickets: args.options.copyTickets,
        seating: args.options.copySeating,
        staff: args.options.copyStaff,
      },
    };
  },
});

/**
 * Bulk delete events
 * Deletes multiple events and all associated data (tickets, staff, bundles, etc.)
 */
export const bulkDeleteEvents = mutation({
  args: {
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args) => {

    // Get authenticated user
    const user = await getCurrentUser(ctx);

    const deletedEvents: string[] = [];
    const failedEvents: Array<{ eventId: string; reason: string }> = [];

    // Process each event
    for (const eventId of args.eventIds) {
      try {
        // Verify ownership (handles both organizers and admins)
        let event;
        try {
          const ownership = await requireEventOwnership(ctx, eventId);
          event = ownership.event;
        } catch (error) {
          failedEvents.push({
            eventId,
            reason: error instanceof Error ? error.message : "Not authorized to delete this event",
          });
          continue;
        }

        // Check if event has any tickets sold
        const ticketTiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();

        const totalTicketsSold = ticketTiers.reduce((sum, tier) => sum + tier.sold, 0);

        if (totalTicketsSold > 0) {
          failedEvents.push({
            eventId,
            reason: `Cannot delete - ${totalTicketsSold} ticket${totalTicketsSold === 1 ? " has" : "s have"} been sold`,
          });
          continue;
        }

        // Delete all related data

        // Delete ticket tiers
        for (const tier of ticketTiers) {
          await ctx.db.delete(tier._id);
        }

        // Delete event staff
        const eventStaff = await ctx.db
          .query("eventStaff")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();
        for (const staff of eventStaff) {
          await ctx.db.delete(staff._id);
        }

        // Delete ticket bundles
        const bundles = await ctx.db
          .query("ticketBundles")
          .filter((q) => q.eq(q.field("eventId"), eventId))
          .collect();
        for (const bundle of bundles) {
          await ctx.db.delete(bundle._id);
        }

        // Delete seating charts
        const seatingCharts = await ctx.db
          .query("seatingCharts")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();
        for (const chart of seatingCharts) {
          await ctx.db.delete(chart._id);
        }

        // Delete seat reservations
        const seatReservations = await ctx.db
          .query("seatReservations")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();
        for (const reservation of seatReservations) {
          await ctx.db.delete(reservation._id);
        }

        // Delete payment config
        const paymentConfig = await ctx.db
          .query("eventPaymentConfig")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .first();
        if (paymentConfig) {
          await ctx.db.delete(paymentConfig._id);
        }

        // Delete tickets (shouldn't be any if no sales, but clean up just in case)
        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();
        for (const ticket of tickets) {
          await ctx.db.delete(ticket._id);
        }

        // Delete orders (shouldn't be any if no sales, but clean up just in case)
        const orders = await ctx.db
          .query("orders")
          .filter((q) => q.eq(q.field("eventId"), eventId))
          .collect();
        for (const order of orders) {
          await ctx.db.delete(order._id);
        }

        // Finally, delete the event itself
        await ctx.db.delete(eventId);
        deletedEvents.push(eventId);
      } catch (error) {
        console.error(`[bulkDeleteEvents] Error deleting event ${eventId}:`, error);
        failedEvents.push({
          eventId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }


    return {
      success: true,
      deletedCount: deletedEvents.length,
      failedCount: failedEvents.length,
      deletedEvents,
      failedEvents,
    };
  },
});

/**
 * Delete an event (only if it hasn't started yet)
 */
export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get the event
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if event has already started
    const now = Date.now();
    if (event.startDate && event.startDate < now) {
      throw new Error("Cannot delete an event that has already started");
    }

    // Check if there are any sold tickets
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    if (tickets.length > 0) {
      throw new Error("Cannot delete an event with sold tickets. Please cancel the event instead.");
    }

    // Check if there are any active orders (enrollments)
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const activeOrders = orders.filter(
      (order) => !["CANCELLED", "FAILED", "REFUNDED"].includes(order.status)
    );

    if (activeOrders.length > 0) {
      throw new Error(
        `Cannot delete an event with ${activeOrders.length} active enrollment(s). Please cancel or refund all orders first.`
      );
    }

    // Delete related ticket tiers
    const ticketTiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const tier of ticketTiers) {
      await ctx.db.delete(tier._id);
    }

    // Delete the event
    await ctx.db.delete(args.eventId);

    return { success: true, eventId: args.eventId };
  },
});

/**
 * Admin-only: Update event dates (for testing purposes)
 */
export const updateEventDates = internalMutation({
  args: {
    eventId: v.id("events"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    await ctx.db.patch(args.eventId, {
      startDate: args.startDate,
      endDate: args.endDate,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Event dates updated" };
  },
});

/**
 * Delete an entire series of recurring classes
 * Deletes ALL classes that share the same seriesId
 */
export const deleteEntireSeries = mutation({
  args: {
    seriesId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    // Find all classes in this series
    const seriesClasses = await ctx.db
      .query("events")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect();

    if (seriesClasses.length === 0) {
      throw new Error("No classes found in this series");
    }

    // Verify ownership of the first class (all should have same organizer)
    const firstClass = seriesClasses[0];
    if (firstClass.organizerId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to delete this series");
    }

    // Check for any active enrollments across the series
    let totalEnrollments = 0;
    const classesWithEnrollments: string[] = [];

    for (const classItem of seriesClasses) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", classItem._id))
        .collect();

      const activeOrders = orders.filter(
        (order) => !["CANCELLED", "FAILED", "REFUNDED"].includes(order.status)
      );

      if (activeOrders.length > 0) {
        totalEnrollments += activeOrders.length;
        classesWithEnrollments.push(classItem.name);
      }
    }

    if (totalEnrollments > 0) {
      throw new Error(
        `Cannot delete series: ${totalEnrollments} active enrollment(s) found. ` +
        `Please cancel or refund all enrollments first.`
      );
    }

    // Delete all classes in the series
    let deletedCount = 0;
    for (const classItem of seriesClasses) {
      // Delete related ticket tiers
      const ticketTiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", classItem._id))
        .collect();

      for (const tier of ticketTiers) {
        await ctx.db.delete(tier._id);
      }

      // Delete the class
      await ctx.db.delete(classItem._id);
      deletedCount++;
    }

    return {
      success: true,
      deletedCount,
      seriesId: args.seriesId,
    };
  },
});

/**
 * Delete a class and all future classes in the same series
 * Useful for "Delete this and all future" action
 */
export const deleteSeriesFuture = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    // Get the reference class
    const referenceClass = await ctx.db.get(args.eventId);
    if (!referenceClass) {
      throw new Error("Class not found");
    }

    // Verify ownership
    if (referenceClass.organizerId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to delete this class");
    }

    // If not part of a series, just delete this single class
    if (!referenceClass.seriesId) {
      // Check for enrollments
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      const activeOrders = orders.filter(
        (order) => !["CANCELLED", "FAILED", "REFUNDED"].includes(order.status)
      );

      if (activeOrders.length > 0) {
        throw new Error(
          `Cannot delete: ${activeOrders.length} active enrollment(s). Please cancel or refund first.`
        );
      }

      // Delete ticket tiers
      const ticketTiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      for (const tier of ticketTiers) {
        await ctx.db.delete(tier._id);
      }

      await ctx.db.delete(args.eventId);

      return {
        success: true,
        deletedCount: 1,
        seriesId: null,
      };
    }

    // Find all classes in the series that are on or after this class's date
    const seriesClasses = await ctx.db
      .query("events")
      .withIndex("by_series", (q) => q.eq("seriesId", referenceClass.seriesId))
      .collect();

    // Filter to only include this class and future ones
    const classesToDelete = seriesClasses.filter(
      (c) => c.startDate && referenceClass.startDate && c.startDate >= referenceClass.startDate
    );

    // Check for active enrollments
    let totalEnrollments = 0;
    for (const classItem of classesToDelete) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", classItem._id))
        .collect();

      const activeOrders = orders.filter(
        (order) => !["CANCELLED", "FAILED", "REFUNDED"].includes(order.status)
      );

      totalEnrollments += activeOrders.length;
    }

    if (totalEnrollments > 0) {
      throw new Error(
        `Cannot delete: ${totalEnrollments} active enrollment(s) in this class or future classes. ` +
        `Please cancel or refund all enrollments first.`
      );
    }

    // Delete the classes
    let deletedCount = 0;
    for (const classItem of classesToDelete) {
      // Delete ticket tiers
      const ticketTiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event", (q) => q.eq("eventId", classItem._id))
        .collect();

      for (const tier of ticketTiers) {
        await ctx.db.delete(tier._id);
      }

      await ctx.db.delete(classItem._id);
      deletedCount++;
    }

    return {
      success: true,
      deletedCount,
      seriesId: referenceClass.seriesId,
    };
  },
});

/**
 * Bulk publish events
 * Sets status to PUBLISHED for all provided event IDs
 */
export const bulkPublishEvents = mutation({
  args: {
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    const publishedEvents: string[] = [];
    const failedEvents: Array<{ eventId: string; reason: string }> = [];

    for (const eventId of args.eventIds) {
      try {
        // Verify ownership
        let event;
        try {
          const ownership = await requireEventOwnership(ctx, eventId);
          event = ownership.event;
        } catch (error) {
          failedEvents.push({
            eventId,
            reason: error instanceof Error ? error.message : "Not authorized to publish this event",
          });
          continue;
        }

        // Skip if already published
        if (event.status === "PUBLISHED") {
          publishedEvents.push(eventId);
          continue;
        }

        // Check for ticket tiers - required for ticketed events but optional for CLASSes
        const ticketTiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();

        // Classes can be published without tiers (free classes)
        // Ticketed events require at least one tier
        if (ticketTiers.length === 0 && event.eventType !== "CLASS") {
          failedEvents.push({
            eventId,
            reason: "Cannot publish without ticket/enrollment tiers",
          });
          continue;
        }

        // Publish the event
        await ctx.db.patch(eventId, {
          status: "PUBLISHED",
          ticketsVisible: true,
          updatedAt: Date.now(),
        });

        publishedEvents.push(eventId);
      } catch (error) {
        failedEvents.push({
          eventId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      publishedCount: publishedEvents.length,
      failedCount: failedEvents.length,
      failedEvents,
    };
  },
});

/**
 * Bulk unpublish events
 * Sets status to DRAFT for all provided event IDs
 */
export const bulkUnpublishEvents = mutation({
  args: {
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);

    const unpublishedEvents: string[] = [];
    const failedEvents: Array<{ eventId: string; reason: string }> = [];

    for (const eventId of args.eventIds) {
      try {
        // Verify ownership
        let event;
        try {
          const ownership = await requireEventOwnership(ctx, eventId);
          event = ownership.event;
        } catch (error) {
          failedEvents.push({
            eventId,
            reason: error instanceof Error ? error.message : "Not authorized to unpublish this event",
          });
          continue;
        }

        // Skip if already draft
        if (event.status === "DRAFT") {
          unpublishedEvents.push(eventId);
          continue;
        }

        // Unpublish the event (set to DRAFT)
        await ctx.db.patch(eventId, {
          status: "DRAFT",
          updatedAt: Date.now(),
        });

        unpublishedEvents.push(eventId);
      } catch (error) {
        failedEvents.push({
          eventId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      unpublishedCount: unpublishedEvents.length,
      failedCount: failedEvents.length,
      failedEvents,
    };
  },
});
