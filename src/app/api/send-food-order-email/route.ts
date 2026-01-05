import { NextRequest, NextResponse } from "next/server";
import { sendPostalEmail } from "@/lib/email/client";
import {
  customerOrderConfirmationTemplate,
  customerStatusUpdateTemplate,
  restaurantNewOrderAlertTemplate,
  FoodOrderEmailData,
  RestaurantData,
} from "@/lib/email/foodOrderTemplates";

const postalConfigured = !!process.env.POSTAL_API_KEY;

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@stepperslife.com";

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Type definitions for request body
interface SendFoodOrderEmailRequest {
  type: "confirmation" | "status_update" | "restaurant_alert";
  to: string;
  order: FoodOrderEmailData;
  restaurant: RestaurantData;
  newStatus?: string; // Required for status_update type
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  try {
    // FAILURE POINT 1: Missing POSTAL_API_KEY
    if (!postalConfigured) {
      console.error("[FOOD_ORDER_EMAIL] POSTAL_API_KEY is not configured");
      return NextResponse.json(
        {
          error: "Email service not configured",
          code: "EMAIL_SERVICE_UNAVAILABLE"
        },
        { status: 500 }
      );
    }

    // Parse request body
    let body: SendFoodOrderEmailRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { type, to, order, restaurant, newStatus } = body;

    // FAILURE POINT 2: Missing required fields
    if (!type || !to || !order || !restaurant) {
      const missingFields = [];
      if (!type) missingFields.push("type");
      if (!to) missingFields.push("to");
      if (!order) missingFields.push("order");
      if (!restaurant) missingFields.push("restaurant");

      console.error(`[FOOD_ORDER_EMAIL] Missing fields: ${missingFields.join(", ")}`);
      return NextResponse.json(
        {
          error: `Missing required fields: ${missingFields.join(", ")}`,
          code: "MISSING_FIELDS"
        },
        { status: 400 }
      );
    }

    // FAILURE POINT 3: Invalid email address
    if (!emailRegex.test(to)) {
      console.error(`[FOOD_ORDER_EMAIL] Invalid email address: ${to}`);
      return NextResponse.json(
        { error: "Invalid email address format", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // FAILURE POINT 4: Invalid email type
    if (!["confirmation", "status_update", "restaurant_alert"].includes(type)) {
      console.error(`[FOOD_ORDER_EMAIL] Invalid email type: ${type}`);
      return NextResponse.json(
        {
          error: `Invalid email type: ${type}. Must be one of: confirmation, status_update, restaurant_alert`,
          code: "INVALID_TYPE"
        },
        { status: 400 }
      );
    }

    // FAILURE POINT 5: Missing newStatus for status_update
    if (type === "status_update" && !newStatus) {
      console.error("[FOOD_ORDER_EMAIL] status_update requires newStatus");
      return NextResponse.json(
        { error: "newStatus is required for status_update type", code: "MISSING_STATUS" },
        { status: 400 }
      );
    }

    // FAILURE POINT 6: Missing order items
    if (!order.items || order.items.length === 0) {
      console.warn(`[FOOD_ORDER_EMAIL] Order ${order.orderNumber} has no items`);
      // Don't fail, but log the warning
    }

    // Generate email content based on type
    let emailContent: { subject: string; html: string };

    switch (type) {
      case "confirmation":
        emailContent = customerOrderConfirmationTemplate(order, restaurant);
        break;
      case "status_update":
        emailContent = customerStatusUpdateTemplate(order, restaurant, newStatus!);
        break;
      case "restaurant_alert":
        emailContent = restaurantNewOrderAlertTemplate(order, restaurant);
        break;
      default:
        // This shouldn't happen due to validation above, but TypeScript needs it
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send via Postal (self-hosted)
    console.log(`[FOOD_ORDER_EMAIL] Sending ${type} email to ${to} for order ${order.orderNumber}`);

    const emailResponse = await sendPostalEmail({
      from: `SteppersLife Food Orders <${FROM_EMAIL}>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // Check for Postal API errors
    if (!emailResponse.success) {
      console.error(`[FOOD_ORDER_EMAIL] Postal API error:`, emailResponse.error);

      return NextResponse.json(
        {
          error: "Failed to send email",
          code: "SEND_FAILED",
          details: emailResponse.error
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - requestStartTime;
    console.log(`[FOOD_ORDER_EMAIL] Successfully sent ${type} email to ${to} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      emailId: emailResponse.messageId,
      orderNumber: order.orderNumber,
      type: type,
      message: `${type} email sent successfully to ${to}`,
    });

  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error(`[FOOD_ORDER_EMAIL] Error after ${duration}ms:`, error);

    // FAILURE POINT 10: Network timeout or other unexpected errors
    return NextResponse.json(
      {
        error: "Failed to send email",
        code: "UNEXPECTED_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const status = {
    service: "food-order-email",
    configured: postalConfigured,
    fromEmail: FROM_EMAIL,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(status);
}
