/**
 * Professional E-commerce Email Templates for SteppersLife Marketplace
 *
 * Design principles:
 * - Clean, modern e-commerce design (similar to Amazon, Shopify)
 * - SteppersLife branding with primary blue (#1e9df1)
 * - Product images prominently displayed
 * - Mobile-responsive tables
 * - Clear call-to-action buttons
 * - Professional typography
 */

import {
  OrderReceiptData,
  VendorReceiptData,
  StaffNotificationData,
  EmailTemplate,
  OrderReceiptItem,
} from "./types";

// Brand colors - synced with site theme
const BRAND = {
  primary: "#1e9df1", // Primary blue
  primaryDark: "#1a8cd8",
  text: "#0f1419",
  textLight: "#72767a",
  border: "#e1eaef",
  background: "#f7f8f8",
  white: "#ffffff",
  success: "#00b87a",
  warning: "#f7b928",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) + " at " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// EMAIL HEADER COMPONENT
// ============================================================================

function emailHeader(title: string): string {
  return `
    <tr>
      <td style="padding: 30px 40px; background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND.white}; font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.5px;">
          SteppersLife
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); font-family: 'Helvetica Neue', Arial, sans-serif;">
          Marketplace
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
          ${escapeHtml(title)}
        </h2>
      </td>
    </tr>
  `;
}

// ============================================================================
// EMAIL FOOTER COMPONENT
// ============================================================================

function emailFooter(): string {
  return `
    <tr>
      <td style="padding: 30px 40px; background-color: ${BRAND.background}; text-align: center; border-top: 1px solid ${BRAND.border};">
        <p style="margin: 0 0 10px; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">
          Thank you for shopping with SteppersLife!
        </p>
        <p style="margin: 0 0 15px; font-size: 13px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">
          Questions? Email us at <a href="mailto:support@stepperslife.com" style="color: ${BRAND.primary};">support@stepperslife.com</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #999; font-family: 'Helvetica Neue', Arial, sans-serif;">
          &copy; ${new Date().getFullYear()} SteppersLife. All rights reserved.
        </p>
      </td>
    </tr>
  `;
}

// ============================================================================
// PRODUCT ITEM COMPONENT
// ============================================================================

