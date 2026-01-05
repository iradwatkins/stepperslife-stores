import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { requireRestaurantRole, canTransitionOrderStatus, getRestaurantAccess } from "./lib/restaurantAuth";
import { validatePaymentStatus, VALID_PAYMENT_STATUSES } from "./lib/validation";

// Valid order statuses - used for validation
const VALID_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
] as const;

type OrderStatus = typeof VALID_ORDER_STATUSES[number];

function isValidOrderStatus(status: string): status is OrderStatus {
  return VALID_ORDER_STATUSES.includes(status as OrderStatus);
}

// Generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FO-${timestamp}-${random}`;
}

// Get orders for restaurant (requires staff role or higher)
export const getByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    // Verify user has at least STAFF role for this restaurant
    await requireRestaurantRole(ctx, args.restaurantId, "RESTAURANT_STAFF");

    return await ctx.db
      .query("foodOrders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

// Get orders by customer (requires authentication)
export const getByCustomer = query({
  args: { customerId: v.id("users") },
  handler: async (ctx, args) => {
    // Verify the authenticated user matches the requested customerId
    const user = await getCurrentUser(ctx);

    // Only allow users to view their own orders (or admin to view any)
    if (user._id !== args.customerId && user.role !== "admin") {
      throw new Error("Not authorized to view these orders");
    }

    return await ctx.db
      .query("foodOrders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .collect();
  },
});

// Get order by number (public for order tracking, but limits exposed data for unauthenticated users)
export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("foodOrders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    if (!order) return null;

    // Check if user is authenticated
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      // For unauthenticated users: return limited data for order tracking only
      // This allows guests to track their orders without exposing full PII
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        pickupTime: order.pickupTime,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        placedAt: order.placedAt,
        readyAt: order.readyAt,
        completedAt: order.completedAt,
        restaurantId: order.restaurantId,
        // Explicitly NOT returning: customerEmail, customerPhone (PII protection)
      };
    }

    // For authenticated users: verify they own this order or have restaurant access
    const email = identity.email || identity.tokenIdentifier?.split("|")[1];
    const user = email ? await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email as string))
      .first() : null;

    // If user is the customer, admin, or has restaurant access, return full order
    if (user) {
      if (user._id === order.customerId || user.role === "admin") {
        return order;
      }

      // Check for restaurant staff access
      const restaurantAccess = await getRestaurantAccess(ctx, order.restaurantId);
      if (restaurantAccess) {
        return order;
      }
    }

    // Fallback: return limited data even for authenticated users who don't own the order
    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      pickupTime: order.pickupTime,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      placedAt: order.placedAt,
      readyAt: order.readyAt,
      completedAt: order.completedAt,
      restaurantId: order.restaurantId,
    };
  },
});

