import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get all orders (for admin)
export const getAllOrders = query({
  args: {
    fulfillmentStatus: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("PROCESSING"),
        v.literal("SHIPPED"),
        v.literal("DELIVERED"),
        v.literal("CANCELLED")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.fulfillmentStatus) {
      const orders = await ctx.db
        .query("productOrders")
        .withIndex("by_fulfillment_status", (q) =>
          q.eq("fulfillmentStatus", args.fulfillmentStatus!)
        )
        .order("desc")
        .collect();
      return orders;
    }

    const orders = await ctx.db.query("productOrders").order("desc").collect();
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

// Create a new order
export const createOrder = mutation({
  args: {
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    shippingAddress: v.object({
      name: v.string(),
      address1: v.string(),
      address2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
      phone: v.optional(v.string()),
    }),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        variantId: v.optional(v.string()),
        variantName: v.optional(v.string()),
        quantity: v.number(),
        price: v.number(),
        totalPrice: v.number(),
      })
    ),
    subtotal: v.number(),
    shippingCost: v.number(),
    taxAmount: v.number(),
    totalAmount: v.number(),
    customerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CRITICAL: Validate inventory bounds BEFORE creating order
    // This prevents negative inventory and overselling
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productName}`);
      }
      if (product.trackInventory) {
        const available = product.inventoryQuantity ?? 0;
        if (available < item.quantity) {
          throw new Error(
            `Insufficient inventory for "${item.productName}". ` +
            `Requested: ${item.quantity}, Available: ${available}`
          );
        }
      }
    }

    // Generate order number
    const orderCount = await ctx.db.query("productOrders").collect();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount.length + 1).padStart(4, "0")}`;

    // Create order (normalize email to lowercase for consistent lookup)
    const orderId = await ctx.db.insert("productOrders", {
      orderNumber,
      ...args,
      customerEmail: args.customerEmail.toLowerCase().trim(),
      paymentStatus: "PENDING",
      fulfillmentStatus: "PENDING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update inventory for each item (already validated above)
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (product && product.trackInventory) {
        const currentQuantity = product.inventoryQuantity ?? 0;
        await ctx.db.patch(item.productId, {
          inventoryQuantity: currentQuantity - item.quantity,
          updatedAt: Date.now(),
        });
      }
    }

    return { orderId, orderNumber };
  },
});

// Update order fulfillment status
export const updateFulfillmentStatus = mutation({
  args: {
    orderId: v.id("productOrders"),
    fulfillmentStatus: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("SHIPPED"),
      v.literal("DELIVERED"),
      v.literal("CANCELLED")
    ),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, fulfillmentStatus, trackingNumber, trackingUrl } = args;

    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const updates: Record<string, unknown> = {
      fulfillmentStatus,
      updatedAt: Date.now(),
    };

    if (trackingNumber) updates.trackingNumber = trackingNumber;
    if (trackingUrl) updates.trackingUrl = trackingUrl;

    if (fulfillmentStatus === "SHIPPED") {
      updates.shippedAt = Date.now();
    } else if (fulfillmentStatus === "DELIVERED") {
      updates.deliveredAt = Date.now();
    }

    await ctx.db.patch(orderId, updates);

    return { success: true };
  },
});

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    orderId: v.id("productOrders"),
    paymentStatus: v.union(
      v.literal("PENDING"),
      v.literal("PAID"),
      v.literal("FAILED"),
      v.literal("REFUNDED")
    ),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, paymentStatus, stripePaymentIntentId } = args;

    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const updates: Record<string, unknown> = {
      paymentStatus,
      updatedAt: Date.now(),
    };

    if (stripePaymentIntentId) updates.stripePaymentIntentId = stripePaymentIntentId;

    if (paymentStatus === "PAID") {
      updates.paidAt = Date.now();
    }

    await ctx.db.patch(orderId, updates);

    return { success: true };
  },
});

// Get orders for a specific vendor (items belonging to vendor)
export const getOrdersByVendor = query({
  args: {
    vendorId: v.id("vendors"),
    fulfillmentStatus: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("PROCESSING"),
        v.literal("SHIPPED"),
        v.literal("DELIVERED"),
        v.literal("CANCELLED")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get all products belonging to this vendor
    const vendorProducts = await ctx.db
      .query("products")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    const vendorProductIds = new Set(vendorProducts.map((p) => p._id.toString()));

    // Get all orders
    let orders = await ctx.db.query("productOrders").order("desc").collect();

    if (args.fulfillmentStatus) {
      orders = orders.filter((o) => o.fulfillmentStatus === args.fulfillmentStatus);
    }

    // Filter orders that contain items from this vendor
    const vendorOrders = orders
      .map((order) => {
        const vendorItems = order.items.filter((item) =>
          vendorProductIds.has(item.productId.toString())
        );

        if (vendorItems.length === 0) return null;

        // Calculate vendor's portion of this order
        const vendorSubtotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);

        return {
          ...order,
          vendorItems,
          vendorSubtotal,
          totalItems: vendorItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      })
      .filter(Boolean);

    return vendorOrders;
  },
});

// Add internal note to order
export const addInternalNote = mutation({
  args: {
    orderId: v.id("productOrders"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      internalNote: args.note,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