function productItemRow(item: OrderReceiptItem & { productImage?: string }): string {
  const imageUrl = item.productImage || "https://stepperslife.com/images/placeholder-product.png";
  const itemName = item.variantName
    ? `${escapeHtml(item.productName)} - ${escapeHtml(item.variantName)}`
    : escapeHtml(item.productName);

  return `
    <tr>
      <td style="padding: 15px 0; border-bottom: 1px solid ${BRAND.border};">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="80" style="vertical-align: top; padding-right: 15px;">
              <img src="${imageUrl}" alt="${escapeHtml(item.productName)}" width="80" height="80" style="border-radius: 8px; object-fit: cover; background-color: ${BRAND.background};" />
            </td>
            <td style="vertical-align: top;">
              <p style="margin: 0 0 5px; font-size: 15px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                ${itemName}
              </p>
              ${item.vendorName ? `<p style="margin: 0 0 5px; font-size: 13px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Sold by: ${escapeHtml(item.vendorName)}</p>` : ""}
              <p style="margin: 0; font-size: 13px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                Qty: ${item.quantity} × ${formatCurrency(item.unitPrice)}
              </p>
            </td>
            <td width="100" style="vertical-align: top; text-align: right;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                ${formatCurrency(item.totalPrice)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

// ============================================================================
// CUSTOMER RECEIPT TEMPLATE
// ============================================================================

export function generateCustomerReceipt(data: OrderReceiptData): EmailTemplate {
  const subject = `Order Confirmed! #${data.orderNumber} - SteppersLife Marketplace`;
  const text = generateCustomerReceiptText(data);
  const html = generateCustomerReceiptHtml(data);
  return { subject, html, text };
}

function generateCustomerReceiptHtml(data: OrderReceiptData): string {
  const orderDate = formatDate(data.orderDate);

  // Generate product items HTML
  const itemsHtml = data.items.map(item => productItemRow(item as OrderReceiptItem & { productImage?: string })).join("");

  // Shipping info
  let shippingHtml = "";
  if (data.shippingMethod === "DELIVERY" && data.shippingAddress) {
    shippingHtml = `
      <tr>
        <td style="padding: 20px; background-color: ${BRAND.background}; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
            📦 Shipping To:
          </p>
          <p style="margin: 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.5;">
            ${escapeHtml(data.shippingAddress.name)}<br>
            ${escapeHtml(data.shippingAddress.address1)}<br>
            ${data.shippingAddress.address2 ? escapeHtml(data.shippingAddress.address2) + "<br>" : ""}
            ${escapeHtml(data.shippingAddress.city)}, ${escapeHtml(data.shippingAddress.state)} ${escapeHtml(data.shippingAddress.zipCode)}
          </p>
        </td>
      </tr>
    `;
  } else {
    shippingHtml = `
      <tr>
        <td style="padding: 20px; background-color: ${BRAND.background}; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
            🏪 Pickup Order
          </p>
          <p style="margin: 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.5;">
            You will be contacted with pickup details.
            ${data.pickupNotes ? "<br>Notes: " + escapeHtml(data.pickupNotes) : ""}
          </p>
        </td>
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Order Confirmation - ${data.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: ${BRAND.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          ${emailHeader("Order Confirmed!")}

          <!-- Order Number Box -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.background}; border-radius: 8px; padding: 20px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px; font-size: 13px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                      Order Number
                    </p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${BRAND.primary}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                      ${escapeHtml(data.orderNumber)}
                    </p>
                    <p style="margin: 10px 0 0; font-size: 13px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                      ${orderDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Section -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                Your Items
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 2px solid ${BRAND.border}; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Subtotal</td>
                  <td style="padding: 8px 0; font-size: 14px; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${formatCurrency(data.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Shipping</td>
                  <td style="padding: 8px 0; font-size: 14px; color: ${data.shippingCost === 0 ? BRAND.success : BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${data.shippingCost === 0 ? "FREE" : formatCurrency(data.shippingCost)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Tax</td>
                  <td style="padding: 8px 0; font-size: 14px; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${formatCurrency(data.taxAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 0 0; font-size: 18px; font-weight: 700; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; border-top: 2px solid ${BRAND.border};">Total</td>
                  <td style="padding: 15px 0 0; font-size: 18px; font-weight: 700; color: ${BRAND.primary}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right; border-top: 2px solid ${BRAND.border};">${formatCurrency(data.totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Info -->
          <tr>
            <td style="padding: 10px 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${shippingHtml}
              </table>
            </td>
          </tr>

          <!-- What's Next -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid ${BRAND.warning};">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #92400E; font-family: 'Helvetica Neue', Arial, sans-serif;">
                      What's Next?
                    </p>
                    <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #B45309; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                      <li>Your order is being prepared by our vendors</li>
                      <li>You'll receive tracking info when shipped</li>
                      <li>Payment will be collected upon ${data.shippingMethod === "PICKUP" ? "pickup" : "delivery"}</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- View Order Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="https://stepperslife.com/marketplace/orders" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); color: ${BRAND.white}; text-decoration: none; font-size: 15px; font-weight: 600; font-family: 'Helvetica Neue', Arial, sans-serif; border-radius: 8px;">
                View My Orders
              </a>
            </td>
          </tr>

          ${emailFooter()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateCustomerReceiptText(data: OrderReceiptData): string {
  const lines: string[] = [];

  lines.push("========================================");
  lines.push("        STEPPERSLIFE MARKETPLACE");
  lines.push("           ORDER CONFIRMATION");
  lines.push("========================================");
  lines.push("");
  lines.push(`Order Number: ${data.orderNumber}`);
  lines.push(`Date: ${formatDate(data.orderDate)}`);
  lines.push("");
  lines.push("----------------------------------------");
  lines.push("YOUR ITEMS:");
  lines.push("----------------------------------------");

  for (const item of data.items) {
    const itemName = item.variantName
      ? `${item.productName} - ${item.variantName}`
      : item.productName;
    lines.push(`${itemName}`);
    lines.push(`  Qty: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.totalPrice)}`);
    lines.push("");
  }

  lines.push("----------------------------------------");
  lines.push(`Subtotal:  ${formatCurrency(data.subtotal)}`);
  lines.push(`Shipping:  ${data.shippingCost === 0 ? "FREE" : formatCurrency(data.shippingCost)}`);
  lines.push(`Tax:       ${formatCurrency(data.taxAmount)}`);
  lines.push("----------------------------------------");
  lines.push(`TOTAL:     ${formatCurrency(data.totalAmount)}`);
  lines.push("========================================");
  lines.push("");

  if (data.shippingMethod === "DELIVERY" && data.shippingAddress) {
    lines.push("SHIPPING TO:");
    lines.push(data.shippingAddress.name);
    lines.push(data.shippingAddress.address1);
    if (data.shippingAddress.address2) lines.push(data.shippingAddress.address2);
    lines.push(`${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode}`);
  } else {
    lines.push("PICKUP ORDER");
    lines.push("You will be contacted with pickup details.");
  }

  lines.push("");
  lines.push("WHAT'S NEXT?");
  lines.push("1. Your order is being prepared");
  lines.push("2. You'll receive tracking info when shipped");
  lines.push("3. Pay upon delivery/pickup");
  lines.push("");
  lines.push("View your orders: https://stepperslife.com/marketplace/orders");
  lines.push("");
  lines.push("Thank you for shopping with SteppersLife!");
  lines.push("Questions? Email: support@stepperslife.com");

  return lines.join("\n");
}

// ============================================================================
// VENDOR ALERT TEMPLATE
// ============================================================================

export function generateVendorReceipt(data: VendorReceiptData): EmailTemplate {
  const itemCount = data.vendorItems.reduce((sum, item) => sum + item.quantity, 0);
  const subject = `🔔 New Order! #${data.orderNumber} - ${itemCount} item${itemCount !== 1 ? "s" : ""} to fulfill`;
  const text = generateVendorReceiptText(data);
  const html = generateVendorReceiptHtml(data);
  return { subject, html, text };
}

