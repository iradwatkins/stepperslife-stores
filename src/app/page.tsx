import { Suspense } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ProductsSection } from "@/components/homepage/ProductsSection";
import { ShoppingBag, Store, ArrowRight } from "lucide-react";
import Link from "next/link";

// Initialize Convex client for server-side data fetching
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexHttpClient(convexUrl);

// Force dynamic rendering - always fetch fresh data (no static caching)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper function to fetch with timeout
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
    console.error("[StoresHomePage] Query error:", error);
    return fallback;
  }
}

// Server Component - Stores/Marketplace Homepage
export default async function HomePage() {
  const products = await fetchWithTimeout(
    convex.query(api.products.queries.getActiveProducts),
    10000,
    []
  );

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                <Store className="w-5 h-5" />
                <span className="font-medium">SteppersLife Marketplace</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Shop from Local Vendors
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Discover unique products from our community of vendors. Support small businesses and find exclusive stepping merchandise.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Browse Products
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/marketplace/vendors"
                  className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
                >
                  <Store className="w-5 h-5" />
                  View Vendors
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <Suspense fallback={<SectionSkeleton title="Featured Products" />}>
          <ProductsSection products={products} />
        </Suspense>

        {/* CTA Section */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Want to Sell Your Products?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our marketplace and reach thousands of customers. Easy setup, low fees, and a community that supports small businesses.
            </p>
            <Link
              href="/vendor/apply"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Become a Vendor
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}

// Loading skeleton for sections
function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </section>
  );
}
