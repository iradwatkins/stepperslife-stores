import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { randomUUID } from "crypto";

/** Generate or extract request ID for tracking */
function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") || `paypal-refund-${randomUUID()}`;
}

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_ENVIRONMENT === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

// Timeout for PayPal API calls (30 seconds)
const PAYPAL_TIMEOUT_MS = 30000;

// Max retry attempts
const MAX_RETRIES = 3;

// Lazy-initialize Convex client to avoid build-time errors
let _convex: ConvexHttpClient | null = null;
function getConvex(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    }
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

/**
 * Type-safe error message extraction
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
  baseDelay = 1000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAYPAL_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Retry on 5xx errors or rate limiting
    if ((response.status >= 500 || response.status === 429) && retries > 0) {
      const delay = baseDelay * Math.pow(2, MAX_RETRIES - retries);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, baseDelay);
    }

    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      if (retries > 0) {
        const delay = baseDelay * Math.pow(2, MAX_RETRIES - retries);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, baseDelay);
      }
      throw new Error("PayPal API request timed out after multiple attempts");
    }

    if (retries > 0) {
      const delay = baseDelay * Math.pow(2, MAX_RETRIES - retries);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, baseDelay);
    }

    throw error;
  }
}

/**
 * Get PayPal access token with retry logic
 */
async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const response = await fetchWithRetry(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[PayPal Refund] Failed to get access token:", response.status, errorText);
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get order details from PayPal to find the capture ID
 */
async function getPayPalOrderDetails(accessToken: string, paypalOrderId: string): Promise<{
  captureId: string | null;
  status: string;
  amount: { value: string; currency_code: string } | null;
}> {
  const response = await fetchWithRetry(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[PayPal Refund] Failed to get order details:", response.status, errorText);
    throw new Error(`Failed to get PayPal order details: ${response.status}`);
  }

  const orderData = await response.json();

  // Extract the capture ID from the first purchase unit
  const captureId = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
  const captureAmount = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.amount || null;

  return {
    captureId,
    status: orderData.status,
    amount: captureAmount,
  };
}

/**
 * Issue PayPal Refund
 * POST /api/paypal/refund
 *
 * Request body:
 * - paypalOrderId: string (required) - The PayPal order ID
 * - captureId: string (optional) - The capture ID (if known, skips order lookup)
 * - amount: number (optional) - Refund amount in cents (for partial refunds)
 * - reason: string (optional) - Reason for refund
 * - steppersLifeOrderId: string (optional) - Internal order ID to update
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error(`[PayPal Refund] [${requestId}] PayPal not configured`);
      return NextResponse.json(
        { error: "PayPal is not configured", requestId },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      paypalOrderId,
      captureId: providedCaptureId,
      amount, // Amount in cents
      reason,
      steppersLifeOrderId,
    } = body;

    console.log(`[PayPal Refund] [${requestId}] Processing refund for order: ${paypalOrderId || 'N/A'}, capture: ${providedCaptureId || 'N/A'}`);

    // Validate required fields
    if (!paypalOrderId && !providedCaptureId) {
      return NextResponse.json(
        { error: "Either paypalOrderId or captureId is required", requestId },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    // Get the capture ID if not provided
    let captureId = providedCaptureId;
    let originalAmount: { value: string; currency_code: string } | null = null;

    if (!captureId && paypalOrderId) {
      const orderDetails = await getPayPalOrderDetails(accessToken, paypalOrderId);

      if (!orderDetails.captureId) {
        return NextResponse.json(
          {
            error: "No capture found for this PayPal order. The order may not have been completed.",
            orderStatus: orderDetails.status,
            requestId,
          },
          { status: 400 }
        );
      }

      captureId = orderDetails.captureId;
      originalAmount = orderDetails.amount;
    }

    // Build refund request body
    interface RefundRequestBody {
      note_to_payer?: string;
      amount?: {
        value: string;
        currency_code: string;
      };
    }

    const refundBody: RefundRequestBody = {};

    if (reason) {
      refundBody.note_to_payer = reason.substring(0, 127); // PayPal limit is 127 chars
    }

    // If amount is specified, do a partial refund
    if (amount && amount > 0) {
      // Convert cents to dollars for PayPal API
      const amountDollars = (amount / 100).toFixed(2);
      refundBody.amount = {
        value: amountDollars,
        currency_code: "USD",
      };
    }

    // Issue the refund
    const refundResponse = await fetchWithRetry(
      `${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refundBody),
      }
    );

    if (!refundResponse.ok) {
      const errorData = await refundResponse.json();
      console.error("[PayPal Refund] Refund request failed:", errorData);

      // Check for specific error cases
      const errorName = errorData.name || errorData.error;
      if (errorName === "UNPROCESSABLE_ENTITY") {
        // Check if already refunded
        const details = errorData.details || [];
        const alreadyRefunded = details.some(
          (d: { issue?: string }) => d.issue === "CAPTURE_FULLY_REFUNDED"
        );

        if (alreadyRefunded) {
          return NextResponse.json(
            {
              error: "This payment has already been fully refunded",
              code: "ALREADY_REFUNDED",
              requestId,
            },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to process PayPal refund",
          details: errorData,
          code: "PAYPAL_REFUND_FAILED",
          requestId,
        },
        { status: 500 }
      );
    }

    const refundData = await refundResponse.json();

    console.log(`[PayPal Refund] Refund successful: ${refundData.id}, status: ${refundData.status}`);

    // Update the SteppersLife order if provided
    if (steppersLifeOrderId || paypalOrderId) {
      try {
        if (paypalOrderId) {
          // Use the PayPal-specific refund mutation
          await getConvex().mutation(api.orders.mutations.markOrderRefundedByPaypalId, {
            paypalOrderId,
            refundAmount: amount,
            refundReason: reason,
          });
        } else if (steppersLifeOrderId) {
          // Direct order update would require markOrderRefunded by ID
          console.warn(`[PayPal Refund] [${requestId}] Order ID provided without paypalOrderId`);
        }
      } catch (convexError: unknown) {
        console.error("[PayPal Refund] Failed to update order in Convex:", getErrorMessage(convexError));
        // Don't fail the response - refund was processed successfully
      }
    }
    return NextResponse.json({
      success: true,
      refundId: refundData.id,
      status: refundData.status,
      amount: refundData.amount,
      paypalOrderId,
      captureId,
      requestId,
    });
  } catch (error: unknown) {
    console.error(`[PayPal Refund] [${requestId}] Error:`, getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to process PayPal refund", requestId },
      { status: 500 }
    );
  }
}

/**
 * Get refund status
 * GET /api/paypal/refund?refundId=xxx
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "PayPal is not configured", requestId },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const refundId = searchParams.get("refundId");

    if (!refundId) {
      return NextResponse.json(
        { error: "Refund ID is required", requestId },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const response = await fetchWithRetry(
      `${PAYPAL_API_BASE}/v2/payments/refunds/${refundId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[PayPal Refund] [${requestId}] Failed to get refund status:`, errorData);
      return NextResponse.json(
        { error: "Failed to retrieve refund status", details: errorData, requestId },
        { status: response.status }
      );
    }

    const refundData = await response.json();

    return NextResponse.json({
      refundId: refundData.id,
      status: refundData.status,
      amount: refundData.amount,
      createTime: refundData.create_time,
      updateTime: refundData.update_time,
      requestId,
    });
  } catch (error: unknown) {
    console.error(`[PayPal Refund] [${requestId}] Status check error:`, getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to check refund status", requestId },
      { status: 500 }
    );
  }
}
