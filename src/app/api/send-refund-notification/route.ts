import { NextRequest, NextResponse } from "next/server";
import { sendPostalEmail } from "@/lib/email/client";

const postalConfigured = !!process.env.POSTAL_API_KEY;

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@stepperslife.com";

interface RefundEmailRequest {
  email: string;
  customerName: string;
  eventName: string;
  eventDate?: number;
  refundAmount: number; // in cents
  ticketCount: number;
  orderNumber: string;
  refundReason?: string;
}

function refundNotificationTemplate(data: RefundEmailRequest): { subject: string; html: string } {
  const formattedAmount = (data.refundAmount / 100).toFixed(2);
  const formattedDate = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return {
    subject: `Refund Confirmation - ${data.eventName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: #1a1a1a; padding: 40px 30px; text-align: center; border-bottom: 3px solid #000000;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
                STEPPERSLIFE
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                Refund Confirmation
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Success Icon -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="margin: auto;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>

              <h2 style="margin: 0 0 15px 0; color: #333; font-size: 24px; text-align: center;">
                Your Refund Has Been Processed
              </h2>

              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; text-align: center; line-height: 1.6;">
                Hi ${data.customerName},<br><br>
                We've processed your refund for your ticket order. The refunded amount will appear in your account within 5-10 business days.
              </p>

              <!-- Refund Details -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">Refund Details</h4>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px; border-bottom: 1px solid #eee;">Event:</td>
                        <td align="right" style="padding: 10px 0; color: #333; font-size: 14px; font-weight: 600; border-bottom: 1px solid #eee;">${data.eventName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px; border-bottom: 1px solid #eee;">Event Date:</td>
                        <td align="right" style="padding: 10px 0; color: #333; font-size: 14px; border-bottom: 1px solid #eee;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px; border-bottom: 1px solid #eee;">Order Number:</td>
                        <td align="right" style="padding: 10px 0; color: #333; font-size: 14px; font-family: monospace; border-bottom: 1px solid #eee;">${data.orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px; border-bottom: 1px solid #eee;">Tickets Refunded:</td>
                        <td align="right" style="padding: 10px 0; color: #333; font-size: 14px; border-bottom: 1px solid #eee;">${data.ticketCount}</td>
                      </tr>
                      ${data.refundReason ? `
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px; border-bottom: 1px solid #eee;">Reason:</td>
                        <td align="right" style="padding: 10px 0; color: #333; font-size: 14px; border-bottom: 1px solid #eee;">${data.refundReason}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 15px 0 10px 0; color: #1a1a1a; font-weight: bold; font-size: 16px;">Refund Amount:</td>
                        <td align="right" style="padding: 15px 0 10px 0; color: #10b981; font-weight: bold; font-size: 20px;">$${formattedAmount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Timeline -->
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 5px; padding: 20px; margin-bottom: 30px;">
                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">⏱️ When Will I Get My Refund?</h4>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                  Refunds typically take 5-10 business days to appear in your account, depending on your bank or card issuer. If you don't see the refund after 10 business days, please contact your bank first, then reach out to us.
                </p>
              </div>

              <!-- Tickets Cancelled Notice -->
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 5px; padding: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">⚠️ Important Notice</h4>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                  Your tickets have been cancelled and can no longer be used for entry. The QR codes associated with this order are now invalid.
                </p>
              </div>

            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                Want to find another event?
              </p>
              <a href="https://stepperslife.com/events" style="display: inline-block; padding: 15px 30px; background-color: #1a1a1a; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                Browse Events
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #fafafa; padding: 30px; text-align: center; border-top: 2px solid #1a1a1a;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Questions about your refund? Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a; text-decoration: underline;">support@stepperslife.com</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} SteppersLife. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                <a href="https://stepperslife.com" style="color: #1a1a1a; text-decoration: underline;">Visit SteppersLife</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  try {
    if (!postalConfigured) {
      console.error("[REFUND_EMAIL] POSTAL_API_KEY is not configured");
      return NextResponse.json(
        { error: "Email service not configured", code: "EMAIL_SERVICE_UNAVAILABLE" },
        { status: 500 }
      );
    }

    let body: RefundEmailRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { email, customerName, eventName, refundAmount, ticketCount, orderNumber } = body;

    // Validate required fields
    if (!email || !customerName || !eventName || refundAmount === undefined || !ticketCount || !orderNumber) {
      return NextResponse.json(
        { error: "Missing required fields", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Generate email content
    const emailContent = refundNotificationTemplate(body);
    console.log(`[REFUND_EMAIL] Sending refund notification to ${email} for order ${orderNumber}`);

    // Send email via Postal (self-hosted)
    const emailResponse = await sendPostalEmail({
      from: `SteppersLife <${FROM_EMAIL}>`,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!emailResponse.success) {
      console.error(`[REFUND_EMAIL] Failed to send:`, emailResponse.error);
      return NextResponse.json(
        { error: "Failed to send refund notification", code: "SEND_FAILED" },
        { status: 500 }
      );
    }

    const duration = Date.now() - requestStartTime;
    console.log(`[REFUND_EMAIL] Successfully sent to ${email} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: "Refund notification sent successfully",
      emailId: emailResponse.messageId,
    });

  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error(`[REFUND_EMAIL] Error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        error: "Failed to send refund notification",
        code: "UNEXPECTED_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "refund-notification",
    configured: postalConfigured,
    timestamp: new Date().toISOString(),
  });
}
