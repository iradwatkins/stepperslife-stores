"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Store, MapPin, Package, ArrowRight, Search, AlertCircle } from "lucide-react";
import Link from "next/link";
import { VendorTierBadge } from "@/components/marketplace/VendorTierBadge";
import { useState, useEffect } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";

export default function VendorsPage() {
  const vendors = useQuery(api.vendors.getApprovedVendors, {});
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout fallback - after 10 seconds, show error state
  const isLoading = vendors === undefined;

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Filter vendors by search
  const filteredVendors = vendors?.filter((vendor) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      vendor.storeName.toLowerCase().includes(query) ||
      (vendor.description?.toLowerCase().includes(query) ?? false) ||
      (vendor.city?.toLowerCase().includes(query) ?? false) ||
      (vendor.state?.toLowerCase().includes(query) ?? false)
    );
  });

  // Show timeout error state
  if (loadingTimeout && isLoading) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Connection Issue
              </h3>
              <p className="text-muted-foreground mb-4">
                Unable to load vendors. Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (!vendors) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading vendors...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <MarketplaceSubNav />
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground dark:text-white">Vendor Stores</h1>
            <p className="text-muted-foreground mt-2">
              Browse products from our verified vendors and sellers
            </p>
          </div>

          {/* Search */}
          <div className="bg-card rounded-xl border border-border p-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search vendors by name, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          {filteredVendors && filteredVendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => (
                <Link
                  key={vendor._id}
                  href={`/marketplace/vendors/${vendor.slug}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-sky-300 dark:hover:border-primary/90 transition-all group"
                >
                  {/* Vendor Header/Logo */}
                  <div className="h-32 bg-gradient-to-br from-primary to-sky-800 relative">
                    {vendor.logo ? (
                      <img
                        src={vendor.logo}
                        alt={vendor.storeName}
                        className="absolute bottom-0 left-4 translate-y-1/2 w-20 h-20 rounded-xl border-4 border-card object-cover shadow-lg"
                      />
                    ) : (
                      <div className="absolute bottom-0 left-4 translate-y-1/2 w-20 h-20 rounded-xl border-4 border-card bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shadow-lg">
                        <Store className="w-10 h-10 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Vendor Info */}
                  <div className="pt-14 p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {vendor.storeName}
                      </h3>
                      <VendorTierBadge tier={vendor.tier || "BASIC"} size="sm" />
                    </div>

                    {(vendor.city || vendor.state) && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}

                    {vendor.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {vendor.description}
                      </p>
                    )}

                    {/* Categories */}
                    {vendor.categories && vendor.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {vendor.categories.slice(0, 3).map((category) => (
                          <span
                            key={category}
                            className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-primary/90 dark:text-sky-300 text-xs rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                        {vendor.categories.length > 3 && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                            +{vendor.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats & CTA */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>{vendor.productCount || 0} products</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-primary dark:text-sky-400 font-medium group-hover:gap-2 transition-all">
                        <span>Visit Store</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {searchQuery ? "No vendors found" : "No vendors yet"}
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "Try adjusting your search query to find more vendors."
                  : "Check back soon as more vendors join our marketplace."}
              </p>
            </div>
          )}

          {/* Become a Vendor CTA */}
          <div className="bg-gradient-to-r from-primary to-sky-800 rounded-xl p-8 mt-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="text-white">
                <h3 className="text-xl font-bold mb-2">Want to sell on SteppersLife?</h3>
                <p className="text-sky-100">
                  Join our marketplace and reach thousands of stepping enthusiasts.
                </p>
              </div>
              <Link
                href="/vendor/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-lg font-bold hover:bg-sky-50 transition-colors whitespace-nowrap"
              >
                <Store className="w-5 h-5" />
                Apply to Sell
              </Link>
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
