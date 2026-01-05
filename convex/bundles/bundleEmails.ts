/**
 * Bundle Purchase Email Notifications
 * Sends confirmation emails after bundle purchases
 */

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Self-hosted Convex backend URL for resolving storage URLs
 */
const CONVEX_BACKEND_URL = "https://convex.toolboxhosting.com";

/**
 * Helper to resolve storage URLs to full absolute URLs
 */
function resolveStorageUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${CONVEX_BACKEND_URL}${url}`;
  return url;
}

/**
 * Internal mutation to get bundle purchase data for email
 * Actions can't directly access ctx.db, so we use this helper
 */
export const getBundlePurchaseDataForEmail = internalMutation({
  args: {
    purchaseId: v.id("bundlePurchases"),
  },
  handler: async (ctx, args) => {
    // Get the purchase record
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      return { success: false as const, error: "Purchase not found" };
    }

    // Get the bundle details
    const bundle = await ctx.db.get(purchase.bundleId);
    if (!bundle) {
      return { success: false as const, error: "Bundle not found" };
    }

    // Get the event (bundles are tied to an event)
    const event = bundle.eventId ? await ctx.db.get(bundle.eventId) : null;

    // Get the tickets created for this purchase
    const tickets = purchase.ticketIds
      ? await Promise.all(
          purchase.ticketIds.map((id) => ctx.db.get(id as Id<"tickets">))
        )
      : [];

    // Get event image URL
    let imageUrl = event?.imageUrl ? resolveStorageUrl(event.imageUrl) : undefined;
    if (!imageUrl && event?.images && event.images.length > 0) {
      try {
        const url = await ctx.storage.getUrl(event.images[0]);
        imageUrl = resolveStorageUrl(url);
      } catch {
        // Ignore storage errors
      }
    }

    return {
      success: true as const,
      purchase: {
        _id: purchase._id,
        buyerName: purchase.buyerName,
        buyerEmail: purchase.buyerEmail,
        quantity: purchase.quantity,
        totalPaidCents: purchase.totalPaidCents,
        purchaseDate: purchase.purchaseDate,
      },
      bundle: {
        name: bundle.name,
        description: bundle.description,
        priceCents: bundle.price, // schema uses 'price' in cents
      },
      event: event
        ? {
            name: event.name,
            startDate: event.startDate,
            // Location can be string or object - extract city/state if object
            city: typeof event.location === "object" ? event.location?.city : undefined,
            state: typeof event.location === "object" ? event.location?.state : undefined,
            locationString: typeof event.location === "string" ? event.location : undefined,
            imageUrl,
          }
        : null,
      tickets: tickets.filter(Boolean).map((t) => ({
        ticketCode: t?.ticketCode,
        attendeeName: t?.attendeeName,
      })),
    };
  },
});

/**
 * Send bundle purchase confirmation email
 * Called after a successful bundle purchase
 */
export const sendBundlePurchaseConfirmation = action({
  args: {
    purchaseId: v.id("bundlePurchases"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Get purchase data
    const data = await ctx.runMutation(
      internal.bundles.bundleEmails.getBundlePurchaseDataForEmail,
      { purchaseId: args.purchaseId }
    );

    if (!data.success) {
      console.error(`[sendBundlePurchaseConfirmation] Failed to get data:`, data.error);
      return { success: false, error: data.error };
    }

    const { purchase, bundle, event, tickets } = data;

    // Skip if no valid email
    if (!purchase.buyerEmail || purchase.buyerEmail.includes("@temp.local")) {
      console.log(`[sendBundlePurchaseConfirmation] Skipping - no valid email`);
      return { success: true };
    }

    // Get Postal config
    const POSTAL_API_KEY = process.env.POSTAL_API_KEY;
    const POSTAL_API_URL = process.env.POSTAL_API_URL || "https://postal.toolboxhosting.com";

    if (!POSTAL_API_KEY) {
      console.warn("[sendBundlePurchaseConfirmation] POSTAL_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    // Format date
    const purchaseDate = new Date(purchase.purchaseDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const eventDate = event?.startDate
      ? new Date(event.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "See event details";

    // Format price
    const totalPaid = ((purchase.totalPaidCents || 0) / 100).toFixed(2);

    // Build ticket list HTML
    const ticketListHtml = tickets
      .map(
        (t) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${t.ticketCode || "N/A"}</code>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
            ${t.attendeeName || purchase.buyerName}
          </td>
        </tr>
      `
      )
      .join("");

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Bundle Purchase Confirmed!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
        Hi ${purchase.buyerName},
      </p>

      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
        Thank you for your purchase! Your <strong>${bundle.name}</strong> bundle has been confirmed.
      </p>

      <!-- Purchase Summary -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px;">Purchase Summary</h3>
        <table style="width: 100%; font-size: 14px; color: #374151;">
          <tr>
            <td style="padding: 8px 0;">Bundle:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${bundle.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Quantity:</td>
            <td style="padding: 8px 0; text-align: right;">${purchase.quantity}x</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Total Paid:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #059669;">$${totalPaid}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Purchase Date:</td>
            <td style="padding: 8px 0; text-align: right;">${purchaseDate}</td>
          </tr>
        </table>
      </div>

      ${
        event
          ? `
      <!-- Event Info -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <h4 style="margin: 0 0 8px; color: #92400e;">Event Details</h4>
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>${event.name}</strong><br>
          ${eventDate}<br>
          ${event.city || event.locationString || ""}, ${event.state || ""}
        </p>
      </div>
      `
          : ""
      }

      <!-- Tickets Section -->
      ${
        tickets.length > 0
          ? `
      <h3 style="margin: 24px 0 16px; color: #111827; font-size: 16px;">Your Tickets (${tickets.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Ticket Code</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Attendee</th>
          </tr>
        </thead>
        <tbody>
          ${ticketListHtml}
        </tbody>
      </table>
      <p style="font-size: 12px; color: #6b7280; margin: 16px 0 0;">
        Present these ticket codes at the event entrance. You can also view your tickets in your SteppersLife account.
      </p>
      `
          : ""
      }

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://stepperslife.com/user/bundles" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View My Bundles
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f4f4f5; padding: 24px 32px; text-align: center;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        This email was sent by SteppersLife. If you have questions about your purchase, please contact us at support@stepperslife.com
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const response = await fetch(`${POSTAL_API_URL}/api/v1/send/message`, {
        method: "POST",
        headers: {
          "X-Server-API-Key": POSTAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SteppersLife <noreply@stepperslife.com>",
          to: [purchase.buyerEmail],
          subject: `Your ${bundle.name} Bundle Purchase is Confirmed!`,
          html_body: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Postal API error: ${errorData}`);
      }

      console.log(`[sendBundlePurchaseConfirmation] Email sent to ${purchase.buyerEmail}`);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[sendBundlePurchaseConfirmation] Failed to send email:", error);
      return { success: false, error: errorMessage };
    }
  },
});
