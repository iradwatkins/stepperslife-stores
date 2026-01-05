import { Suspense } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { HeroSection } from "@/components/home/HeroSection";
import { EventsGrid } from "@/components/home/EventsGrid";
import { RestaurantsShowcase } from "@/components/home/RestaurantsShowcase";
import { ClassesSpotlight } from "@/components/home/ClassesSpotlight";
import { ProductsSection } from "@/components/homepage/ProductsSection";
import { TodaysEventsCard } from "@/components/home/TodaysEventsCard";

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
    console.error("[HomePage] Query error:", error);
    return fallback;
  }
}

// Server Component - Unified Homepage for stepperslife.com
export default async function HomePage() {
  // Fetch data from all modules in parallel
  const [events, products] = await Promise.all([
    fetchWithTimeout(
      convex.query(api.public.queries.getPublishedEvents, { limit: 100 }),
      10000,
      []
    ),
    fetchWithTimeout(
      convex.query(api.products.queries.getActiveProducts),
      10000,
      []
    ),
  ]);

  // Remove duplicate events
  const uniqueEvents = events.filter(
    (event, index, self) => index === self.findIndex((e) => e._id === event._id)
  );

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background">
        {/* Hero Section - Main Landing */}
        <HeroSection />

        {/* Staff/Organizer Quick Access - Today's Events to Scan */}
        <div className="container mx-auto px-4 pt-8">
          <TodaysEventsCard />
        </div>

        {/* 1. Events Section - /events */}
        <Suspense fallback={<SectionSkeleton title="Upcoming Events" />}>
          <EventsGrid events={uniqueEvents as any} />
        </Suspense>

        {/* 2. Classes Section - /classes */}
        <Suspense fallback={<SectionSkeleton title="Classes" />}>
          <ClassesSpotlight />
        </Suspense>

        {/* 3. Marketplace/Products Section - /marketplace */}
        <Suspense fallback={<SectionSkeleton title="Marketplace" />}>
          <ProductsSection products={products} />
        </Suspense>

        {/* 4. Restaurants Section - /restaurants */}
        <Suspense fallback={<SectionSkeleton title="Restaurants" />}>
          <RestaurantsShowcase />
        </Suspense>
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
