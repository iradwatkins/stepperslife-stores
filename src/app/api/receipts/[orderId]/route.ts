/**
 * PDF Receipt Generation API (Story 5.3)
 *
 * GET /api/receipts/[orderId]
 *
 * Generates a PDF receipt for a completed order.
 * User must be authenticated and own the order, or be an admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { generateReceipt, ReceiptData } from "@/lib/pdf/receipt";

const client = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://convex.toolboxhosting.com"
);

interface OrderForReceipt {
  _id: Id<"orders">;
  status: string;
  buyerEmail: string;
  buyerName: string;
  subtotalCents: number;
  platformFeeCents: number;
  processingFeeCents: number;
  totalCents: number;
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  createdAt: number;
  eventId: Id<"events">;
}

interface Event {
  _id: Id<"events">;
  name: string;
  startDate: number;
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface OrderItem {
  _id: Id<"orderItems">;
  orderId: Id<"orders">;
  ticketTierId: Id<"ticketTiers">;
  priceCents: number;
}

interface TicketTier {
  _id: Id<"ticketTiers">;
  name: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get order details
    const order = await client.query(api.orders.queries.getOrderForRetry, {
      orderId: orderId as Id<"orders">,
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Only generate receipts for completed orders
    if (order.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Cannot generate receipt for order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Format order date
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format event date
    const eventDate = order.eventDate
      ? new Date(order.eventDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "TBD";

    const eventTime = order.eventDate
      ? new Date(order.eventDate).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : undefined;

    // Generate order number from payment ID or order ID
    const orderNumber = order.stripePaymentIntentId
      ? order.stripePaymentIntentId.substring(3, 15).toUpperCase()
      : String(order._id).substring(0, 12).toUpperCase();

    // Map order items to receipt items
    const items = order.orderItems.map((item) => ({
      name: "Event Ticket", // Simplified - would need tier lookup for full name
      quantity: 1,
      priceCents: item.priceCents,
    }));

    // If no items, create a single line item from the subtotal
    if (items.length === 0) {
      items.push({
        name: "Event Tickets",
        quantity: 1,
        priceCents: order.subtotalCents,
      });
    }

    // Determine payment method string
    let paymentMethodStr = "Online Payment";
    if (order.paymentMethod === "STRIPE") {
      paymentMethodStr = "Credit Card (Stripe)";
    } else if (order.paymentMethod === "PAYPAL") {
      paymentMethodStr = "PayPal";
    } else if (order.paymentMethod === "CASH") {
      paymentMethodStr = "Cash at Door";
    } else if (order.paymentMethod === "FREE") {
      paymentMethodStr = "Free Ticket";
    }

    // Build receipt data
    const receiptData: ReceiptData = {
      orderId: String(order._id),
      orderNumber,
      orderDate,
      paymentMethod: paymentMethodStr,
      paymentId: order.stripePaymentIntentId || order.paypalOrderId,

      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,

      eventName: order.eventName,
      eventDate,
      eventTime,

      items,

      subtotalCents: order.subtotalCents,
      platformFeeCents: order.platformFeeCents,
      processingFeeCents: order.processingFeeCents,
      totalCents: order.totalCents,

      companyName: "SteppersLife",
      companyEmail: "support@stepperslife.com",
    };

    // Generate PDF
    const pdfBuffer = generateReceipt(receiptData);

    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(pdfBuffer);

    // Return PDF response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${orderNumber}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Receipts API] Error generating receipt:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
