/**
 * Email Service with Retry Logic for SteppersLife Marketplace
 *
 * Features:
 * - Exponential backoff retry (3 attempts)
 * - Sends to Customer, Vendor(s), and Staff
 * - Tracks all results for audit logging
 * - Validates email addresses before sending
 * - Uses Postal (self-hosted) for email delivery
 */

import { sendPostalEmail, FROM_EMAIL as POSTAL_FROM } from "./client";
import {
  EmailSendResult,
  EmailRecipientType,
  OrderReceiptData,
  VendorReceiptData,
  StaffNotificationData,
  OrderEmailResults,
  VendorBreakdownItem,
} from "./types";
import {
  generateCustomerReceipt,
  generateVendorReceipt,
  generateStaffNotification,
  isValidEmail,
} from "./receipt-templates";

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES || "3");
const RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || "1000");
const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || "thestepperslife@gmail.com";
const STAFF_ENABLED = process.env.STAFF_NOTIFICATION_ENABLED !== "false";
const FROM_EMAIL = process.env.FROM_EMAIL || POSTAL_FROM;

// ============================================================================
// EMAIL SERVICE CLASS (Uses Postal - self-hosted)
// ============================================================================

export class EmailService {
  private fromEmail: string;
  private configured: boolean;

  constructor() {
    this.configured = !!process.env.POSTAL_API_KEY;
    if (!this.configured) {
      console.warn("[EmailService] POSTAL_API_KEY not configured - emails disabled");
    }
    this.fromEmail = FROM_EMAIL;
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send email with retry logic and exponential backoff
   * Uses Postal (self-hosted) for delivery
   */
  private async sendWithRetry(
    to: string,
    subject: string,
    html: string,
    text: string,
    recipientType: EmailRecipientType,
    orderNumber: string
  ): Promise<EmailSendResult> {
    // Validate email address first
    if (!isValidEmail(to)) {
      console.error(`[EmailService] Invalid email address: ${to}`);
      return {
        success: false,
        error: `Invalid email address: ${to}`,
        attempts: 0,
        recipientType,
        recipientEmail: to,
      };
    }

    // Check if Postal is configured
    if (!this.configured) {
      console.error("[EmailService] Postal not configured");
      return {
        success: false,
        error: "Email service not configured (POSTAL_API_KEY missing)",
        attempts: 0,
        recipientType,
        recipientEmail: to,
      };
    }

    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `[EmailService] Attempt ${attempt}/${MAX_RETRIES} - Sending ${recipientType} email to ${to} for order ${orderNumber}`
        );

        const response = await sendPostalEmail({
          from: this.fromEmail,
          to,
          subject,
          html,
          text,
        });

        if (!response.success) {
          lastError = response.error || "Unknown error";
          console.error(
            `[EmailService] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError}`
          );

          if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`[EmailService] Retrying in ${delayMs}ms...`);
            await this.delay(delayMs);
            continue;
          }
        } else {
          console.log(
            `[EmailService] Successfully sent ${recipientType} email to ${to} (messageId: ${response.messageId})`
          );
          return {
            success: true,
            messageId: response.messageId,
            attempts: attempt,
            recipientType,
            recipientEmail: to,
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[EmailService] Attempt ${attempt}/${MAX_RETRIES} error: ${lastError}`
        );

        if (attempt < MAX_RETRIES) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[EmailService] Retrying in ${delayMs}ms...`);
          await this.delay(delayMs);
        }
      }
    }

    // All retries exhausted
    console.error(
      `[EmailService] All ${MAX_RETRIES} attempts failed for ${recipientType} email to ${to}`
    );
    return {
      success: false,
      error: lastError,
      attempts: MAX_RETRIES,
      recipientType,
      recipientEmail: to,
    };
  }

  /**
   * Group order items by vendor for vendor-specific emails
   */
  private groupItemsByVendor(
    orderData: OrderReceiptData
  ): Map<string, VendorReceiptData> {
    const vendorGroups = new Map<string, VendorReceiptData>();

    for (const item of orderData.items) {
      // Use platform email for items without vendor
      const vendorEmail = item.vendorEmail || "platform@stepperslife.com";
      const vendorName = item.vendorName || "SteppersLife";
      const vendorId = item.vendorId || "platform";

      if (!vendorGroups.has(vendorEmail)) {
        vendorGroups.set(vendorEmail, {
          ...orderData,
          vendorId,
          vendorName,
          vendorEmail,
          vendorItems: [],
          vendorSubtotal: 0,
        });
      }

      const vendor = vendorGroups.get(vendorEmail)!;
      vendor.vendorItems.push(item);
      vendor.vendorSubtotal += item.totalPrice;
    }

    return vendorGroups;
  }

  /**
   * Build vendor breakdown for staff notification
   */
  private buildVendorBreakdown(
    vendorGroups: Map<string, VendorReceiptData>
  ): VendorBreakdownItem[] {
    const breakdown: VendorBreakdownItem[] = [];

    for (const [, vendor] of vendorGroups) {
      breakdown.push({
        vendorName: vendor.vendorName,
        vendorEmail: vendor.vendorEmail,
        itemCount: vendor.vendorItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: vendor.vendorSubtotal,
      });
    }

    return breakdown;
  }

  /**
   * Send all order receipt emails (customer, vendors, staff)
   * Returns detailed results for each recipient type
   */
  async sendOrderReceipts(orderData: OrderReceiptData): Promise<OrderEmailResults> {
    console.log(
      `[EmailService] Starting email send for order ${orderData.orderNumber}`
    );

    const results: OrderEmailResults = {
      customer: {} as EmailSendResult,
      vendors: [],
      staff: null,
      allSuccess: false,
      summary: {
        customerSent: false,
        vendorsSent: 0,
        vendorsFailed: 0,
        staffSent: false,
      },
    };

    // 1. Send customer receipt
    console.log(`[EmailService] Sending customer receipt to ${orderData.customerEmail}`);
    const customerTemplate = generateCustomerReceipt(orderData);
    results.customer = await this.sendWithRetry(
      orderData.customerEmail,
      customerTemplate.subject,
      customerTemplate.html,
      customerTemplate.text,
      "CUSTOMER",
      orderData.orderNumber
    );
    results.summary.customerSent = results.customer.success;

    // 2. Send vendor receipts (grouped by vendor)
    const vendorGroups = this.groupItemsByVendor(orderData);
    console.log(
      `[EmailService] Sending vendor receipts to ${vendorGroups.size} vendor(s)`
    );

    for (const [vendorEmail, vendorData] of vendorGroups) {
      console.log(`[EmailService] Sending vendor receipt to ${vendorEmail}`);
      const vendorTemplate = generateVendorReceipt(vendorData);
      const result = await this.sendWithRetry(
        vendorEmail,
        vendorTemplate.subject,
        vendorTemplate.html,
        vendorTemplate.text,
        "VENDOR",
        orderData.orderNumber
      );
      results.vendors.push(result);

      if (result.success) {
        results.summary.vendorsSent++;
      } else {
        results.summary.vendorsFailed++;
      }
    }

    // 3. Send staff notification
    if (STAFF_ENABLED && STAFF_EMAIL) {
      console.log(`[EmailService] Sending staff notification to ${STAFF_EMAIL}`);

      const totalItems = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
      const vendorBreakdown = this.buildVendorBreakdown(vendorGroups);

      const staffData: StaffNotificationData = {
        ...orderData,
        vendorCount: vendorGroups.size,
        totalItems,
        vendorBreakdown,
        emailResults: {
          customerSent: results.summary.customerSent,
          vendorsSent: results.summary.vendorsSent,
          vendorsFailed: results.summary.vendorsFailed,
        },
      };

      const staffTemplate = generateStaffNotification(staffData);
      results.staff = await this.sendWithRetry(
        STAFF_EMAIL,
        staffTemplate.subject,
        staffTemplate.html,
        staffTemplate.text,
        "STAFF",
        orderData.orderNumber
      );
      results.summary.staffSent = results.staff.success;
    } else {
      console.log("[EmailService] Staff notification disabled or no email configured");
    }

    // Check overall success
    results.allSuccess =
      results.customer.success &&
      results.vendors.every((v) => v.success) &&
      (results.staff === null || results.staff.success);

    console.log(
      `[EmailService] Email send complete for order ${orderData.orderNumber}:`,
      results.summary
    );

    return results;
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(to: string): Promise<EmailSendResult> {
    console.log(`[EmailService] Sending test email to ${to}`);

    const testData: OrderReceiptData = {
      orderNumber: "TEST-" + Date.now(),
      orderDate: new Date(),
      customerName: "Test Customer",
      customerEmail: to,
      customerPhone: "(555) 555-5555",
      items: [
        {
          productId: "test-product-1",
          productName: "Premium Stepping Shoes",
          variantName: "Size 10, Black",
          quantity: 1,
          unitPrice: 8999, // $89.99
          totalPrice: 8999,
          vendorName: "Dance Footwear Co.",
          vendorEmail: "vendor@example.com",
        },
        {
          productId: "test-product-2",
          productName: "Dance DVD Collection",
          quantity: 2,
          unitPrice: 2499, // $24.99
          totalPrice: 4998,
          vendorName: "SteppersLife Media",
          vendorEmail: "media@stepperslife.com",
        },
      ],
      subtotal: 13997,
      shippingCost: 999,
      taxAmount: 1225,
      totalAmount: 16221,
      shippingMethod: "DELIVERY",
      shippingAddress: {
        name: "Test Customer",
        address1: "123 Test Street",
        address2: "Apt 4B",
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
      },
      paymentStatus: "Pending - Pay When You Receive",
    };

    const template = generateCustomerReceipt(testData);

    return this.sendWithRetry(
      to,
      "[TEST] " + template.subject,
      template.html,
      template.text,
      "CUSTOMER",
      testData.orderNumber
    );
  }

  /**
   * Send individual email (for resend functionality)
   */
  async sendSingleEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
    recipientType: EmailRecipientType,
    orderNumber: string
  ): Promise<EmailSendResult> {
    return this.sendWithRetry(to, subject, html, text, recipientType, orderNumber);
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    staffEnabled: boolean;
    staffEmail: string;
    maxRetries: number;
    fromEmail: string;
  } {
    return {
      configured: this.isConfigured(),
      staffEnabled: STAFF_ENABLED,
      staffEmail: STAFF_EMAIL,
      maxRetries: MAX_RETRIES,
      fromEmail: this.fromEmail,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
