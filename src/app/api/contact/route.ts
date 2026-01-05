import { NextRequest, NextResponse } from "next/server";
import { sendPostalEmail, FROM_EMAIL, SUPPORT_EMAIL } from "@/lib/email/client";

// Simple in-memory rate limiting
// In production, you'd use Redis or a database
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // Max 5 requests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

function getRateLimitKey(request: NextRequest): string {
  // Get IP from various headers (Cloudflare, proxy, or direct)
  const forwarded = request.headers.get("x-forwarded-for");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  const realIp = request.headers.get("x-real-ip");

  return cfConnectingIp || forwarded?.split(",")[0]?.trim() || realIp || "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// Email validation regex
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize input to prevent injection attacks
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const ip = getRateLimitKey(request);
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED"
        },
        {
          status: 429,
          headers: {
            "Retry-After": "3600",
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
          }
        }
      );
    }

    // Parse request body
    let body: ContactFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = body;

    // Validation
    const errors: { field: string; message: string }[] = [];

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push({ field: "name", message: "Name is required" });
    } else if (name.trim().length < 2) {
      errors.push({ field: "name", message: "Name must be at least 2 characters" });
    } else if (name.trim().length > 100) {
      errors.push({ field: "name", message: "Name must be less than 100 characters" });
    }

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      errors.push({ field: "email", message: "Email is required" });
    } else if (!isValidEmail(email.trim())) {
      errors.push({ field: "email", message: "Please enter a valid email address" });
    }

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      errors.push({ field: "subject", message: "Subject is required" });
    } else if (subject.trim().length < 3) {
      errors.push({ field: "subject", message: "Subject must be at least 3 characters" });
    } else if (subject.trim().length > 200) {
      errors.push({ field: "subject", message: "Subject must be less than 200 characters" });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      errors.push({ field: "message", message: "Message is required" });
    } else if (message.trim().length < 10) {
      errors.push({ field: "message", message: "Message must be at least 10 characters" });
    } else if (message.trim().length > 5000) {
      errors.push({ field: "message", message: "Message must be less than 5000 characters" });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", errors },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name.trim());
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedSubject = sanitizeInput(subject.trim());
    const sanitizedMessage = sanitizeInput(message.trim());

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #666; width: 100px;">From:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${sanitizedName}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #666;">Email:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <a href="mailto:${sanitizedEmail}" style="color: #0066cc; text-decoration: none;">${sanitizedEmail}</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #666;">Subject:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${sanitizedSubject}</td>
      </tr>
    </table>

    <div style="margin-top: 24px;">
      <h3 style="color: #333; margin: 0 0 12px 0; font-size: 16px;">Message:</h3>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; white-space: pre-wrap; word-wrap: break-word;">
${sanitizedMessage}
      </div>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      <p style="margin: 0;">This message was sent from the SteppersLife contact form.</p>
      <p style="margin: 4px 0 0 0;">Received at: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} (Central Time)</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Build plain text version
    const emailText = `
New Contact Form Submission
============================

From: ${sanitizedName}
Email: ${sanitizedEmail}
Subject: ${sanitizedSubject}

Message:
--------
${sanitizedMessage}

---
This message was sent from the SteppersLife contact form.
Received at: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} (Central Time)
    `.trim();

    // Send email via Postal
    const result = await sendPostalEmail({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      subject: `[Contact Form] ${sanitizedSubject}`,
      html: emailHtml,
      text: emailText,
      replyTo: sanitizedEmail,
    });

    if (!result.success) {
      console.error("[Contact API] Failed to send email:", result.error);
      return NextResponse.json(
        {
          error: "Failed to send message. Please try again later.",
          code: "EMAIL_SEND_FAILED"
        },
        { status: 500 }
      );
    }

    console.log(`[Contact API] Email sent successfully. MessageId: ${result.messageId}`);

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been sent successfully. We'll get back to you within 24-48 hours."
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        }
      }
    );

  } catch (error) {
    console.error("[Contact API] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again later.",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}

// Return 405 for non-POST requests
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    { status: 405 }
  );
}
