import { NextRequest, NextResponse } from "next/server";
import { sendPostalEmail } from "@/lib/email/client";

const postalConfigured = !!process.env.POSTAL_API_KEY;

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@stepperslife.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@stepperslife.com";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SupportEmailRequest {
  subject: string;
  message: string;
  userEmail: string;
  userName: string;
}

function supportEmailTemplate(data: SupportEmailRequest): { subject: string; html: string } {
  return {
    subject: `[Support Request] ${data.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #333; margin: 0; font-size: 24px;">New Support Request</h1>
    </div>

    <div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">From:</p>
      <p style="margin: 0; color: #333; font-weight: 600;">${data.userName}</p>
      <p style="margin: 4px 0 0 0; color: #666;">${data.userEmail}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Subject:</p>
      <p style="margin: 0; color: #333; font-weight: 600; font-size: 18px;">${data.subject}</p>
    </div>

    <div style="border-top: 1px solid #eee; padding-top: 20px;">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Message:</p>
      <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${data.message}</div>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
      <a href="mailto:${data.userEmail}?subject=Re: ${encodeURIComponent(data.subject)}"
         style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        Reply to User
      </a>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
    <p>This is an automated message from SteppersLife Support System</p>
    <p>${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `.trim(),
  };
}

function userConfirmationTemplate(data: SupportEmailRequest): { subject: string; html: string } {
  return {
    subject: `We received your support request: ${data.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Request Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1 style="color: #333; margin: 0; font-size: 24px;">We Got Your Message!</h1>
    </div>

    <p style="color: #666; line-height: 1.6; text-align: center;">
      Hi ${data.userName},<br><br>
      Thank you for reaching out to SteppersLife support. We've received your request and will respond within 24 hours.
    </p>

    <div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Your request:</p>
      <p style="margin: 0; color: #333; font-weight: 600;">${data.subject}</p>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center;">
      In the meantime, you can check our <a href="https://stepperslife.com/help" style="color: #4f46e5;">Help Center</a> for quick answers.
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
    <p>SteppersLife - Where Steppers Connect</p>
    <p><a href="https://stepperslife.com" style="color: #666;">stepperslife.com</a></p>
  </div>
</body>
</html>
    `.trim(),
  };
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  try {
    if (!postalConfigured) {
      console.error("[SUPPORT_EMAIL] POSTAL_API_KEY is not configured");
      return NextResponse.json(
        { error: "Email service not configured", code: "EMAIL_SERVICE_UNAVAILABLE" },
        { status: 500 }
      );
    }

    let body: SupportEmailRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { subject, message, userEmail, userName } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Send email to support team via Postal (self-hosted)
    const supportEmailContent = supportEmailTemplate(body);
    console.log(`[SUPPORT_EMAIL] Sending support request from ${userEmail}`);

    const supportEmailResponse = await sendPostalEmail({
      from: `SteppersLife Support <${FROM_EMAIL}>`,
      to: SUPPORT_EMAIL,
      subject: supportEmailContent.subject,
      html: supportEmailContent.html,
    });

    if (!supportEmailResponse.success) {
      console.error(`[SUPPORT_EMAIL] Failed to send to support:`, supportEmailResponse.error);
      return NextResponse.json(
        { error: "Failed to send support request", code: "SEND_FAILED" },
        { status: 500 }
      );
    }

    // Send confirmation to user if they provided a valid email
    if (userEmail !== "anonymous" && emailRegex.test(userEmail)) {
      const userConfirmation = userConfirmationTemplate(body);
      try {
        await sendPostalEmail({
          from: `SteppersLife <${FROM_EMAIL}>`,
          to: userEmail,
          subject: userConfirmation.subject,
          html: userConfirmation.html,
        });
        console.log(`[SUPPORT_EMAIL] Confirmation sent to ${userEmail}`);
      } catch (confirmError) {
        // Don't fail if confirmation email fails
        console.warn(`[SUPPORT_EMAIL] Failed to send confirmation to user:`, confirmError);
      }
    }

    const duration = Date.now() - requestStartTime;
    console.log(`[SUPPORT_EMAIL] Successfully processed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: "Support request submitted successfully",
    });

  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error(`[SUPPORT_EMAIL] Error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        error: "Failed to send support request",
        code: "UNEXPECTED_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "support-email",
    configured: postalConfigured,
    supportEmail: SUPPORT_EMAIL,
    timestamp: new Date().toISOString(),
  });
}
