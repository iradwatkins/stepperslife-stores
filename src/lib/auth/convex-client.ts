/**
 * Shared ConvexHttpClient singleton
 *
 * This ensures we reuse a single client instance across all API routes
 * instead of creating new instances for each request.
 *
 * Benefits:
 * - Reduces memory overhead
 * - Reuses connection pooling
 * - Ensures consistent configuration
 *
 * Note: Uses lazy initialization to avoid build-time errors when
 * environment variables aren't available during static analysis.
 */

import { ConvexHttpClient } from "convex/browser";

let _convexClient: ConvexHttpClient | null = null;

/**
 * Get the shared Convex HTTP client instance (lazy initialization)
 * Use this in API routes instead of creating new instances
 */
function getConvexClient(): ConvexHttpClient {
  if (!_convexClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is required");
    }
    _convexClient = new ConvexHttpClient(url);
  }
  return _convexClient;
}

/**
 * Shared Convex HTTP client instance (proxied for lazy initialization)
 * Use this in API routes instead of creating new instances
 */
export const convexClient = new Proxy({} as ConvexHttpClient, {
  get(_target, prop) {
    const client = getConvexClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
