import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/email/email-service";
import { OrderReceiptData, OrderReceiptItem } from "@/lib/email/types";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// Initialize Convex client for logging
const convex = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  : null;

interface OrderConfirmationRequest {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  orderNumber: string;
  orderId?: string;
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    variantName?: string;
    vendorId?: string;
    vendorName?: string;
    vendorEmail?: string;
  }>;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  shippingAddress?: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    phone?: string;
  };
  shippingMethod: "DELIVERY" | "PICKUP";
  pickupNotes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const orderData: OrderConfirmationRequest = await request.json();

    // Validation
    if (!orderData.customerEmail || !orderData.orderNumber || !orderData.items) {
      return NextResponse.json(
        { error: "Missing required fields: customerEmail, orderNumber, items" },
        { status: 400 }
      );
    }

    // Check if email service is configured
    if (!emailService.isConfigured()) {
      console.error("[OrderConfirmation] Email service not configured");
      return NextResponse.json(
        { error: "Email service not configured (POSTAL_API_KEY missing)" },
        { status: 500 }
      );
    }

    // Convert request data to OrderReceiptData format
    const receiptData: OrderReceiptData = {
      orderNumber: orderData.orderNumber,
      orderId: orderData.orderId,
      orderDate: new Date(),
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      items: orderData.items.map((item): OrderReceiptItem => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        vendorEmail: item.vendorEmail,
      })),
      subtotal: orderData.subtotal,
      shippingCost: orderData.shippingCost,
      taxAmount: orderData.taxAmount,
      totalAmount: orderData.totalAmount,
      shippingMethod: orderData.shippingMethod,
      shippingAddress: orderData.shippingAddress,
      pickupNotes: orderData.pickupNotes,
      paymentStatus: "Pending - Pay When You Receive",
    };

    console.log(`[OrderConfirmation] Sending emails for order ${orderData.orderNumber}`);

    // Send all order emails using the new email service
    const results = await emailService.sendOrderReceipts(receiptData);

    // Log results to Convex if available
    if (convex) {
      try {
        const emailLogs = [];

        // Customer email log
        emailLogs.push({
          orderNumber: orderData.orderNumber,
          recipientType: "CUSTOMER" as const,
          recipientEmail: orderData.customerEmail,
          recipientName: orderData.customerName,
          subject: `Order Receipt #${orderData.orderNumber} - SteppersLife Marketplace`,
          templateType: "ORDER_RECEIPT",
          status: results.customer.success ? ("SENT" as const) : ("FAILED" as const),
          messageId: results.customer.messageId,
          attempts: results.customer.attempts,
          errorMessage: results.customer.error,
        });

        // Vendor email logs
        for (const vendorResult of results.vendors) {
          emailLogs.push({
            orderNumber: orderData.orderNumber,
            recipientType: "VENDOR" as const,
            recipientEmail: vendorResult.recipientEmail,
            subject: `New Order #${orderData.orderNumber}`,
            templateType: "VENDOR_ALERT",
            status: vendorResult.success ? ("SENT" as const) : ("FAILED" as const),
            messageId: vendorResult.messageId,
            attempts: vendorResult.attempts,
            errorMessage: vendorResult.error,
          });
        }

        // Staff email log
        if (results.staff) {
          emailLogs.push({
            orderNumber: orderData.orderNumber,
            recipientType: "STAFF" as const,
            recipientEmail: results.staff.recipientEmail,
            subject: `[STAFF] New Order #${orderData.orderNumber}`,
            templateType: "STAFF_NOTIFICATION",
            status: results.staff.success ? ("SENT" as const) : ("FAILED" as const),
            messageId: results.staff.messageId,
            attempts: results.staff.attempts,
            errorMessage: results.staff.error,
          });
        }

        // Batch insert logs
        await convex.mutation(api.email.mutations.createBatchEmailLogs, {
          logs: emailLogs,
        });

        console.log(`[OrderConfirmation] Logged ${emailLogs.length} email records to Convex`);
      } catch (logError) {
        console.error("[OrderConfirmation] Failed to log emails to Convex:", logError);
        // Don't fail the request if logging fails
      }
    }

    // Return detailed results
    return NextResponse.json({
      success: results.allSuccess,
      summary: results.summary,
      details: {
        customer: {
          sent: results.customer.success,
          messageId: results.customer.messageId,
          attempts: results.customer.attempts,
          error: results.customer.error,
        },
        vendors: results.vendors.map((v) => ({
          email: v.recipientEmail,
          sent: v.success,
          messageId: v.messageId,
          attempts: v.attempts,
          error: v.error,
        })),
        staff: results.staff
          ? {
              email: results.staff.recipientEmail,
              sent: results.staff.success,
              messageId: results.staff.messageId,
              attempts: results.staff.attempts,
              error: results.staff.error,
            }
          : null,
      },
      message: results.allSuccess
        ? "All confirmation emails sent successfully"
        : `Emails sent with some failures - Customer: ${results.summary.customerSent ? "OK" : "FAILED"}, Vendors: ${results.summary.vendorsSent}/${results.summary.vendorsSent + results.summary.vendorsFailed} sent, Staff: ${results.summary.staffSent ? "OK" : "N/A"}`,
    });
  } catch (error) {
    console.error("[OrderConfirmation] Error sending order confirmation emails:", error);

    return NextResponse.json(
      {
        error: "Failed to send order confirmation emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
