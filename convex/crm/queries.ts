import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all contacts with pagination
 */
export const getAllContacts = query({
  args: {
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let contacts = await ctx.db.query("eventContacts").order("desc").take(limit);

    // Filter by search term if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      contacts = contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(searchLower) ||
          contact.phoneNumber?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.organization?.toLowerCase().includes(searchLower)
      );
    }

    // Get event names for each contact
    const contactsWithEvents = await Promise.all(
      contacts.map(async (contact) => {
        let eventName = null;
        if (contact.eventId) {
          const event = await ctx.db.get(contact.eventId);
          eventName = event?.name || null;
        }
        return {
          ...contact,
          eventName,
        };
      })
    );

    return contactsWithEvents;
  },
});

/**
 * Get a single contact by ID
 */
export const getContactById = query({
  args: {
    contactId: v.id("eventContacts"),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return null;

    // Get event details if linked
    let event = null;
    if (contact.eventId) {
      event = await ctx.db.get(contact.eventId);
    }

    return {
      ...contact,
      event,
    };
  },
});

/**
 * Get all contacts for a specific event
 */
export const getContactsByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("eventContacts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return contacts;
  },
});

/**
 * Get all contacts for a specific flyer
 */
export const getContactsByFlyer = query({
  args: {
    flyerId: v.id("uploadedFlyers"),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("eventContacts")
      .withIndex("by_flyer", (q) => q.eq("flyerId", args.flyerId))
      .collect();

    return contacts;
  },
});

/**
 * Search contacts by name, phone, or email
 */
export const searchContacts = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const searchLower = args.query.toLowerCase();

    const allContacts = await ctx.db.query("eventContacts").order("desc").take(200); // Take more to search through

    const filtered = allContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchLower) ||
        contact.phoneNumber?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.organization?.toLowerCase().includes(searchLower) ||
        contact.role?.toLowerCase().includes(searchLower)
    );

    return filtered.slice(0, limit);
  },
});

/**
 * Get CRM statistics
 */
export const getCRMStats = query({
  args: {},
  handler: async (ctx) => {
    const allContacts = await ctx.db.query("eventContacts").collect();

    const totalContacts = allContacts.length;
    const extractedFromFlyers = allContacts.filter((c) => c.extractedFrom === "FLYER").length;
    const manuallyAdded = allContacts.filter((c) => c.extractedFrom === "MANUAL").length;
    const withPhoneNumber = allContacts.filter((c) => c.phoneNumber).length;
    const withEmail = allContacts.filter((c) => c.email).length;
    const linkedToEvents = allContacts.filter((c) => c.eventId).length;

    return {
      totalContacts,
      extractedFromFlyers,
      manuallyAdded,
      withPhoneNumber,
      withEmail,
      linkedToEvents,
    };
  },
});

/**
 * Get recent contacts
 */
export const getRecentContacts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const contacts = await ctx.db
      .query("eventContacts")
      .withIndex("by_created")
      .order("desc")
      .take(limit);

    return contacts;
  },
});
