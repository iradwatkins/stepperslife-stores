import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Create a carpool offer
export const createCarpoolOffer = mutation({
  args: {
    eventId: v.id("events"),
    departureCity: v.string(),
    departureState: v.string(),
    departureDate: v.number(),
    departureTime: v.string(),
    seatsAvailable: v.number(),
    contributionRequested: v.optional(v.string()),
    contactMethod: v.union(
      v.literal("app_message"),
      v.literal("phone"),
      v.literal("email")
    ),
    contactInfo: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to offer a ride");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user already has an active offer for this event
    const existingOffer = await ctx.db
      .query("carpoolOffers")
      .withIndex("by_event", (q) =>
        q.eq("eventId", args.eventId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingOffer) {
      throw new Error("You already have an active carpool offer for this event");
    }

    const carpoolId = await ctx.db.insert("carpoolOffers", {
      eventId: args.eventId,
      userId: user._id,
      departureCity: args.departureCity,
      departureState: args.departureState,
      departureDate: args.departureDate,
      departureTime: args.departureTime,
      seatsAvailable: args.seatsAvailable,
      seatsTaken: 0,
      contributionRequested: args.contributionRequested,
      contactMethod: args.contactMethod,
      contactInfo: args.contactInfo,
      notes: args.notes,
      status: "active",
      createdAt: Date.now(),
    });

    return carpoolId;
  },
});

// Update a carpool offer
export const updateCarpoolOffer = mutation({
  args: {
    carpoolId: v.id("carpoolOffers"),
    departureCity: v.optional(v.string()),
    departureState: v.optional(v.string()),
    departureDate: v.optional(v.number()),
    departureTime: v.optional(v.string()),
    seatsAvailable: v.optional(v.number()),
    contributionRequested: v.optional(v.string()),
    contactMethod: v.optional(
      v.union(v.literal("app_message"), v.literal("phone"), v.literal("email"))
    ),
    contactInfo: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    const carpool = await ctx.db.get(args.carpoolId);
    if (!carpool) {
      throw new Error("Carpool offer not found");
    }

    if (carpool.userId !== user._id) {
      throw new Error("You can only edit your own carpool offers");
    }

    const { carpoolId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    // Only include defined fields
    if (updates.departureCity !== undefined)
      cleanUpdates.departureCity = updates.departureCity;
    if (updates.departureState !== undefined)
      cleanUpdates.departureState = updates.departureState;
    if (updates.departureDate !== undefined)
      cleanUpdates.departureDate = updates.departureDate;
    if (updates.departureTime !== undefined)
      cleanUpdates.departureTime = updates.departureTime;
    if (updates.seatsAvailable !== undefined)
      cleanUpdates.seatsAvailable = updates.seatsAvailable;
    if (updates.contributionRequested !== undefined)
      cleanUpdates.contributionRequested = updates.contributionRequested;
    if (updates.contactMethod !== undefined)
      cleanUpdates.contactMethod = updates.contactMethod;
    if (updates.contactInfo !== undefined)
      cleanUpdates.contactInfo = updates.contactInfo;
    if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;

    await ctx.db.patch(args.carpoolId, cleanUpdates);

    return args.carpoolId;
  },
});

// Cancel a carpool offer
export const cancelCarpoolOffer = mutation({
  args: { carpoolId: v.id("carpoolOffers") },
  handler: async (ctx, { carpoolId }) => {
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

    const carpool = await ctx.db.get(carpoolId);
    if (!carpool) {
      throw new Error("Carpool offer not found");
    }

    if (carpool.userId !== user._id) {
      throw new Error("You can only cancel your own carpool offers");
    }

    await ctx.db.patch(carpoolId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // Cancel all pending requests
    const requests = await ctx.db
      .query("carpoolRequests")
      .withIndex("by_carpool_status", (q) =>
        q.eq("carpoolOfferId", carpoolId).eq("status", "pending")
      )
      .collect();

    for (const request of requests) {
      await ctx.db.patch(request._id, {
        status: "cancelled",
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Request to join a carpool
export const requestRide = mutation({
  args: {
    carpoolId: v.id("carpoolOffers"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, { carpoolId, message }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to request a ride");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const carpool = await ctx.db.get(carpoolId);
    if (!carpool) {
      throw new Error("Carpool offer not found");
    }

    if (carpool.status !== "active") {
      throw new Error("This carpool offer is no longer available");
    }

    if (carpool.userId === user._id) {
      throw new Error("You cannot request a ride from your own carpool");
    }

    // Check if user already has a request
    const existingRequest = await ctx.db
      .query("carpoolRequests")
      .withIndex("by_carpool", (q) => q.eq("carpoolOfferId", carpoolId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingRequest) {
      throw new Error("You have already requested a ride for this carpool");
    }

    const requestId = await ctx.db.insert("carpoolRequests", {
      carpoolOfferId: carpoolId,
      userId: user._id,
      eventId: carpool.eventId,
      message,
      status: "pending",
      createdAt: Date.now(),
    });

    return requestId;
  },
});

// Accept a ride request (driver action)
export const acceptRideRequest = mutation({
  args: { requestId: v.id("carpoolRequests") },
  handler: async (ctx, { requestId }) => {
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

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    const carpool = await ctx.db.get(request.carpoolOfferId);
    if (!carpool) {
      throw new Error("Carpool offer not found");
    }

    if (carpool.userId !== user._id) {
      throw new Error("Only the driver can accept requests");
    }

    if (request.status !== "pending") {
      throw new Error("This request is no longer pending");
    }

    // Check if there are still seats available
    const seatsTaken = carpool.seatsTaken || 0;
    if (seatsTaken >= carpool.seatsAvailable) {
      throw new Error("No seats available");
    }

    // Accept the request
    await ctx.db.patch(requestId, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    // Update seats taken
    const newSeatsTaken = seatsTaken + 1;
    await ctx.db.patch(carpool._id, {
      seatsTaken: newSeatsTaken,
      status: newSeatsTaken >= carpool.seatsAvailable ? "full" : "active",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Decline a ride request (driver action)
export const declineRideRequest = mutation({
  args: { requestId: v.id("carpoolRequests") },
  handler: async (ctx, { requestId }) => {
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

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    const carpool = await ctx.db.get(request.carpoolOfferId);
    if (!carpool) {
      throw new Error("Carpool offer not found");
    }

    if (carpool.userId !== user._id) {
      throw new Error("Only the driver can decline requests");
    }

    if (request.status !== "pending") {
      throw new Error("This request is no longer pending");
    }

    await ctx.db.patch(requestId, {
      status: "declined",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Cancel a ride request (rider action)
export const cancelRideRequest = mutation({
  args: { requestId: v.id("carpoolRequests") },
  handler: async (ctx, { requestId }) => {
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

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.userId !== user._id) {
      throw new Error("You can only cancel your own requests");
    }

    const wasAccepted = request.status === "accepted";

    await ctx.db.patch(requestId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // If request was accepted, free up the seat
    if (wasAccepted) {
      const carpool = await ctx.db.get(request.carpoolOfferId);
      if (carpool) {
        const newSeatsTaken = Math.max(0, (carpool.seatsTaken || 0) - 1);
        await ctx.db.patch(carpool._id, {
          seatsTaken: newSeatsTaken,
          status: "active", // Reopen if was full
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});
