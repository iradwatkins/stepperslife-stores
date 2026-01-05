/**
 * Staff Notification System
 * Handles email notifications for restaurant staff invitations
 */

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Send staff invitation email
 * Called from restaurantStaff.inviteStaff mutation
 */
export const sendStaffInvitationEmail = action({
  args: {
    staffId: v.id("restaurantStaff"),
    email: v.string(),
    name: v.string(),
    restaurantName: v.string(),
    role: v.string(),
    invitedByName: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stepperslife.com";
    const loginUrl = `${baseUrl}/login?redirect=${encodeURIComponent("/user/dashboard")}`;
    const roleLabel = args.role === "RESTAURANT_MANAGER" ? "Manager" : "Staff Member";

    // Send email via Postal (self-hosted at postal.toolboxhosting.com)
    const POSTAL_API_KEY = process.env.POSTAL_API_KEY;
    const POSTAL_API_URL = process.env.POSTAL_API_URL || 'https://postal.toolboxhosting.com';

    if (!POSTAL_API_KEY) {
      // Log the failed attempt
      await ctx.runMutation(
        internal.notifications.staffNotifications.logNotification,
        {
          email: args.email,
          type: "STAFF_INVITATION",
          title: `Staff Invitation - ${args.restaurantName}`,
          body: `${args.name} invited to ${args.restaurantName} as ${roleLabel}`,
          status: "FAILED",
          error: "POSTAL_API_KEY not configured",
        }
      );

      console.warn("POSTAL_API_KEY not configured - email not sent");
      return { success: false, error: "Email service not configured" };
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">You're Invited!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Hi ${args.name},</p>

      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
        <strong>${args.invitedByName}</strong> has invited you to join <strong>${args.restaurantName}</strong> on SteppersLife as a <strong>${roleLabel}</strong>.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <p style="font-size: 14px; color: #92400e; margin: 0;">
          <strong>What you'll be able to do:</strong><br>
          ${args.role === "RESTAURANT_MANAGER"
            ? "Manage menu items, operating hours, orders, and staff members"
            : "View and manage incoming orders"}
        </p>
      </div>

      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
        To accept this invitation, sign in to your SteppersLife account. If you don't have an account yet, you can create one using this email address.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Sign In to Accept
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
        Once you sign in, you'll find the invitation in your dashboard. You can accept or decline it from there.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f4f4f5; padding: 24px 32px; text-align: center;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        This email was sent by SteppersLife. If you didn't expect this invitation, you can safely ignore it.
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
          to: [args.email],
          subject: `You're invited to join ${args.restaurantName} on SteppersLife`,
          html_body: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Postal API error: ${errorData}`);
      }

      const result = await response.json();

      // Log successful send
      await ctx.runMutation(
        internal.notifications.staffNotifications.logNotification,
        {
          email: args.email,
          type: "STAFF_INVITATION",
          title: `Staff Invitation - ${args.restaurantName}`,
          body: `${args.name} invited to ${args.restaurantName} as ${roleLabel}`,
          status: "SENT",
        }
      );

      return { success: true };
    } catch (error: any) {
      // Log failed send
      await ctx.runMutation(
        internal.notifications.staffNotifications.logNotification,
        {
          email: args.email,
          type: "STAFF_INVITATION",
          title: `Staff Invitation - ${args.restaurantName}`,
          body: `${args.name} invited to ${args.restaurantName} as ${roleLabel}`,
          status: "FAILED",
          error: error.message,
        }
      );

      console.error("Failed to send staff invitation email:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Internal mutation to log notification
 */
export const logNotification = internalMutation({
  args: {
    email: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("SENT"), v.literal("DELIVERED"), v.literal("FAILED")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificationLog", {
      type: args.type,
      title: args.title,
      body: args.body,
      status: args.status,
      error: args.error,
      sentAt: Date.now(),
    });
  },
});

/**
 * Send staff invitation accepted notification to restaurant owner
 */
export const sendInvitationAcceptedEmail = action({
  args: {
    ownerEmail: v.string(),
    ownerName: v.string(),
    staffName: v.string(),
    staffRole: v.string(),
    restaurantName: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const POSTAL_API_KEY = process.env.POSTAL_API_KEY;
    const POSTAL_API_URL = process.env.POSTAL_API_URL || 'https://postal.toolboxhosting.com';

    if (!POSTAL_API_KEY) {
      console.warn("POSTAL_API_KEY not configured - email not sent");
      return { success: false, error: "Email service not configured" };
    }

    const roleLabel = args.staffRole === "RESTAURANT_MANAGER" ? "Manager" : "Staff Member";
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stepperslife.com"}/restaurateur/dashboard/staff`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Invitation Accepted!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Hi ${args.ownerName},</p>

      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
        Great news! <strong>${args.staffName}</strong> has accepted your invitation to join <strong>${args.restaurantName}</strong> as a <strong>${roleLabel}</strong>.
      </p>

      <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
        They now have access to your restaurant's dashboard based on their assigned permissions.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Staff
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f4f4f5; padding: 24px 32px; text-align: center;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        This is an automated notification from SteppersLife.
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
          to: [args.ownerEmail],
          subject: `${args.staffName} joined ${args.restaurantName}`,
          html_body: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Postal API error: ${errorData}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Failed to send invitation accepted email:", error);
      return { success: false, error: error.message };
    }
  },
});
