import { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import MarketplaceClient from "./MarketplaceClient";

// Force dynamic rendering - always fetch fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Marketplace | SteppersLife",
  description:
    "Shop exclusive merchandise, apparel, and accessories from the Chicago Steppin community. Support local vendors.",
  openGraph: {
    title: "Marketplace | SteppersLife",
    description: "Shop exclusive merchandise, apparel, and accessories from the Chicago Steppin community",
    type: "website",
  },
};

// Server-side data fetching with timeout
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  fallback: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("Query timeout")), timeoutMs)
  );

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.error("[MarketplacePage] Query error:", error);
    return fallback;
  }
}

export default async function MarketplacePage() {
  // Initialize Convex HTTP client for server-side data fetching
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  const convex = new ConvexHttpClient(convexUrl);

  // Fetch initial products data
  const initialProducts = await fetchWithTimeout(
    convex.query(api.products.queries.getActiveProducts, {}),
    10000,
    []
  );

  return <MarketplaceClient initialProducts={initialProducts} />;
}