// Get order by ID (requires authentication and authorization)
export const getById = query({
  args: { id: v.id("foodOrders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    // Require authentication
    const user = await getCurrentUser(ctx);

    // Allow if user is the customer
    if (order.customerId === user._id) {
      return order;
    }

    // Allow if user is admin
    if (user.role === "admin") {
      return order;
    }

    // Allow if user has restaurant access
    const restaurantAccess = await getRestaurantAccess(ctx, order.restaurantId);
    if (restaurantAccess) {
      return order;
    }

    throw new Error("Not authorized to view this order");
  },
});

// Get order by ID (internal - for use by other Convex functions)
export const getByIdInternal = internalQuery({
  args: { id: v.id("foodOrders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create food order (internal mutation - returns order details)
export const create = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("users")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.string(),
    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      name: v.string(),
      price: v.number(),
      quantity: v.number(),
      notes: v.optional(v.string()),
    })),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    pickupTime: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    orderId: Id<"foodOrders">;
    orderNumber: string;
    restaurantId: Id<"restaurants">;
    customerName: string;
    total: number;
    itemCount: number;
  }> => {
    // Validate restaurant exists and is accepting orders
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }
    if (!restaurant.acceptingOrders) {
      throw new Error("Restaurant is not currently accepting orders");
    }

    // Validate each item: check price, availability, and quantity
    let calculatedSubtotal = 0;
    for (const item of args.items) {
      // Validate quantity
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error(`Invalid quantity for ${item.name}: must be between 1 and 99`);
      }

      // Fetch the menu item to verify price and availability
      const menuItem = await ctx.db.get(item.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item not found: ${item.name}`);
      }

      // Verify the item belongs to this restaurant
      if (menuItem.restaurantId !== args.restaurantId) {
        throw new Error(`Menu item ${item.name} does not belong to this restaurant`);
      }

      // Verify item is available
      if (!menuItem.isAvailable) {
        throw new Error(`${item.name} is no longer available`);
      }

      // Verify price matches (allow 1 cent tolerance for rounding)
      if (Math.abs(menuItem.price - item.price) > 1) {
        throw new Error(`Price mismatch for ${item.name}: expected ${menuItem.price}, got ${item.price}`);
      }

      // Use the verified price from database
      calculatedSubtotal += menuItem.price * item.quantity;
    }

    // Validate totals (allow small tolerance for rounding)
    if (Math.abs(calculatedSubtotal - args.subtotal) > args.items.length) {
      throw new Error(`Subtotal mismatch: calculated ${calculatedSubtotal}, received ${args.subtotal}`);
    }

    // Validate tax is reasonable (0-20% of subtotal)
    const maxTax = calculatedSubtotal * 0.20;
    if (args.tax < 0 || args.tax > maxTax) {
      throw new Error(`Invalid tax amount: ${args.tax}`);
    }

    // Validate total = subtotal + tax (with tolerance)
    const expectedTotal = args.subtotal + args.tax;
    if (Math.abs(args.total - expectedTotal) > 1) {
      throw new Error(`Total mismatch: expected ${expectedTotal}, received ${args.total}`);
    }

    const orderNumber = generateOrderNumber();
    const now = Date.now();

    const orderId = await ctx.db.insert("foodOrders", {
      ...args,
      orderNumber,
      status: "PENDING",
      paymentStatus: args.paymentStatus || "pending",
      placedAt: now,
    });

    // Return order details for notification
    return {
      orderId,
      orderNumber,
      restaurantId: args.restaurantId,
      customerName: args.customerName,
      total: args.total,
      itemCount: args.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  },
});

// Create food order with notification (action that calls mutation + triggers notification)
export const createWithNotification = action({
  args: {
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("users")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.string(),
    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      name: v.string(),
      price: v.number(),
      quantity: v.number(),
      notes: v.optional(v.string()),
    })),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    pickupTime: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    orderId: Id<"foodOrders">;
    orderNumber: string;
    restaurantId: Id<"restaurants">;
    customerName: string;
    total: number;
    itemCount: number;
  }> => {
    // Create the order
    const orderResult = await ctx.runMutation(internal.foodOrders.create, args);

    // Trigger push notification to restaurant
    try {
      await ctx.runAction(
        api.notifications.restaurantNotifications.notifyNewFoodOrder,
        {
          foodOrderId: orderResult.orderId,
          restaurantId: orderResult.restaurantId,
          orderNumber: orderResult.orderNumber,
          customerName: orderResult.customerName,
          totalCents: orderResult.total, // total is already in cents
          itemCount: orderResult.itemCount,
        }
      );
    } catch (error) {
      // Don't fail the order if notification fails
      console.error("Failed to send push notification:", error);
    }

    // Send customer confirmation email
    try {
      await ctx.runAction(
        api.notifications.foodOrderNotifications.sendCustomerOrderConfirmation,
        {
          foodOrderId: orderResult.orderId,
          restaurantId: orderResult.restaurantId,
        }
      );
    } catch (error) {
      // Don't fail the order if email fails
      console.error("Failed to send customer confirmation email:", error);
    }

    // Send restaurant new order alert email
    try {
      await ctx.runAction(
        api.notifications.foodOrderNotifications.sendRestaurantNewOrderAlert,
        {
          foodOrderId: orderResult.orderId,
          restaurantId: orderResult.restaurantId,
        }
      );
    } catch (error) {
      // Don't fail the order if email fails
      console.error("Failed to send restaurant alert email:", error);
    }

    return orderResult;
  },
});

// Update order status
export const updateStatus = internalMutation({
  args: {
    id: v.id("foodOrders"),
    status: v.string(),
  },
  handler: async (ctx, args): Promise<{
    orderId: Id<"foodOrders">;
    orderNumber: string | undefined;
    customerId: Id<"users"> | undefined;
    status: string;
  }> => {
    // Validate status
    if (!isValidOrderStatus(args.status)) {
      throw new Error(
        `Invalid order status: "${args.status}". Valid statuses are: ${VALID_ORDER_STATUSES.join(", ")}`
      );
    }

    const updates: Record<string, unknown> = { status: args.status };

    if (args.status === "READY_FOR_PICKUP") {
      updates.readyAt = Date.now();
    } else if (args.status === "COMPLETED") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);

    // Return order info for notification
    const order = await ctx.db.get(args.id);
    return {
      orderId: args.id,
      orderNumber: order?.orderNumber,
      customerId: order?.customerId,
      status: args.status,
    };
  },
});

// Secure update order status (verifies role-based access)
export const updateStatusSecure = mutation({
  args: {
    id: v.id("foodOrders"),
    status: v.string(),
  },
  handler: async (ctx, args): Promise<{
    orderId: Id<"foodOrders">;
    orderNumber: string | undefined;
    customerId: Id<"users"> | undefined;
    status: string;
  }> => {
    // Validate status
    if (!isValidOrderStatus(args.status)) {
      throw new Error(
        `Invalid order status: "${args.status}". Valid statuses are: ${VALID_ORDER_STATUSES.join(", ")}`
      );
    }

    // Get the order
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify user has access to this restaurant
    const access = await getRestaurantAccess(ctx, order.restaurantId);
    if (!access) {
      throw new Error("Not authorized: No access to this restaurant");
    }

    // Check if role can make this status transition
    const role = access.isAdmin ? "ADMIN" : access.role;
    if (!canTransitionOrderStatus(role, order.status, args.status)) {
      throw new Error(
        `Not authorized: ${access.role} cannot transition from ${order.status} to ${args.status}`
      );
    }

    // Update status
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "READY_FOR_PICKUP") {
      updates.readyAt = Date.now();
    } else if (args.status === "COMPLETED") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);

    return {
      orderId: args.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      status: args.status,
    };
  },
});

// Update order status with customer notification (secured)
export const updateStatusWithNotification = action({
  args: {
    id: v.id("foodOrders"),
    status: v.string(),
  },
  handler: async (ctx, args): Promise<{
    orderId: Id<"foodOrders">;
    orderNumber: string | undefined;
    customerId: Id<"users"> | undefined;
    status: string;
  }> => {
    // Update the status using secure mutation (verifies role-based access)
    const updateResult = await ctx.runMutation(api.foodOrders.updateStatusSecure, {
      id: args.id,
      status: args.status,
    });

    // Send push notification to customer if they have a subscription
    if (updateResult.customerId) {
      try {
        await ctx.runAction(
          api.notifications.customerNotifications.notifyOrderStatusUpdate,
          {
            foodOrderId: args.id,
            customerId: updateResult.customerId,
            orderNumber: updateResult.orderNumber || "",
            newStatus: args.status,
          }
        );
      } catch (error) {
        // Don't fail if notification fails
        console.error("Failed to send customer push notification:", error);
      }
    }

    // Send status update email to customer
    try {
      await ctx.runAction(
        api.notifications.foodOrderNotifications.sendCustomerStatusUpdate,
        {
          foodOrderId: args.id,
          newStatus: args.status,
        }
      );
    } catch (error) {
      // Don't fail if email fails
      console.error("Failed to send customer status update email:", error);
    }

    return updateResult;
  },
});

// Get all food orders (admin only - for debugging)
export const getAllOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "admin") {
      throw new Error("Admin access required");
    }
    return await ctx.db.query("foodOrders").order("desc").take(50);
  },
});

// Get all food orders (internal - for CLI debugging)
export const getAllOrdersInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("foodOrders").order("desc").take(50);
  },
});

// Link orphaned orders to users by email (internal - for CLI migrations)
export const linkOrphanedOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all orders without customerId
    const orphanedOrders = await ctx.db
      .query("foodOrders")
      .filter((q) => q.eq(q.field("customerId"), undefined))
      .collect();

    let linkedCount = 0;
    for (const order of orphanedOrders) {
      // Find user by customerEmail
      const matchingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", order.customerEmail))
        .first();

      if (matchingUser) {
        await ctx.db.patch(order._id, { customerId: matchingUser._id });
        linkedCount++;
      }
    }

    return {
      orphanedCount: orphanedOrders.length,
      linkedCount,
      message: `Linked ${linkedCount} of ${orphanedOrders.length} orphaned orders to users`
    };
  },
});

// Update payment status (requires MANAGER role or higher)
export const updatePaymentStatus = mutation({
  args: {
    orderId: v.id("foodOrders"),
    paymentStatus: v.string(),
    paymentMethod: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate payment status
    validatePaymentStatus(args.paymentStatus);

    // Get the order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get current user - allow customer who placed the order to update payment
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      // If user is the customer who placed the order, allow update
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();

      if (user && order.customerId && order.customerId === user._id) {
        // Customer can update their own order's payment status
        const updateData: Record<string, any> = {
          paymentStatus: args.paymentStatus,
        };
        if (args.paymentMethod) updateData.paymentMethod = args.paymentMethod;
        if (args.stripePaymentIntentId) updateData.stripePaymentIntentId = args.stripePaymentIntentId;

        return await ctx.db.patch(args.orderId, updateData);
      }
    }

    // Otherwise require MANAGER role
    await requireRestaurantRole(ctx, order.restaurantId, "RESTAURANT_MANAGER");

    const updateData: Record<string, any> = {
      paymentStatus: args.paymentStatus,
    };
    if (args.paymentMethod) updateData.paymentMethod = args.paymentMethod;
    if (args.stripePaymentIntentId) updateData.stripePaymentIntentId = args.stripePaymentIntentId;

    return await ctx.db.patch(args.orderId, updateData);
  },
});
