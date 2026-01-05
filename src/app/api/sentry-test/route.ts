import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // Test different types of errors

    // 1. Capture a test message
    Sentry.captureMessage("Sentry Test: Manual test from /api/sentry-test", "info");

    // 2. Log a breadcrumb
    Sentry.addBreadcrumb({
      category: "test",
      message: "Test breadcrumb before error",
      level: "info",
    });

    // 3. Trigger an actual error (commented out by default)
    // throw new Error('Sentry Test Error: This is a test error to verify Sentry integration');

    return NextResponse.json({
      success: true,
      message: "Sentry test completed successfully",
      details: {
        messageSent: "Sentry Test: Manual test from /api/sentry-test",
        breadcrumbAdded: "Test breadcrumb before error",
        note: "Check your Sentry dashboard at https://sentry.io for the test message",
        uncomment:
          "To test error capture, uncomment the throw line in /app/api/sentry-test/route.ts",
      },
    });
  } catch (error: any) {
    // Capture the error with Sentry
    Sentry.captureException(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        sentryNotified: true,
      },
      { status: 500 }
    );
  }
}
