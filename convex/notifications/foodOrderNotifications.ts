/**
 * Food Order Email Notification System
 * Sends receipt-style emails to customers and restaurant owners
 */

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Production URL for the email API
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://stepperslife.com";

/**
 * Send customer order confirmation email
 * Called after order is successfully created
 */
export const sendCustomerOrderConfirmation = action({
  args: {
    foodOrderId: v.id("foodOrders"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get order data
      const order = await ctx.runQuery(internal.foodOrders.getByIdInternal, {
        id: args.foodOrderId,
      });

      if (!order) {
        console.error(`[FOOD_ORDER_EMAIL] Order not found: ${args.foodOrderId}`);
        return { success: false, error: "Order not found" };
      }

      // Get restaurant data
      const restaurant = await ctx.runQuery(internal.restaurants.getByIdInternal, {
        id: args.restaurantId,
      });

      if (!restaurant) {
        console.error(`[FOOD_ORDER_EMAIL] Restaurant not found: ${args.restaurantId}`);
        return { success: false, error: "Restaurant not found" };
      }

      // Validate customer email
      if (!order.customerEmail) {
        console.error(`[FOOD_ORDER_EMAIL] No customer email for order: ${order.orderNumber}`);
        return { success: false, error: "No customer email" };
      }

      // Prepare email data
      const emailData = {
        type: "confirmation" as const,
        to: order.customerEmail,
        order: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          items: order.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes,
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          pickupTime: order.pickupTime,
          specialInstructions: order.specialInstructions,
          placedAt: order.placedAt,
        },
        restaurant: {
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          zipCode: restaurant.zipCode,
          phone: restaurant.phone,
          estimatedPickupTime: restaurant.estimatedPickupTime,
        },
      };

      // Send email via API
      const response = await fetch(`${BASE_URL}/api/send-food-order-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[FOOD_ORDER_EMAIL] API error:`, errorData);

        // Log the failure
        await ctx.runMutation(internal.notifications.foodOrderNotifications.logEmailNotification, {
          restaurantId: args.restaurantId,
          foodOrderId: args.foodOrderId,
          type: "CUSTOMER_CONFIRMATION",
          recipient: order.customerEmail,
          status: "FAILED",
          error: errorData.error || `HTTP ${response.status}`,
        });

        return { success: false, error: errorData.error || "API request failed" };
      }

      const result = await response.json();

      // Log success
      await ctx.runMutation(internal.notifications.foodOrderNotifications.logEmailNotification, {
        restaurantId: args.restaurantId,
        foodOrderId: args.foodOrderId,
        type: "CUSTOMER_CONFIRMATION",
        recipient: order.customerEmail,
        status: "SENT",
        emailId: result.emailId,
      });

      console.log(`[FOOD_ORDER_EMAIL] Customer confirmation sent for order ${order.orderNumber}`);
      return { success: true };

    } catch (error: any) {
      console.error(`[FOOD_ORDER_EMAIL] Error sending customer confirmation:`, error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Send customer status update email
 * Called when order status changes
 */
export const sendCustomerStatusUpdate = action({
  args: {
    foodOrderId: v.id("foodOrders"),
    newStatus: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get order data
      const order = await ctx.runQuery(internal.foodOrders.getByIdInternal, {
        id: args.foodOrderId,
      });

      if (!order) {
        console.error(`[FOOD_ORDER_EMAIL] Order not found: ${args.foodOrderId}`);
        return { success: false, error: "Order not found" };
      }

      // Get restaurant data
      const restaurant = await ctx.runQuery(internal.restaurants.getByIdInternal, {
        id: order.restaurantId,
      });

      if (!restaurant) {
        console.error(`[FOOD_ORDER_EMAIL] Restaurant not found: ${order.restaurantId}`);
        return { success: false, error: "Restaurant not found" };
      }

      // Validate customer email
      if (!order.customerEmail) {
        console.error(`[FOOD_ORDER_EMAIL] No customer email for order: ${order.orderNumber}`);
        return { success: false, error: "No customer email" };
      }

      // Prepare email data
      const emailData = {
        type: "status_update" as const,
        to: order.customerEmail,
        newStatus: args.newStatus,
        order: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          items: order.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes,
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: args.newStatus,
          paymentMethod: order.paymentMethod,
          pickupTime: order.pickupTime,
          specialInstructions: order.specialInstructions,
          placedAt: order.placedAt,
        },
        restaurant: {
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          zipCode: restaurant.zipCode,
          phone: restaurant.phone,
          estimatedPickupTime: restaurant.estimatedPickupTime,
        },
      };

      // Send email via API
      const response = await fetch(`${BASE_URL}/api/send-food-order-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[FOOD_ORDER_EMAIL] API error:`, errorData);

        // Log the failure
        await ctx.runMutation(internal.notifications.foodOrderNotifications.logEmailNotification, {
          restaurantId: order.restaurantId,
          foodOrderId: args.foodOrderId,
          type: "CUSTOMER_STATUS_UPDATE",
          recipient: order.customerEmail,
          status: "FAILED",
          error: errorData.error || `HTTP ${response.status}`,
        });

        return { success: false, error: errorData.error || "API request failed" };
      }

      const result = await response.json();

      // Log success
      await ctx.runMutation(internal.notifications.foodOrderNotifications.logEmailNotification, {
        restaurantId: order.restaurantId,
        foodOrderId: args.foodOrderId,
        type: "CUSTOMER_STATUS_UPDATE",
        recipient: order.customerEmail,
        status: "SENT",
        emailId: result.emailId,
      });

      console.log(`[FOOD_ORDER_EMAIL] Status update (${args.newStatus}) sent for order ${order.orderNumber}`);
      return { success: true };

    } catch (error: any) {
      console.error(`[FOOD_ORDER_EMAIL] Error sending status update:`, error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Send restaurant new order alert email
 * Called when a new order is placed
 */
export const sendRestaurantNewOrderAlert = action({
  args: {
    foodOrderId: v.id("foodOrders"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get order data
      const order = await ctx.runQuery(internal.foodOrders.getByIdInternal, {
        id: args.foodOrderId,
      });

      if (!order) {
        console.error(`[FOOD_ORDER_EMAIL] Order not found: ${args.foodOrderId}`);
        return { success: false, error: "Order not found" };
      }

      // Get restaurant data
      const restaurant = await ctx.runQuery(internal.restaurants.getByIdInternal, {
        id: args.restaurantId,
      });

      if (!restaurant) {
        console.error(`[FOOD_ORDER_EMAIL] Restaurant not found: ${args.restaurantId}`);
        return { success: false, error: "Restaurant not found" };
      }

      // Get restaurant owner email
      const owner = await ctx.runQuery(internal.users.queries.getByIdInternal, {
        id: restaurant.ownerId,
      });

      if (!owner || !owner.email) {
        console.error(`[FOOD_ORDER_EMAIL] Restaurant owner not found or no email: ${restaurant.ownerId}`);
        return { success: false, error: "Restaurant owner not found" };
      }

      // Prepare email data
      const emailData = {
        type: "restaurant_alert" as const,
        to: owner.email,
        order: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          items: order.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes,
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          pickupTime: order.pickupTime,
          specialInstructions: order.specialInstructions,
          placedAt: order.placedAt,
        },
        restaurant: {
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          zipCode: restaurant.zipCode,
          phone: restaurant.phone,
          estimatedPickupTime: restaurant.estimatedPickupTime,
        },
      };

      // Send email via API
      const response = await fetch(`${BASE_URL}/api/send-food-order-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[FOOD_ORDER_EMAIL] API error:`, errorData);

        // Log the failure
        await ctx.runMutation(internal.notifications.foodOrderNotifications.logEmailNotification, {
          restaurantId: args.restaurantId,
          foodOrderId: args.foodOrderId,
          type: "RESTAURANT_NEW_ORDER",
          recipient: owner.email,
          status: "FAILED",
          error: errorData.error || `HTTP ${response.status}`,
        });

        return { success: false, error: errorData.error || "API request failed" };
      }

      const result = await response.json();

      // Log success
      await ctx.runMutation(internal.notifications.foodOrderNotifications.logEmailNotification, {
        restaurantId: args.restaurantId,
        foodOrderId: args.foodOrderId,
        type: "RESTAURANT_NEW_ORDER",
        recipient: owner.email,
        status: "SENT",
        emailId: result.emailId,
      });

      console.log(`[FOOD_ORDER_EMAIL] Restaurant alert sent for order ${order.orderNumber} to ${owner.email}`);
      return { success: true };

    } catch (error: any) {
      console.error(`[FOOD_ORDER_EMAIL] Error sending restaurant alert:`, error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Log email notification for audit trail
 */
export const logEmailNotification = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    foodOrderId: v.id("foodOrders"),
    type: v.string(),
    recipient: v.string(),
    status: v.string(),
    emailId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificationLog", {
      restaurantId: args.restaurantId,
      foodOrderId: args.foodOrderId,
      type: args.type,
      title: `${args.type} Email`,
      body: `Email to ${args.recipient}`,
      status: args.status as "SENT" | "FAILED",
      error: args.error,
      sentAt: Date.now(),
    });
  },
});
