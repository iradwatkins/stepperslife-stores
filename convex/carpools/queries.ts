import { query } from "../_generated/server";
import { v } from "convex/values";

// Get all active carpool offers for an event
export const getEventCarpools = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const offers = await ctx.db
      .query("carpoolOffers")
      .withIndex("by_event", (q) =>
        q.eq("eventId", eventId).eq("status", "active")
      )
      .order("asc")
      .collect();

    // Get user info for each offer
    const offersWithUsers = await Promise.all(
      offers.map(async (offer) => {
        const user = await ctx.db.get(offer.userId);
        return {
          ...offer,
          driverName: user?.name || "Anonymous",
          driverImage: user?.image,
        };
      })
    );

    // Group by departure city
    const grouped = offersWithUsers.reduce(
      (acc, offer) => {
        const key = `${offer.departureCity}, ${offer.departureState}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(offer);
        return acc;
      },
      {} as Record<string, typeof offersWithUsers>
    );

    return {
      offers: offersWithUsers,
      grouped,
      totalOffers: offersWithUsers.length,
      totalSeats: offersWithUsers.reduce(
        (sum, o) => sum + o.seatsAvailable - (o.seatsTaken || 0),
        0
      ),
    };
  },
});

// Get a single carpool offer with details
export const getCarpoolOffer = query({
  args: { carpoolId: v.id("carpoolOffers") },
  handler: async (ctx, { carpoolId }) => {
    const offer = await ctx.db.get(carpoolId);
    if (!offer) return null;

    const user = await ctx.db.get(offer.userId);
    const event = await ctx.db.get(offer.eventId);

    // Get pending requests count
    const requests = await ctx.db
      .query("carpoolRequests")
      .withIndex("by_carpool_status", (q) =>
        q.eq("carpoolOfferId", carpoolId).eq("status", "pending")
      )
      .collect();

    return {
      ...offer,
      driverName: user?.name || "Anonymous",
      driverImage: user?.image,
      eventName: event?.name,
      pendingRequests: requests.length,
    };
  },
});

// Get carpool offers created by a user
export const getUserCarpoolOffers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return [];

    const offers = await ctx.db
      .query("carpoolOffers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Add event info and request counts
    const offersWithDetails = await Promise.all(
      offers.map(async (offer) => {
        const event = await ctx.db.get(offer.eventId);
        const requests = await ctx.db
          .query("carpoolRequests")
          .withIndex("by_carpool", (q) => q.eq("carpoolOfferId", offer._id))
          .collect();

        return {
          ...offer,
          eventName: event?.name,
          eventDate: event?.startDate,
          pendingRequests: requests.filter((r) => r.status === "pending").length,
          acceptedRequests: requests.filter((r) => r.status === "accepted").length,
        };
      })
    );

    return offersWithDetails;
  },
});

// Get carpool requests for a user (as rider)
export const getUserCarpoolRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return [];

    const requests = await ctx.db
      .query("carpoolRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Add carpool and event details
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const carpool = await ctx.db.get(request.carpoolOfferId);
        const event = carpool ? await ctx.db.get(carpool.eventId) : null;
        const driver = carpool ? await ctx.db.get(carpool.userId) : null;

        return {
          ...request,
          carpool: carpool
            ? {
                departureCity: carpool.departureCity,
                departureState: carpool.departureState,
                departureDate: carpool.departureDate,
                departureTime: carpool.departureTime,
                contributionRequested: carpool.contributionRequested,
              }
            : null,
          eventName: event?.name,
          eventDate: event?.startDate,
          driverName: driver?.name || "Anonymous",
        };
      })
    );

    return requestsWithDetails;
  },
});

// Get requests for a carpool offer (for driver to manage)
export const getCarpoolRequests = query({
  args: { carpoolId: v.id("carpoolOffers") },
  handler: async (ctx, { carpoolId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { authorized: false, requests: [] };

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return { authorized: false, requests: [] };

    // Check if user owns this carpool
    const carpool = await ctx.db.get(carpoolId);
    if (!carpool || carpool.userId !== user._id) {
      return { authorized: false, requests: [] };
    }

    const requests = await ctx.db
      .query("carpoolRequests")
      .withIndex("by_carpool", (q) => q.eq("carpoolOfferId", carpoolId))
      .order("desc")
      .collect();

    // Add requester info
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db.get(request.userId);
        return {
          ...request,
          requesterName: requester?.name || "Anonymous",
          requesterImage: requester?.image,
          requesterEmail: requester?.email,
        };
      })
    );

    return { authorized: true, requests: requestsWithUsers };
  },
});