function generateVendorReceiptHtml(data: VendorReceiptData): string {
  const itemCount = data.vendorItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemsHtml = data.vendorItems.map(item => productItemRow(item as OrderReceiptItem & { productImage?: string })).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order - ${data.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: ${BRAND.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          ${emailHeader("New Order Alert!")}

          <!-- Order Info -->
          <tr>
            <td style="padding: 0 40px 20px; text-align: center;">
              <p style="margin: 0; font-size: 16px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                You have <strong style="color: ${BRAND.primary};">${itemCount} item${itemCount !== 1 ? "s" : ""}</strong> to fulfill
              </p>
              <p style="margin: 10px 0 0; font-size: 20px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                Order #${escapeHtml(data.orderNumber)}
              </p>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.background}; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                      👤 Customer Information
                    </p>
                    <p style="margin: 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.5;">
                      <strong>${escapeHtml(data.customerName)}</strong><br>
                      ${escapeHtml(data.customerEmail)}<br>
                      ${data.customerPhone ? escapeHtml(data.customerPhone) : "No phone provided"}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items to Fulfill -->
          <tr>
            <td style="padding: 0 40px;">
              <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                📦 Items to Fulfill
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Vendor Total -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 2px solid ${BRAND.border}; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 18px; font-weight: 700; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">Your Total</td>
                  <td style="padding: 8px 0; font-size: 18px; font-weight: 700; color: ${BRAND.primary}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${formatCurrency(data.vendorSubtotal)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Required -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #DBEAFE; border-radius: 8px; border-left: 4px solid #3B82F6;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #1E40AF; font-family: 'Helvetica Neue', Arial, sans-serif;">
                      ⚡ Action Required
                    </p>
                    <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #1E40AF; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                      <li>Prepare the items for shipping</li>
                      <li>Update order status in your dashboard</li>
                      <li>Ship within 2 business days</li>
                      <li>Add tracking number when shipped</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- View Dashboard Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="https://stepperslife.com/vendor/dashboard/orders" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); color: ${BRAND.white}; text-decoration: none; font-size: 15px; font-weight: 600; font-family: 'Helvetica Neue', Arial, sans-serif; border-radius: 8px;">
                Go to Vendor Dashboard
              </a>
            </td>
          </tr>

          ${emailFooter()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateVendorReceiptText(data: VendorReceiptData): string {
  const lines: string[] = [];
  const itemCount = data.vendorItems.reduce((sum, item) => sum + item.quantity, 0);

  lines.push("========================================");
  lines.push("    STEPPERSLIFE - NEW ORDER ALERT");
  lines.push("========================================");
  lines.push("");
  lines.push(`Order #${data.orderNumber}`);
  lines.push(`Date: ${formatDate(data.orderDate)}`);
  lines.push("");
  lines.push("CUSTOMER:");
  lines.push(`  ${data.customerName}`);
  lines.push(`  ${data.customerEmail}`);
  if (data.customerPhone) lines.push(`  ${data.customerPhone}`);
  lines.push("");
  lines.push(`ITEMS TO FULFILL (${itemCount}):`);
  lines.push("----------------------------------------");

  for (const item of data.vendorItems) {
    const itemName = item.variantName
      ? `${item.productName} - ${item.variantName}`
      : item.productName;
    lines.push(itemName);
    lines.push(`  Qty: ${item.quantity} = ${formatCurrency(item.totalPrice)}`);
    lines.push("");
  }

  lines.push("----------------------------------------");
  lines.push(`YOUR TOTAL: ${formatCurrency(data.vendorSubtotal)}`);
  lines.push("========================================");
  lines.push("");
  lines.push("ACTION REQUIRED:");
  lines.push("1. Prepare items for shipping");
  lines.push("2. Update order status in dashboard");
  lines.push("3. Ship within 2 business days");
  lines.push("4. Add tracking when shipped");
  lines.push("");
  lines.push("Dashboard: https://stepperslife.com/vendor/dashboard/orders");

  return lines.join("\n");
}

// ============================================================================
// STAFF NOTIFICATION TEMPLATE
// ============================================================================

export function generateStaffNotification(data: StaffNotificationData): EmailTemplate {
  const subject = `[STAFF] New Order #${data.orderNumber} - ${formatCurrency(data.totalAmount)}`;
  const text = generateStaffNotificationText(data);
  const html = generateStaffNotificationHtml(data);
  return { subject, html, text };
}

function generateStaffNotificationHtml(data: StaffNotificationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff Notification - Order ${data.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: ${BRAND.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          ${emailHeader("Staff Order Notification")}

          <!-- Order Summary -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.background}; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Order #</td>
                        <td style="padding: 5px 0; font-size: 14px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${escapeHtml(data.orderNumber)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Customer</td>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${escapeHtml(data.customerName)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Email</td>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${escapeHtml(data.customerEmail)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Total Items</td>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${data.totalItems}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">Vendors</td>
                        <td style="padding: 5px 0; font-size: 14px; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${data.vendorCount}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 15px 0 0; border-top: 1px solid ${BRAND.border};"></td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 18px; font-weight: 700; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">Total</td>
                        <td style="padding: 5px 0; font-size: 18px; font-weight: 700; color: ${BRAND.primary}; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: right;">${formatCurrency(data.totalAmount)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Status -->
          ${data.emailResults ? `
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: ${BRAND.text}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                📧 Email Status
              </p>
              <p style="margin: 0; font-size: 14px; color: ${BRAND.textLight}; font-family: 'Helvetica Neue', Arial, sans-serif;">
                Customer: ${data.emailResults.customerSent ? "✅ Sent" : "❌ Failed"}<br>
                Vendors: ${data.emailResults.vendorsSent}/${data.emailResults.vendorsSent + data.emailResults.vendorsFailed} sent
              </p>
            </td>
          </tr>
          ` : ""}

          <!-- Admin Dashboard Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="https://stepperslife.com/admin/product-orders" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); color: ${BRAND.white}; text-decoration: none; font-size: 15px; font-weight: 600; font-family: 'Helvetica Neue', Arial, sans-serif; border-radius: 8px;">
                View in Admin Dashboard
              </a>
            </td>
          </tr>

          ${emailFooter()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateStaffNotificationText(data: StaffNotificationData): string {
  const lines: string[] = [];

  lines.push("========================================");
  lines.push("   STEPPERSLIFE STAFF NOTIFICATION");
  lines.push("========================================");
  lines.push("");
  lines.push(`Order #${data.orderNumber}`);
  lines.push(`Date: ${formatDate(data.orderDate)}`);
  lines.push("");
  lines.push("CUSTOMER:");
  lines.push(`  ${data.customerName}`);
  lines.push(`  ${data.customerEmail}`);
  lines.push("");
  lines.push("ORDER SUMMARY:");
  lines.push(`  Total Items: ${data.totalItems}`);
  lines.push(`  Vendors: ${data.vendorCount}`);
  lines.push(`  Subtotal: ${formatCurrency(data.subtotal)}`);
  lines.push(`  Shipping: ${data.shippingCost === 0 ? "FREE" : formatCurrency(data.shippingCost)}`);
  lines.push(`  Tax: ${formatCurrency(data.taxAmount)}`);
  lines.push(`  TOTAL: ${formatCurrency(data.totalAmount)}`);
  lines.push("");

  if (data.emailResults) {
    lines.push("EMAIL STATUS:");
    lines.push(`  Customer: ${data.emailResults.customerSent ? "Sent" : "Failed"}`);
    lines.push(`  Vendors: ${data.emailResults.vendorsSent}/${data.emailResults.vendorsSent + data.emailResults.vendorsFailed} sent`);
    lines.push("");
  }

  lines.push("Admin: https://stepperslife.com/admin/product-orders");

  return lines.join("\n");
}
