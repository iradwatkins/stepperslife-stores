import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Create a new product order
export const createProductOrder = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        productImage: v.optional(v.string()), // Product image URL
        // Legacy variant system
        variantId: v.optional(v.string()),
        variantName: v.optional(v.string()),
        // New variation system (productType: "VARIABLE")
        variationId: v.optional(v.id("productVariations")),
        variationAttributes: v.optional(v.any()), // { size: "M", color: "Blue" }
        variationSku: v.optional(v.string()),
        quantity: v.number(),
        price: v.number(),
      })
    ),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    shippingMethod: v.union(v.literal("PICKUP"), v.literal("DELIVERY")),
    shippingCost: v.optional(v.number()), // Zone-based shipping cost in cents (passed from checkout)
    shippingZone: v.optional(v.string()), // Zone name: Local, Regional, Extended, Remote
    shippingSpeed: v.optional(v.string()), // standard or express
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
    pickupLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const orderNumber = `ORD-${timestamp}-${random}`;

    // Calculate totals
    const subtotal = args.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Use zone-based shipping cost if provided, otherwise fallback to legacy per-product shipping
    let shippingCost = 0;
    if (args.shippingMethod === "DELIVERY") {
      if (args.shippingCost !== undefined) {
        // Use zone-based shipping from checkout
        shippingCost = args.shippingCost;
      } else {
        // Fallback: Sum up shipping costs from all products (legacy)
        for (const item of args.items) {
          const product = await ctx.db.get(item.productId);
          if (product && product.shippingPrice) {
            shippingCost += product.shippingPrice * item.quantity;
          }
        }
      }
    }

    // Calculate tax at 8.75% (standard rate for US)
    const TAX_RATE = 0.0875;
    const taxAmount = Math.round(subtotal * TAX_RATE);
    const totalAmount = subtotal + shippingCost + taxAmount;

    // Update inventory for each item
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // Handle new variation system (productType: "VARIABLE")
      if (item.variationId) {
        const variation = await ctx.db.get(item.variationId);
        if (!variation) {
          throw new Error(`Variation ${item.variationId} not found`);
        }

        if (variation.trackInventory) {
          if (variation.inventoryQuantity < item.quantity) {
            const attrDisplay = item.variationAttributes
              ? Object.entries(item.variationAttributes)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")
              : "";
            throw new Error(
              `Insufficient inventory for ${item.productName}${attrDisplay ? ` (${attrDisplay})` : ""}`
            );
          }

          // Decrement variation inventory with optimistic locking
          await ctx.db.patch(item.variationId, {
            inventoryQuantity: variation.inventoryQuantity - item.quantity,
            version: (variation.version || 0) + 1,
            updatedAt: Date.now(),
          });
        }
        continue; // Move to next item
      }

      // Legacy: Check and update inventory
      if (product.trackInventory) {
        if (item.variantId && product.variants) {
          // Update legacy variant inventory
          const variantIndex = product.variants.findIndex((v: any) => v.id === item.variantId);
          if (variantIndex >= 0) {
            const variant = product.variants[variantIndex] as any;
            if (variant.inventoryQuantity < item.quantity) {
              throw new Error(
                `Insufficient inventory for ${item.productName} - ${item.variantName}`
              );
            }
            const updatedVariants = [...product.variants];
            updatedVariants[variantIndex] = {
              ...variant,
              inventoryQuantity: variant.inventoryQuantity - item.quantity,
            };
            await ctx.db.patch(item.productId, {
              variants: updatedVariants,
              updatedAt: Date.now(),
            });
          }
        } else {
          // Update main product inventory
          if (product.inventoryQuantity < item.quantity) {
            throw new Error(`Insufficient inventory for ${item.productName}`);
          }
          await ctx.db.patch(item.productId, {
            inventoryQuantity: product.inventoryQuantity - item.quantity,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Create order (normalize email to lowercase for consistent lookup)
    const orderId = await ctx.db.insert("productOrders", {
      orderNumber,
      customerEmail: args.customerEmail.toLowerCase().trim(),
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      shippingAddress: args.shippingAddress,
      items: args.items.map((item) => ({
        ...item,
        totalPrice: item.price * item.quantity,
      })),
      subtotal,
      shippingCost,
      shippingZone: args.shippingZone,
      shippingSpeed: args.shippingSpeed,
      taxAmount,
      totalAmount,
      paymentStatus: "PENDING",
      fulfillmentStatus: "PENDING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

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
    internalNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, fulfillmentStatus, trackingNumber, trackingUrl, internalNote } = args;

    const updateData: any = {
      fulfillmentStatus,
      updatedAt: Date.now(),
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (trackingUrl) {
      updateData.trackingUrl = trackingUrl;
    }

    if (fulfillmentStatus === "SHIPPED") {
      updateData.shippedAt = Date.now();
    }

    if (fulfillmentStatus === "DELIVERED") {
      updateData.deliveredAt = Date.now();
    }

    if (internalNote) {
      updateData.internalNote = internalNote;
    }

    await ctx.db.patch(orderId, updateData);

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
    paymentMethod: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, paymentStatus, paymentMethod, stripePaymentIntentId } = args;

    const updateData: any = {
      paymentStatus,
      updatedAt: Date.now(),
    };

    if (paymentStatus === "PAID") {
      updateData.paidAt = Date.now();
    }

    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }

    if (stripePaymentIntentId) {
      updateData.stripePaymentIntentId = stripePaymentIntentId;
    }

    await ctx.db.patch(orderId, updateData);

    return { success: true };
  },
});

// Cancel order
export const cancelOrder = mutation({
  args: {
    orderId: v.id("productOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Restore inventory
    for (const item of order.items) {
      const product = await ctx.db.get(item.productId);
      if (product && product.trackInventory) {
        if (item.variantId && product.variants) {
          // Restore variant inventory
          const variantIndex = product.variants.findIndex((v) => v.id === item.variantId);
          if (variantIndex >= 0) {
            const variant = product.variants[variantIndex];
            const updatedVariants = [...product.variants];
            updatedVariants[variantIndex] = {
              ...variant,
              inventoryQuantity: variant.inventoryQuantity + item.quantity,
            };
            await ctx.db.patch(item.productId, {
              variants: updatedVariants,
              updatedAt: Date.now(),
            });
          }
        } else {
          // Restore main product inventory
          await ctx.db.patch(item.productId, {
            inventoryQuantity: product.inventoryQuantity + item.quantity,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Update order status
    await ctx.db.patch(args.orderId, {
      fulfillmentStatus: "CANCELLED",
      internalNote: args.reason || order.internalNote,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ADMIN: Clean up test orders
export const cleanupTestOrders = mutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("productOrders").collect();

    let deletedCount = 0;

    for (const order of orders) {
      // Delete test orders (Test Customer, Guest Customer, or test emails)
      if (
        order.customerName === "Test Customer" ||
        order.customerName === "Guest Customer" ||
        order.customerName === "Steppers Life Test" ||
        order.customerEmail === "guest-test@example.com" ||
        order.customerEmail === "ira@irawatkins.com" ||
        (order.items && order.items.some((item) => item.productName.includes("E2E Test Product")))
      ) {
        await ctx.db.delete(order._id);
        deletedCount++;
      }
    }

    return { deletedCount, message: `Deleted ${deletedCount} test orders` };
  },
});
