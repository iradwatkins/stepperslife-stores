/**
 * Admin Cleanup Utilities
 *
 * DANGER: These mutations will permanently delete data!
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";

/**
 * TEMPORARY: Callable complete reset - DELETE AFTER USE
 * Run from: npx convex run admin/cleanup:resetAll '{"keepUserEmail": "thestepperslife@gmail.com"}'
 */
export const resetAll = mutation({
  args: {
    keepUserEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Must be admin to reset database");
    }

    const results = {
      users: 0,
      events: 0,
      tickets: 0,
      orders: 0,
      staff: 0,
      bundles: 0,
      ticketTiers: 0,
      paymentConfigs: 0,
    };

    // Delete tickets
    const allTickets = await ctx.db.query("tickets").collect();
    for (const ticket of allTickets) {
      await ctx.db.delete(ticket._id);
      results.tickets++;
    }

    // Delete orders
    const allOrders = await ctx.db.query("orders").collect();
    for (const order of allOrders) {
      await ctx.db.delete(order._id);
      results.orders++;
    }

    // Delete event staff
    const allStaff = await ctx.db.query("eventStaff").collect();
    for (const staff of allStaff) {
      await ctx.db.delete(staff._id);
      results.staff++;
    }

    // Delete bundles
    const allBundles = await ctx.db.query("ticketBundles").collect();
    for (const bundle of allBundles) {
      await ctx.db.delete(bundle._id);
      results.bundles++;
    }

    // Delete ticket tiers
    const allTiers = await ctx.db.query("ticketTiers").collect();
    for (const tier of allTiers) {
      await ctx.db.delete(tier._id);
      results.ticketTiers++;
    }

    // Delete payment configs
    const allConfigs = await ctx.db.query("eventPaymentConfig").collect();
    for (const config of allConfigs) {
      await ctx.db.delete(config._id);
      results.paymentConfigs++;
    }

    // Delete events
    const allEvents = await ctx.db.query("events").collect();
    for (const event of allEvents) {
      await ctx.db.delete(event._id);
      results.events++;
    }

    // Delete users except the one to keep
    const allUsers = await ctx.db.query("users").collect();
    for (const dbUser of allUsers) {
      if (dbUser.email !== args.keepUserEmail) {
        await ctx.db.delete(dbUser._id);
        results.users++;
      }
    }

    return results;
  },
});

/**
 * Delete all users except the specified one
 */
export const deleteAllUsersExcept = internalMutation({
  args: {
    keepEmail: v.string(),
  },
  handler: async (ctx, args) => {

    const allUsers = await ctx.db.query("users").collect();
    let deletedCount = 0;

    for (const user of allUsers) {
      if (user.email !== args.keepEmail) {
        await ctx.db.delete(user._id);
        deletedCount++;
      }
    }

    return { deletedCount, kept: args.keepEmail };
  },
});

/**
 * Delete all events
 */
export const deleteAllEvents = internalMutation({
  args: {},
  handler: async (ctx) => {

    const allEvents = await ctx.db.query("events").collect();
    let deletedCount = 0;

    for (const event of allEvents) {
      await ctx.db.delete(event._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Delete all tickets
 */
export const deleteAllTickets = internalMutation({
  args: {},
  handler: async (ctx) => {

    const allTickets = await ctx.db.query("tickets").collect();
    let deletedCount = 0;

    for (const ticket of allTickets) {
      await ctx.db.delete(ticket._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Delete all orders
 */
export const deleteAllOrders = internalMutation({
  args: {},
  handler: async (ctx) => {

    const allOrders = await ctx.db.query("orders").collect();
    let deletedCount = 0;

    for (const order of allOrders) {
      await ctx.db.delete(order._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Delete all event staff
 */
export const deleteAllEventStaff = internalMutation({
  args: {},
  handler: async (ctx) => {

    const allStaff = await ctx.db.query("eventStaff").collect();
    let deletedCount = 0;

    for (const staff of allStaff) {
      await ctx.db.delete(staff._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Delete all ticket bundles
 */
export const deleteAllBundles = internalMutation({
  args: {},
  handler: async (ctx) => {

    const allBundles = await ctx.db.query("ticketBundles").collect();
    let deletedCount = 0;

    for (const bundle of allBundles) {
      await ctx.db.delete(bundle._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Delete all ticket tiers
 */
export const deleteAllTicketTiers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allTiers = await ctx.db.query("ticketTiers").collect();
    let deletedCount = 0;

    for (const tier of allTiers) {
      await ctx.db.delete(tier._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Delete all event payment configs
 */
export const deleteAllPaymentConfigs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allConfigs = await ctx.db.query("eventPaymentConfig").collect();
    let deletedCount = 0;

    for (const config of allConfigs) {
      await ctx.db.delete(config._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Complete database reset - DELETE EVERYTHING except products and one user
 */
export const completeReset = internalMutation({
  args: {
    keepUserEmail: v.string(),
  },
  handler: async (ctx, args) => {

    const results = {
      users: 0,
      events: 0,
      tickets: 0,
      orders: 0,
      staff: 0,
      bundles: 0,
      ticketTiers: 0,
      paymentConfigs: 0,
    };

    // Delete tickets
    const allTickets = await ctx.db.query("tickets").collect();
    for (const ticket of allTickets) {
      await ctx.db.delete(ticket._id);
      results.tickets++;
    }

    // Delete orders
    const allOrders = await ctx.db.query("orders").collect();
    for (const order of allOrders) {
      await ctx.db.delete(order._id);
      results.orders++;
    }

    // Delete event staff
    const allStaff = await ctx.db.query("eventStaff").collect();
    for (const staff of allStaff) {
      await ctx.db.delete(staff._id);
      results.staff++;
    }

    // Delete bundles
    const allBundles = await ctx.db.query("ticketBundles").collect();
    for (const bundle of allBundles) {
      await ctx.db.delete(bundle._id);
      results.bundles++;
    }

    // Delete ticket tiers
    const allTiers = await ctx.db.query("ticketTiers").collect();
    for (const tier of allTiers) {
      await ctx.db.delete(tier._id);
      results.ticketTiers++;
    }

    // Delete payment configs
    const allConfigs = await ctx.db.query("eventPaymentConfig").collect();
    for (const config of allConfigs) {
      await ctx.db.delete(config._id);
      results.paymentConfigs++;
    }

    // Delete events
    const allEvents = await ctx.db.query("events").collect();
    for (const event of allEvents) {
      await ctx.db.delete(event._id);
      results.events++;
    }

    // Delete users except the one to keep
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      if (user.email !== args.keepUserEmail) {
        await ctx.db.delete(user._id);
        results.users++;
      }
    }


    return results;
  },
});
