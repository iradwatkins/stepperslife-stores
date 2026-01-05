import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Create a new contact
 */
export const createContact = mutation({
  args: {
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    organization: v.optional(v.string()),
    socialMedia: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        twitter: v.optional(v.string()),
      })
    ),
    eventId: v.optional(v.id("events")),
    flyerId: v.optional(v.id("uploadedFlyers")),
    extractedFrom: v.union(v.literal("FLYER"), v.literal("MANUAL")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const contactId = await ctx.db.insert("eventContacts", {
      name: args.name,
      phoneNumber: args.phoneNumber,
      email: args.email,
      role: args.role,
      organization: args.organization,
      socialMedia: args.socialMedia,
      eventId: args.eventId,
      flyerId: args.flyerId,
      extractedFrom: args.extractedFrom,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, contactId };
  },
});

/**
 * Update an existing contact
 */
export const updateContact = mutation({
  args: {
    contactId: v.id("eventContacts"),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    organization: v.optional(v.string()),
    socialMedia: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        twitter: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contactId, ...updates } = args;

    await ctx.db.patch(contactId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a contact
 */
export const deleteContact = mutation({
  args: {
    contactId: v.id("eventContacts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.contactId);
    return { success: true };
  },
});

/**
 * Link a contact to an event
 */
export const linkContactToEvent = mutation({
  args: {
    contactId: v.id("eventContacts"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.contactId, {
      eventId: args.eventId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Bulk create contacts from flyer extraction
 */
export const bulkCreateContacts = mutation({
  args: {
    contacts: v.array(
      v.object({
        name: v.string(),
        phoneNumber: v.optional(v.string()),
        email: v.optional(v.string()),
        role: v.optional(v.string()),
        organization: v.optional(v.string()),
        socialMedia: v.optional(
          v.object({
            instagram: v.optional(v.string()),
            facebook: v.optional(v.string()),
            twitter: v.optional(v.string()),
          })
        ),
      })
    ),
    flyerId: v.id("uploadedFlyers"),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const contactIds = [];

    for (const contact of args.contacts) {
      // Check if contact already exists (by name + phone)
      const existing = contact.phoneNumber
        ? await ctx.db
            .query("eventContacts")
            .withIndex("by_phone", (q) => q.eq("phoneNumber", contact.phoneNumber))
            .filter((q) => q.eq(q.field("name"), contact.name))
            .first()
        : null;

      if (existing) {
        // Update existing contact
        await ctx.db.patch(existing._id, {
          ...contact,
          eventId: args.eventId || existing.eventId,
          updatedAt: now,
        });
        contactIds.push(existing._id);
      } else {
        // Create new contact
        const contactId = await ctx.db.insert("eventContacts", {
          ...contact,
          flyerId: args.flyerId,
          eventId: args.eventId,
          extractedFrom: "FLYER",
          createdAt: now,
          updatedAt: now,
        });
        contactIds.push(contactId);
      }
    }

    return { success: true, contactIds, created: contactIds.length };
  },
});

/**
 * Clear all CRM contacts (for resetting seed/fake data)
 */
export const clearAllContacts = mutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("eventContacts").collect();
    let deletedCount = 0;

    for (const contact of contacts) {
      await ctx.db.delete(contact._id);
      deletedCount++;
    }

    return { success: true, deletedCount };
  },
});
