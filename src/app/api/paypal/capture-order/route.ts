import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

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
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
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
    console.error("[PayPal] Failed to get access token:", response.status, errorText);
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Capture PayPal Order (complete the payment)
 * POST /api/paypal/capture-order
 */
export async function POST(request: NextRequest) {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "PayPal is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { paypalOrderId, steppersLifeOrderId } = body;

    if (!paypalOrderId) {
      return NextResponse.json(
        { error: "PayPal order ID is required" },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    // Capture the PayPal order with retry logic
    const captureResponse = await fetchWithRetry(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error("[PayPal] Capture order failed:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to capture PayPal payment",
          details: errorData,
          code: "PAYPAL_CAPTURE_FAILED"
        },
        { status: 500 }
      );
    }

    const captureData = await captureResponse.json();

    // If we have a SteppersLife order ID, update it as paid
    if (steppersLifeOrderId && captureData.status === "COMPLETED") {
      try {
        await getConvex().mutation(api.orders.mutations.markOrderPaid, {
          orderId: steppersLifeOrderId as any,
          paymentIntentId: paypalOrderId, // Use PayPal order ID as payment reference
        });

        // Record debt settlement if this payment included a settlement amount
        // Parse custom_id from the purchase unit to get settlement info
        const customIdString = captureData.purchase_units?.[0]?.custom_id;
        if (customIdString) {
          try {
            const customData = JSON.parse(customIdString);
            const settlementAmount = customData.settlementAmount || 0;
            const organizerId = customData.organizerId;
            const eventId = customData.eventId;
            const orderId = customData.orderId || steppersLifeOrderId;

            if (settlementAmount > 0 && organizerId) {
              await getConvex().mutation(api.platformDebt.mutations.recordSettlement, {
                organizerId,
                orderId,
                eventId,
                settlementAmountCents: settlementAmount,
              });
            }
          } catch (parseError) {
            console.warn("[PayPal] Failed to parse custom_id for settlement:", parseError);
          }
        }
      } catch (convexError: any) {
        console.error("[PayPal] Failed to update order in Convex:", convexError);
        // Don't fail the response - payment was captured successfully
      }
    }

    return NextResponse.json({
      status: captureData.status,
      paypalOrderId: captureData.id,
      captureId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
    });
  } catch (error: any) {
    console.error("[PayPal] Capture order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to capture PayPal payment" },
      { status: 500 }
    );
  }
}
