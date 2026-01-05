import { query } from "../_generated/server";
import { v } from "convex/values";

// Get all product orders (admin)
export const getAllOrders = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("productOrders").order("desc").collect();
    return orders;
  },
});

// Get orders by fulfillment status (admin)
export const getOrdersByStatus = query({
  args: {
    fulfillmentStatus: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("SHIPPED"),
      v.literal("DELIVERED"),
      v.literal("CANCELLED")
    ),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("productOrders")
      .withIndex("by_fulfillment_status", (q) => q.eq("fulfillmentStatus", args.fulfillmentStatus))
      .order("desc")
      .collect();
    return orders;
  },
});

// Get order by ID
export const getOrderById = query({
  args: { orderId: v.id("productOrders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    return order;
  },
});

// Get order by order number
export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("productOrders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .unique();
    return order;
  },
});

// Get orders by customer email (case-insensitive)
export const getOrdersByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Normalize email to lowercase for consistent matching
    const normalizedEmail = args.email.toLowerCase().trim();

    const orders = await ctx.db
      .query("productOrders")
      .withIndex("by_email", (q) => q.eq("customerEmail", normalizedEmail))
      .order("desc")
      .collect();
    return orders;
  },
});
